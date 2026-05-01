"""Pydantic v2 schemas for request/response validation."""
from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ---------------------------------------------------------------------------
# POST /transactions
# ---------------------------------------------------------------------------

TX_TYPES = ("DEP", "WIT", "TRF", "PAY", "BIL", "AIR", "SAL", "REV")


class TxIn(BaseModel):
    """What the client sends in POST /transactions."""

    transaction_type: Literal["DEP", "WIT", "TRF", "PAY", "BIL", "AIR", "SAL", "REV"]
    amount: Decimal = Field(..., gt=0, description="Amount in MRU, > 0, decimal as string")
    fee: Decimal = Field(default=Decimal("0"), ge=0)
    currency: str = Field(default="MRU", max_length=3)

    source_user_id: str | None = Field(default=None, max_length=32)
    source_user_name: str | None = Field(default=None, max_length=128)
    destination_user_id: str | None = Field(default=None, max_length=32)
    destination_user_name: str | None = Field(default=None, max_length=128)

    merchant_id: str | None = Field(default=None, max_length=32)
    merchant_name: str | None = Field(default=None, max_length=128)
    merchant_code: str | None = Field(default=None, max_length=16)

    agency_id: str | None = Field(default=None, max_length=32)
    agency_name: str | None = Field(default=None, max_length=128)

    wilaya_id: int = Field(..., ge=1, le=15)
    wilaya_name: str | None = Field(default=None, max_length=64)

    channel: str = Field(default="MOBILE_APP", max_length=16)
    device_type: str = Field(default="ANDROID", max_length=16)

    @field_validator("amount", "fee", mode="before")
    @classmethod
    def _coerce_decimal(cls, v: object) -> object:
        # Accept "100.00" string or 100 int — Pydantic handles Decimal natively
        return v


class TxOut(BaseModel):
    """What the API returns for a single transaction."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    transaction_type: str
    transaction_type_label: str | None = None
    amount: Decimal
    fee: Decimal
    total_amount: Decimal
    currency: str

    source_user_id: str | None
    source_user_name: str | None
    destination_user_id: str | None
    destination_user_name: str | None

    merchant_id: str | None
    merchant_name: str | None

    wilaya_id: int
    wilaya_name: str | None

    status: str
    failure_reason: str | None
    channel: str | None
    device_type: str | None

    node_id: str
    datacenter: str
    processing_latency_ms: int
    queue_depth_at_arrival: int
    retry_count: int
    is_timeout: bool

    transaction_date: date
    transaction_time: time
    created_at: datetime


# ---------------------------------------------------------------------------
# GET /transactions
# ---------------------------------------------------------------------------


class TxListOut(BaseModel):
    items: list[TxOut]
    total: int
    limit: int
    offset: int


# ---------------------------------------------------------------------------
# GET /stats
# ---------------------------------------------------------------------------


class StatsOut(BaseModel):
    today_volume: int = Field(..., description="Number of transactions today (UTC)")
    success_rate: float = Field(..., ge=0, le=1, description="0.0 to 1.0")
    tx_per_second: float = Field(..., ge=0)
    total_count: int = Field(..., description="Total rows in the table")


# ---------------------------------------------------------------------------
# POST /simulate/batch
# ---------------------------------------------------------------------------


class BatchResult(BaseModel):
    generated: int
    duration_ms: int


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class ApiError(BaseModel):
    detail: str
    code: str
