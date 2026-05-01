"""
The 4 mandatory endpoints for NAFAD-PAY G2.

POST   /transactions        — create one transaction with full idempotency
GET    /transactions        — paginated list, max 100 per page
GET    /stats               — aggregate stats (today's volume, success rate, tx/s)
POST   /simulate/batch?n=N  — bulk-insert N synthetic transactions
"""
from __future__ import annotations

import hashlib
import json
import random
from datetime import date, datetime
from time import perf_counter

import numpy as np
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from . import simulator
from .db import get_db
from .models import IdempotencyKey, Transaction
from .schemas import (
    BatchResult,
    StatsOut,
    TxIn,
    TxListOut,
    TxOut,
)

router = APIRouter(tags=["transactions"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _hash_body(body: dict) -> str:
    """Stable SHA256 hex digest of the request body.

    The hash is over a canonical JSON serialisation (sorted keys, default=str)
    so two semantically identical bodies produce the same hash regardless of
    field order or Decimal/str representation.
    """
    canonical = json.dumps(body, sort_keys=True, default=str, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _route_to_node(wilaya_id: int) -> tuple[str, str]:
    """Pick (node_id, datacenter) based on wilaya — wilayas 1-3 are NKC region,
    4 is Nouadhibou, others spread across both."""
    if wilaya_id in (1, 2, 3):
        node = random.choice(["NKC-NODE-1", "NKC-NODE-2", "NKC-NODE-3"])
    elif wilaya_id == 4:
        node = random.choice(["NDB-NODE-1", "NDB-NODE-2"])
    else:
        node = random.choice(list(simulator.NODE_FREQS.keys()))
    return node, simulator.NODE_TO_DC[node]


# ---------------------------------------------------------------------------
# POST /transactions  — the most important endpoint
# ---------------------------------------------------------------------------


@router.post(
    "/transactions",
    response_model=TxOut,
    status_code=201,
    responses={
        400: {"description": "Idempotency-Key header missing"},
        422: {"description": "Idempotency-Key reused with a different body"},
    },
)
async def create_transaction(
    body: TxIn,
    idempotency_key: str = Header(
        ...,
        alias="Idempotency-Key",
        description="Unique key (UUID recommended) — required for safe retries",
    ),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Create a transaction with full idempotency protection.

    Flow:
        1. Compute SHA256 of canonical request body.
        2. Look up the Idempotency-Key in idempotency_keys table.
           - Same hash → return cached response (replay).
           - Different hash → 422 (key reused with different body).
        3. Otherwise INSERT transaction + INSERT idempotency row in one tx.
        4. On IntegrityError (concurrent request won the race) → re-read cache.
    """
    body_dict = body.model_dump(mode="json")
    request_hash = _hash_body(body_dict)

    # ---- Step 1: cache lookup ---------------------------------------------
    existing = await db.scalar(
        select(IdempotencyKey).where(IdempotencyKey.key == idempotency_key)
    )
    if existing is not None:
        if existing.request_hash != request_hash:
            raise HTTPException(
                status_code=422,
                detail="Idempotency-Key reused with a different request body",
            )
        return existing.response_payload  # cached replay

    # ---- Step 2: build the new transaction --------------------------------
    node_id, datacenter = _route_to_node(body.wilaya_id)
    is_success = random.random() < simulator.STATUS_SUCCESS_RATE
    status = "SUCCESS" if is_success else "FAILED"
    failure_reason = None if is_success else random.choice(simulator.FAILURE_REASONS)

    tx = Transaction(
        reference=simulator._generate_reference(),
        transaction_type=body.transaction_type,
        transaction_type_label=simulator.TX_TYPE_LABELS.get(body.transaction_type),
        amount=body.amount,
        fee=body.fee,
        total_amount=body.amount + body.fee,
        currency=body.currency,
        source_user_id=body.source_user_id,
        source_user_name=body.source_user_name,
        destination_user_id=body.destination_user_id,
        destination_user_name=body.destination_user_name,
        merchant_id=body.merchant_id,
        merchant_name=body.merchant_name,
        merchant_code=body.merchant_code,
        agency_id=body.agency_id,
        agency_name=body.agency_name,
        wilaya_id=body.wilaya_id,
        wilaya_name=body.wilaya_name or simulator.WILAYA_NAMES.get(body.wilaya_id),
        status=status,
        failure_reason=failure_reason,
        channel=body.channel,
        device_type=body.device_type,
        node_id=node_id,
        datacenter=datacenter,
        processing_latency_ms=max(1, int(np.random.lognormal(
            simulator.LATENCY_MU, simulator.LATENCY_SIGMA))),
        queue_depth_at_arrival=max(0, int(np.random.gamma(2, 30))),
        retry_count=0,
        is_timeout=(failure_reason == "TIMEOUT"),
        routing_key=f"{datacenter.split('-')[1]}-{body.transaction_type}",
        transaction_date=date.today(),
        transaction_time=datetime.now().time().replace(microsecond=0),
    )

    # ---- Step 3: insert tx + idempotency row in one DB transaction --------
    try:
        db.add(tx)
        await db.flush()  # populates tx.id and tx.created_at without commit

        response_payload = json.loads(
            TxOut.model_validate(tx).model_dump_json()
        )

        db.add(IdempotencyKey(
            key=idempotency_key,
            request_hash=request_hash,
            response_payload=response_payload,
        ))
        await db.commit()
        return response_payload

    except IntegrityError:
        # ---- Step 4: a concurrent request won the race on idempotency_keys.
        # Roll back our partial work and read back the cached response.
        await db.rollback()
        winner = await db.scalar(
            select(IdempotencyKey).where(IdempotencyKey.key == idempotency_key)
        )
        if winner is None:
            # Genuinely a different IntegrityError (e.g. reference collision) — retry isn't safe.
            raise HTTPException(status_code=500, detail="Database integrity error")
        return winner.response_payload


# ---------------------------------------------------------------------------
# GET /transactions
# ---------------------------------------------------------------------------


@router.get("/transactions", response_model=TxListOut)
async def list_transactions(
    limit: int = Query(default=50, ge=1, le=100, description="Max 100"),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> TxListOut:
    """Return the most recent transactions, ordered by date+time desc."""
    total = await db.scalar(select(func.count(Transaction.id)))

    result = await db.execute(
        select(Transaction)
        .order_by(
            Transaction.transaction_date.desc(),
            Transaction.transaction_time.desc(),
            Transaction.id.desc(),
        )
        .limit(limit)
        .offset(offset)
    )
    items = result.scalars().all()

    return TxListOut(
        items=[TxOut.model_validate(t) for t in items],
        total=int(total or 0),
        limit=limit,
        offset=offset,
    )


# ---------------------------------------------------------------------------
# GET /stats
# ---------------------------------------------------------------------------


@router.get("/stats", response_model=StatsOut)
async def stats(db: AsyncSession = Depends(get_db)) -> StatsOut:
    """One aggregate query for today's volume, success rate, and tx/s."""
    sql = text("""
        SELECT
            COUNT(*) FILTER (WHERE transaction_date = CURRENT_DATE)
                AS today_volume,
            CAST(AVG(CASE WHEN status = 'SUCCESS' THEN 1.0 ELSE 0.0 END)
                 AS FLOAT) AS success_rate,
            CAST(
                (COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '60 seconds'))::float / 60
                AS FLOAT) AS tx_per_second,
            COUNT(*) AS total_count
        FROM transactions
    """)
    row = (await db.execute(sql)).one()
    return StatsOut(
        today_volume=row.today_volume or 0,
        success_rate=float(row.success_rate or 0),
        tx_per_second=float(row.tx_per_second or 0),
        total_count=row.total_count or 0,
    )


# ---------------------------------------------------------------------------
# POST /simulate/batch
# ---------------------------------------------------------------------------


@router.post("/simulate/batch", response_model=BatchResult)
async def simulate_batch(
    n: int = Query(default=100, ge=1, le=10000, description="1..10000"),
    db: AsyncSession = Depends(get_db),
) -> BatchResult:
    """Bulk-insert N synthetic transactions in chunks of 500."""
    t0 = perf_counter()
    rows = simulator.generate(n)

    CHUNK = 500
    for i in range(0, len(rows), CHUNK):
        chunk = rows[i:i + CHUNK]
        await db.execute(Transaction.__table__.insert(), chunk)
    await db.commit()

    duration_ms = int((perf_counter() - t0) * 1000)
    return BatchResult(generated=n, duration_ms=duration_ms)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@router.get("/health", include_in_schema=False)
async def health() -> dict:
    return {"status": "ok"}
