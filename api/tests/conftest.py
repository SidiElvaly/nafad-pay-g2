"""
Pytest fixtures.

We use a real Postgres connection (provided via TEST_DATABASE_URL env var
or the default below). The schema is dropped and recreated for each test
to keep tests isolated.

Run locally with:
    docker run -d --name pgtest -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16
    export TEST_DATABASE_URL=postgresql+asyncpg://postgres:test@localhost:5433/postgres
    pytest
"""
from __future__ import annotations

import os
from collections.abc import AsyncIterator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import get_db
from app.main import app
from app.models import Base

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:test@localhost:5433/postgres",
)


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_engine) -> AsyncIterator[AsyncClient]:
    TestSession = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db():
        async with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def make_tx_body(amount: str = "5000.00", wilaya_id: int = 1, **overrides) -> dict:
    """Helper: a valid POST /transactions body."""
    body = {
        "transaction_type": "TRF",
        "amount": amount,
        "fee": "10.00",
        "currency": "MRU",
        "source_user_id": "USR-12345",
        "source_user_name": "Mohamed Ould Ahmed",
        "destination_user_id": "USR-67890",
        "destination_user_name": "Aminetou Mint Sidi",
        "wilaya_id": wilaya_id,
        "wilaya_name": "Nouakchott-Nord",
        "channel": "MOBILE_APP",
        "device_type": "ANDROID",
    }
    body.update(overrides)
    return body
