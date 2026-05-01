# EDA — Numbers Cheatsheet

Quick reference card. Source: `eda/analysis.ipynb` and `eda/analysis.md` over
the full 100 000-row historical dataset (2024-01-01 → 2024-12-31, seed 42).

## Throughput

| Metric | Value |
|---|---|
| Total transactions | 100 000 |
| Period | 365 days |
| Average rate | ~3.2 tx/s |
| Peak rate (09:00 UTC) | ~8 tx/s |

## Latency (`processing_latency_ms`)

| Percentile | Value |
|---|---|
| p50 | 233 ms |
| p95 | 598 ms |
| p99 | 7 513 ms |
| mean | 498 ms |
| std | 1 630 ms (heavy right tail) |

Distribution: log-normal, μ ≈ 5.462, σ ≈ 0.974.

## Reliability

| Metric | Value |
|---|---|
| SUCCESS | 67 287 (67.29 %) |
| FAILED | 32 713 (32.71 %) |
| Timeouts overall | 404 (0.40 %) |
| Timeouts on NKC | 404 (100 % of timeouts) |
| Timeouts on NDB | 0 |

Failure reasons: INSUFFICIENT_BALANCE, TIMEOUT, INVALID_DESTINATION,
DAILY_LIMIT_EXCEEDED, DUPLICATE_TRANSACTION, MERCHANT_OFFLINE,
NETWORK_ERROR, AUTHENTICATION_FAILED.

## Node load

| Node | Datacenter | Transactions | Share |
|---|---|---:|---:|
| NKC-NODE-2 | DC-NKC-PRIMARY   | 21 087 | 21.09 % |
| NKC-NODE-1 | DC-NKC-PRIMARY   | 20 627 | 20.63 % |
| NKC-NODE-3 | DC-NKC-SECONDARY | 20 289 | 20.29 % |
| NDB-NODE-1 | DC-NDB           | 19 232 | 19.23 % |
| NDB-NODE-2 | DC-NDB           | 18 765 | 18.77 % |

Hottest-vs-coldest gap: **11.6 %** of mean (mildly imbalanced).

Per-datacenter share: NKC 62.0 %, NDB 38.0 % — proportional to node count.

## Queue depth at arrival

| Percentile (overall) | Value |
|---|---|
| p50 | ~50 |
| p95 | ~280 |
| p99 | ~480 |
| Peak hour p95 | 479 (09:00 UTC) |

## Correlation queue_depth × latency

| Metric | Global | Per-node range |
|---|---:|---|
| Pearson  | +0.030 | −0.02 to +0.13 |
| Spearman | +0.443 | +0.42 to +0.47 |

The relationship is monotonic, not linear — Pearson is dominated by the heavy
latency tail and is misleading on its own.

## Capacity targets (used by architecture documents)

| Stage | Target | Headroom over peak |
|---|---|---|
| Early Stage | ≤ 50 QPS  | 6×  |
| At Scale    | > 500 QPS | 62× |
