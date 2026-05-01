"""Pagination and listing tests."""
from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_default_limit_is_50(client):
    await client.post("/simulate/batch?n=120")
    r = await client.get("/transactions")
    body = r.json()
    assert r.status_code == 200
    assert body["limit"] == 50
    assert len(body["items"]) == 50
    assert body["total"] == 120


@pytest.mark.asyncio
async def test_limit_capped_at_100(client):
    await client.post("/simulate/batch?n=150")
    r = await client.get("/transactions?limit=200")
    # FastAPI validates the Query(le=100) and returns 422
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_explicit_limit_100(client):
    await client.post("/simulate/batch?n=120")
    r = await client.get("/transactions?limit=100")
    assert r.status_code == 200
    assert len(r.json()["items"]) == 100


@pytest.mark.asyncio
async def test_offset_skips_correctly(client):
    await client.post("/simulate/batch?n=30")
    r1 = await client.get("/transactions?limit=10&offset=0")
    r2 = await client.get("/transactions?limit=10&offset=10")
    ids1 = {item["id"] for item in r1.json()["items"]}
    ids2 = {item["id"] for item in r2.json()["items"]}
    assert ids1.isdisjoint(ids2)
    assert len(ids1) == 10
    assert len(ids2) == 10


@pytest.mark.asyncio
async def test_offset_past_total_returns_empty(client):
    await client.post("/simulate/batch?n=5")
    r = await client.get("/transactions?limit=10&offset=100")
    assert r.status_code == 200
    assert r.json()["items"] == []
    assert r.json()["total"] == 5


@pytest.mark.asyncio
async def test_negative_offset_rejected(client):
    r = await client.get("/transactions?offset=-1")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_zero_limit_rejected(client):
    r = await client.get("/transactions?limit=0")
    assert r.status_code == 422
