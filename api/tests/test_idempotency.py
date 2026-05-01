"""
Idempotency tests — the most important behaviour in the API.

These tests directly correspond to the investigation question on idempotency
in docs/investigation-answers.md. The 100-parallel test proves the
IntegrityError recovery path works.
"""
from __future__ import annotations

import asyncio

import pytest

from .conftest import make_tx_body


@pytest.mark.asyncio
async def test_same_key_same_body_returns_cached_response(client):
    """Replay with same key + same body returns the original row, no duplicate insert."""
    body = make_tx_body()
    headers = {"Idempotency-Key": "test-key-001"}

    r1 = await client.post("/transactions", json=body, headers=headers)
    r2 = await client.post("/transactions", json=body, headers=headers)

    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] == r2.json()["id"]
    assert r1.json()["reference"] == r2.json()["reference"]

    # Verify only ONE row was inserted
    listing = await client.get("/transactions")
    assert listing.json()["total"] == 1


@pytest.mark.asyncio
async def test_same_key_different_body_returns_422(client):
    """Replay with same key but different body is rejected as a misuse."""
    body1 = make_tx_body(amount="5000.00")
    body2 = make_tx_body(amount="9999.00")
    headers = {"Idempotency-Key": "test-key-002"}

    r1 = await client.post("/transactions", json=body1, headers=headers)
    r2 = await client.post("/transactions", json=body2, headers=headers)

    assert r1.status_code == 201
    assert r2.status_code == 422
    assert "different" in r2.json()["detail"].lower()

    # Only the first body's row should exist
    listing = await client.get("/transactions")
    assert listing.json()["total"] == 1


@pytest.mark.asyncio
async def test_missing_idempotency_key_returns_422(client):
    """The Idempotency-Key header is required."""
    body = make_tx_body()
    r = await client.post("/transactions", json=body)
    # FastAPI returns 422 for missing required header
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_100_parallel_requests_same_key_one_row(client):
    """
    Hammer the endpoint with 100 concurrent requests using the same key.
    The PRIMARY KEY constraint on idempotency_keys must guarantee:
        - Exactly one row inserted in transactions.
        - All 100 responses identical (same id, same reference).
    """
    body = make_tx_body()
    headers = {"Idempotency-Key": "test-key-parallel"}

    async def call():
        return await client.post("/transactions", json=body, headers=headers)

    results = await asyncio.gather(*[call() for _ in range(100)])

    # All succeed (201) — first one inserts, others either replay or recover.
    statuses = [r.status_code for r in results]
    assert all(s == 201 for s in statuses), f"Got non-201 responses: {set(statuses)}"

    # All responses point to the same row.
    ids = {r.json()["id"] for r in results}
    refs = {r.json()["reference"] for r in results}
    assert len(ids) == 1, f"Expected 1 unique id, got {len(ids)}: {ids}"
    assert len(refs) == 1

    # And the database has exactly one row.
    listing = await client.get("/transactions")
    assert listing.json()["total"] == 1


@pytest.mark.asyncio
async def test_different_keys_create_separate_rows(client):
    """Two distinct keys produce two distinct rows."""
    body = make_tx_body()
    r1 = await client.post("/transactions", json=body, headers={"Idempotency-Key": "key-a"})
    r2 = await client.post("/transactions", json=body, headers={"Idempotency-Key": "key-b"})

    assert r1.status_code == 201 and r2.status_code == 201
    assert r1.json()["id"] != r2.json()["id"]

    listing = await client.get("/transactions")
    assert listing.json()["total"] == 2
