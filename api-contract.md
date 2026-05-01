# API Contract — NAFAD-PAY G2

**Status:** v1.0 · final.

This is the single source of truth for the JSON shape of all 4 endpoints. The
backend implements exactly this. The frontend calls exactly this. Any drift
breaks the integration.

## Conventions

- Base URL — dev: `http://localhost:8000`. Prod: deployed CloudFront/ALB URL.
- Timestamps are **ISO 8601 strings, UTC** (e.g. `"2025-04-28T14:35:22.512Z"`).
- Monetary fields (`amount`, `fee`, `total_amount`) are **decimal strings**, not JS
  numbers (e.g. `"5000.00"`). JavaScript `Number` can't represent money exactly.
- All error responses share the shape `{"detail": string, "code": string}`.
- `Idempotency-Key` is required on `POST /transactions`. Recommended format: UUIDv4.

---

## 1. `POST /transactions` — Create a transaction

Idempotent. Same `Idempotency-Key` + same body returns the original response.

### Request

```http
POST /transactions HTTP/1.1
Content-Type: application/json
Idempotency-Key: 7c3b8e2a-4f1d-4b6a-9e0c-1a2b3c4d5e6f
```

```json
{
  "transaction_type": "TRF",
  "amount": "5000.00",
  "fee": "10.00",
  "currency": "MRU",
  "source_user_id": "USR-12345",
  "source_user_name": "Mohamed Ould Ahmed",
  "destination_user_id": "USR-67890",
  "destination_user_name": "Aminetou Mint Sidi",
  "wilaya_id": 1,
  "wilaya_name": "Nouakchott-Nord",
  "channel": "MOBILE_APP",
  "device_type": "ANDROID"
}
```

### Response 201 — created

```json
{
  "id": 100001,
  "reference": "TX20250428ABC123",
  "transaction_type": "TRF",
  "transaction_type_label": "Transfert",
  "amount": "5000.00",
  "fee": "10.00",
  "total_amount": "5010.00",
  "currency": "MRU",
  "source_user_id": "USR-12345",
  "source_user_name": "Mohamed Ould Ahmed",
  "destination_user_id": "USR-67890",
  "destination_user_name": "Aminetou Mint Sidi",
  "wilaya_id": 1,
  "wilaya_name": "Nouakchott-Nord",
  "status": "SUCCESS",
  "failure_reason": null,
  "channel": "MOBILE_APP",
  "device_type": "ANDROID",
  "node_id": "NKC-NODE-2",
  "datacenter": "DC-NKC-PRIMARY",
  "processing_latency_ms": 234,
  "queue_depth_at_arrival": 42,
  "retry_count": 0,
  "is_timeout": false,
  "transaction_date": "2025-04-28",
  "transaction_time": "14:35:22",
  "created_at": "2025-04-28T14:35:22.512Z"
}
```

### Errors

| Status | When | Body |
|---|---|---|
| 422 | `Idempotency-Key` reused with a different body | `{"detail": "Idempotency-Key reused with a different request body"}` |
| 422 | Pydantic validation failure (negative amount, unknown tx_type, invalid wilaya, missing required header) | FastAPI default validation envelope |

### Field reference (TxIn)

| Field | Type | Required | Constraints |
|---|---|:---:|---|
| `transaction_type` | string | yes | one of `DEP WIT TRF PAY BIL AIR SAL REV` |
| `amount` | decimal string | yes | > 0 |
| `fee` | decimal string | no | ≥ 0, default `"0"` |
| `currency` | string | no | default `"MRU"`, max length 3 |
| `source_user_id` | string | no | max length 32 |
| `source_user_name` | string | no | max length 128 |
| `destination_user_id` | string | no | max length 32 |
| `destination_user_name` | string | no | max length 128 |
| `merchant_id` | string | no | max length 32 |
| `merchant_name` | string | no | max length 128 |
| `merchant_code` | string | no | max length 16 |
| `agency_id` | string | no | max length 32 |
| `agency_name` | string | no | max length 128 |
| `wilaya_id` | int | yes | 1..15 |
| `wilaya_name` | string | no | max length 64 |
| `channel` | string | no | default `"MOBILE_APP"` |
| `device_type` | string | no | default `"ANDROID"` |

---

## 2. `GET /transactions` — List recent transactions

Paginated, ordered by `transaction_date DESC, transaction_time DESC, id DESC`.

### Request

```http
GET /transactions?limit=50&offset=0 HTTP/1.1
```

### Query parameters

| Name | Default | Constraints |
|---|---:|---|
| `limit` | 50 | 1 ≤ limit ≤ 100 (any value > 100 → 422) |
| `offset` | 0 | ≥ 0 |

### Response 200

```json
{
  "items": [ /* TxOut objects, same shape as POST response */ ],
  "total": 100527,
  "limit": 50,
  "offset": 0
}
```

---

## 3. `GET /stats` — Aggregate statistics

### Response 200

```json
{
  "today_volume": 1247,
  "success_rate": 0.6731,
  "tx_per_second": 3.14,
  "total_count": 101247
}
```

| Field | Meaning |
|---|---|
| `today_volume` | Count of rows where `transaction_date = CURRENT_DATE` (UTC) |
| `success_rate` | Fraction in `[0, 1]` of all rows where `status = 'SUCCESS'` |
| `tx_per_second` | `total_count / EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))` |
| `total_count` | All rows in the `transactions` table |

This endpoint is also the **ALB health-check** target in production. It must return
200 in under 500 ms — a single SQL aggregate query.

---

## 4. `POST /simulate/batch` — Generate synthetic transactions

Bulk-inserts `n` transactions using empirical distributions extracted from the
historical CSV (see `eda/analysis.md`).

### Request

```http
POST /simulate/batch?n=1000 HTTP/1.1
```

| Name | Default | Constraints |
|---|---:|---|
| `n` | 100 | 1 ≤ n ≤ 10 000 |

### Response 200

```json
{
  "generated": 1000,
  "duration_ms": 482
}
```

Returns 422 if `n` is out of range.

---

## CORS

The API allows the following origins by default (override via `ALLOWED_ORIGINS` env var):

```
http://localhost:3000
http://localhost:5173
```

Methods: `GET`, `POST`, `OPTIONS`. All headers allowed.
