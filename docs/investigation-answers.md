# Investigation Answers — Distributed Systems

> Four canonical distributed-systems pain points the synthetic dataset
> intentionally exposes, with the option space and the chosen approach
> for each.

| # | Question | Decision in NAFAD-PAY |
|---|---|---|
| 1 | How does the API handle concurrent `POST /transactions` from the same user? | DB primary key constraint on `idempotency_keys.key` serializes retries; pessimistic row locks would be added once balances are tracked. |
| 2 | Why do 2 575 historical rows have `completed_at < created_at`? | Per-node clock drift. Mitigated by a single DB-side `NOW()` timestamp — `created_at` is server-defaulted in [`models.py`](../api/app/models.py). |
| 3 | Why is idempotency critical, and how is it implemented? | Header-driven SHA256 dedupe table; the PK constraint is the synchronization primitive. Full walk-through in [`idempotency-implementation.md`](idempotency-implementation.md). |
| 4 | At-scale, how do read replicas avoid showing stale data after a write? | Session pinning to the primary for 5 s after a write (user-facing); accept the lag for dashboard polling. |

---

## 1. Concurrency

> **Q.** How does the API handle 10 simultaneous `POST /transactions` from
> the same source user without double-debiting?

| Approach | How it works | When to use |
|---|---|---|
| **Pessimistic locking** | `BEGIN; SELECT ... FOR UPDATE; UPDATE; COMMIT;` — concurrent requests for the same row wait. | Money operations where correctness > throughput. Contention per user is naturally low (≪ 1 tx/s/user). |
| Optimistic locking | Read row + `version`, `UPDATE WHERE version = $X`. Retry from scratch if 0 rows updated. | High contention with rare conflicts (e.g. inventory). |
| Connection-pool sizing | Independent of locking. Backend uses `pool_size=20, max_overflow=10`. | Always — sized to absorb bursts. |

**Decision.** Pessimistic locking for balance-mutating ops. The current
implementation enforces serialization of *retries* via the `idempotency_keys`
PRIMARY KEY constraint (see Q3); account-level row locks are reserved for the
production version where balances are tracked.

---

## 2. Clock skew

> **Q.** 2 575 historical rows have `completed_at < created_at`.
> Why? How do we fix it?

**Cause.** Each of the 5 nodes (3 NKC + 2 NDB) has its own system clock.
Even with NTP, clocks drift by tens of milliseconds — a request created on
`NDB-NODE-1` (+50 ms ahead) and completed on `NKC-NODE-2` (−20 ms behind)
shows `completed_at < created_at` even when the request actually took 70 ms.
The synthetic dataset reproduces this anomaly intentionally.

| Fix | Guarantee | Cost | Verdict |
|---|---|---|---|
| **Single DB-side timestamp** (`DEFAULT NOW()` on the primary) | Strict total order across all rows | Free | **Used today.** |
| NTP synchronization on every node | ~1 ms drift in good network, ~10 ms under load | Operational | Necessary but insufficient on its own |
| Hybrid Logical Clocks (HLC) | Causal ordering even with disagreeing physical clocks | Implementation cost | Overkill for our centralised Postgres |

**Today.** The `Transaction.created_at` column is `server_default=func.now()`
— client-supplied timestamps are ignored, so all rows are ordered by the
primary's monotonic clock.

---

## 3. Idempotency

> **Q.** Why is idempotency critical for `POST /transactions`?
> How is it implemented? What happens with concurrent same-key requests?

**Why it matters.** A network glitch makes the client retry. Without
protection, the server processes the retry as a new request and the user is
debited twice — **real money lost**.

**Algorithm** (full walk-through in
[`idempotency-implementation.md`](idempotency-implementation.md)):

```
1. Require Idempotency-Key header (400 if missing).
2. Compute SHA256 of canonical (sorted-keys) JSON body → request_hash.
3. Lookup the key in idempotency_keys.
   ├── exists, same hash       → return cached response (replay).
   ├── exists, different hash  → 422 IDEMPOTENCY_MISMATCH.
   └── missing                 → continue.
4. BEGIN; INSERT transactions; INSERT idempotency_keys; COMMIT.
5. On IntegrityError at step 4 (someone beat us): ROLLBACK, re-read step 3,
   return the cached response.
```

**Concurrent same-key requests.** Two parallel requests both pass step 3 (no
row yet) and both attempt step 4. The PRIMARY KEY constraint on
`idempotency_keys.key` admits exactly one INSERT; the loser catches
`IntegrityError`, rolls back its `transactions` insert, re-reads the cached
payload from the winner, and returns it. **The database constraint is the
synchronization primitive — no application-level locks.**

**TTL.** Keys live for 24 h then a daily cron deletes them. Documented in
[`api-contract.md`](../api-contract.md) so clients know the replay window.

---

## 4. Eventual consistency

> **Q.** At-scale, with read replicas, a `GET /transactions` issued 50 ms
> after a `POST` may not see the new row. How do we handle it?

**Problem.** Replicas lag 10–500 ms behind the primary. A user who just made
a payment polls `GET /transactions` and sees the old state — the payment
appears to have vanished.

| Strategy | How it works | Use for |
|---|---|---|
| **Read-your-writes (session pinning)** | After a `POST` for user X, route X's reads to the primary for 5 s via Redis flag `pin:user:{id}` (TTL 5 s). | **User-facing API** — POST then GET works deterministically. |
| Recency-routed reads | `GET /transactions/recent` → primary; `GET /transactions/historical` → replica. | "Did my payment go through?" lookups. |
| Accept the lag | Document it in the contract; rely on natural polling cadence to mask it. | **Dashboard polling** (2 s `TxTable`, 5 s `StatsBanner` — already slower than typical lag). |

**Decision.** Strategy 1 for the user-facing API + Strategy 3 for the
dashboard; Strategy 2 reserved for a future `/transactions/recent` endpoint.

**Today.** The current deployment talks to a single PostgreSQL instance, so
this question is hypothetical until read replicas are added per the
[at-scale architecture](architecture-at-scale.md) migration plan.

---

## References

- Idempotency implementation: [`idempotency-implementation.md`](idempotency-implementation.md)
- Early Stage architecture: [`architecture-early-stage.md`](architecture-early-stage.md)
- At Scale architecture: [`architecture-at-scale.md`](architecture-at-scale.md)
- EDA findings: [`../eda/analysis.md`](../eda/analysis.md)
- Master document: `PROJET_NAFAD_PAY.html` §§ 2.2, 3.3
