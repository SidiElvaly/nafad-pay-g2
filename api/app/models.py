"""SQLAlchemy 2.0 ORM models. Must match sql/01_init.sql exactly."""
from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Integer,
    Numeric,
    String,
    Time,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    transaction_type: Mapped[str] = mapped_column(String(8))
    transaction_type_label: Mapped[str | None] = mapped_column(String(64), nullable=True)

    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    fee: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    currency: Mapped[str] = mapped_column(String(3), default="MRU")

    source_user_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source_user_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    destination_user_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    destination_user_name: Mapped[str | None] = mapped_column(String(128), nullable=True)

    merchant_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    merchant_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    merchant_code: Mapped[str | None] = mapped_column(String(16), nullable=True)

    agency_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    agency_name: Mapped[str | None] = mapped_column(String(128), nullable=True)

    wilaya_id: Mapped[int] = mapped_column(Integer)
    wilaya_name: Mapped[str | None] = mapped_column(String(64), nullable=True)

    status: Mapped[str] = mapped_column(String(16), index=True)
    failure_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    channel: Mapped[str | None] = mapped_column(String(16), nullable=True)
    device_type: Mapped[str | None] = mapped_column(String(16), nullable=True)

    node_id: Mapped[str] = mapped_column(String(16), index=True)
    datacenter: Mapped[str] = mapped_column(String(32))

    processing_latency_ms: Mapped[int] = mapped_column(Integer)
    queue_depth_at_arrival: Mapped[int] = mapped_column(Integer)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    is_timeout: Mapped[bool] = mapped_column(Boolean, default=False)
    routing_key: Mapped[str | None] = mapped_column(String(64), nullable=True)

    transaction_date: Mapped[date] = mapped_column(Date)
    transaction_time: Mapped[time] = mapped_column(Time)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    response_payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
