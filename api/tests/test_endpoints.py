"""Happy paths and validation for all 4 endpoints."""
from __future__ import annotations

import pytest

from .conftest import make_tx_body


@pytest.mark.asyncio
async def test_root_returns_service_info(client):
    r = await client.get("/")
    assert r.status_code == 200
    assert r.json()["service"] == "nafad-pay-api"


@pytest.mark.asyncio
async def test_health_endpoint(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_post_transaction_success(client):
    body = make_tx_body()
    r = await client.post(
        "/transactions",
        json=body,
        headers={"Idempotency-Key": "happy-path-1"},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["id"] > 0
    assert data["reference"].startswith("TX")
    assert data["transaction_type"] == "TRF"
    assert data["status"] in ("SUCCESS", "FAILED")
    assert data["node_id"].startswith(("NKC-", "NDB-"))
    assert data["wilaya_id"] == 1


@pytest.mark.asyncio
async def test_post_transaction_invalid_amount(client):
    body = make_tx_body(amount="-100")
    r = await client.post(
        "/transactions",
        json=body,
        headers={"Idempotency-Key": "bad-amount"},
    )
    assert r.status_code == 422  # Pydantic gt=0 violation


@pytest.mark.asyncio
async def test_post_transaction_invalid_tx_type(client):
    body = make_tx_body()
    body["transaction_type"] = "XXX"
    r = await client.post(
        "/transactions",
        json=body,
        headers={"Idempotency-Key": "bad-type"},
    )
    assert r.status_code == 422  # Literal violation


@pytest.mark.asyncio
async def test_post_transaction_invalid_wilaya(client):
    body = make_tx_body(wilaya_id=99)
    r = await client.post(
        "/transactions",
        json=body,
        headers={"Idempotency-Key": "bad-wilaya"},
    )
    assert r.status_code == 422  # ge=1, le=15


@pytest.mark.asyncio
async def test_simulate_batch_basic(client):
    r = await client.post("/simulate/batch?n=50")
    assert r.status_code == 200
    body = r.json()
    assert body["generated"] == 50
    assert body["duration_ms"] >= 0


@pytest.mark.asyncio
async def test_simulate_batch_n_too_large(client):
    r = await client.post("/simulate/batch?n=20000")
    assert r.status_code == 422  # le=10000


@pytest.mark.asyncio
async def test_simulate_batch_n_zero(client):
    r = await client.post("/simulate/batch?n=0")
    assert r.status_code == 422  # ge=1


@pytest.mark.asyncio
async def test_stats_on_empty_db(client):
    r = await client.get("/stats")
    assert r.status_code == 200
    body = r.json()
    assert body["today_volume"] == 0
    assert body["total_count"] == 0
    assert body["success_rate"] == 0


@pytest.mark.asyncio
async def test_stats_after_batch(client):
    await client.post("/simulate/batch?n=100")
    r = await client.get("/stats")
    body = r.json()
    assert body["total_count"] == 100
    assert body["today_volume"] == 100  # all generated today
    assert 0.5 < body["success_rate"] < 0.85  # approx 67%
    assert body["tx_per_second"] > 0


@pytest.mark.asyncio
async def test_listing_orders_newest_first(client):
    """Items should be ordered newest first by (date desc, time desc, id desc)."""
    await client.post("/simulate/batch?n=10")

    # Now create one fresh transaction with a known reference pattern
    body = make_tx_body()
    r = await client.post(
        "/transactions",
        json=body,
        headers={"Idempotency-Key": "ordering-test"},
    )
    new_id = r.json()["id"]

    listing = await client.get("/transactions?limit=20")
    items = listing.json()["items"]

    # Two assertions: (a) the new tx is in the listing, (b) listing is sorted desc.
    listed_ids = [it["id"] for it in items]
    assert new_id in listed_ids

    # Within the same date, ids should be monotonically non-increasing.
    same_date_items = [
        it for it in items if it["transaction_date"] == items[0]["transaction_date"]
    ]
    times = [
        (it["transaction_time"], it["id"]) for it in same_date_items
    ]
    assert times == sorted(times, reverse=True)
