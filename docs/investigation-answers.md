# Investigation Answers — Distributed Systems

**Owners:** M4 (sections 1, 2) · M5 (sections 3, 4 + final consolidation) ·
M1 contributes the idempotency draft.

> Four questions from the master document covering the canonical
> distributed-systems pain points the synthetic dataset intentionally exposes.

---

## 1. Concurrency · *Owner: M4*

> **Question**: How does the API handle 10 simultaneous `POST /transactions`
> from the same source user?

### Three approaches

**Pessimistic locking with `SELECT ... FOR UPDATE`.** At the start of the
transaction, the API locks the user's account row. Other concurrent requests
for the same user wait until the lock is released. Simple, correct, used in
M1's implementation.

```sql
BEGIN;
SELECT balance FROM accounts WHERE user_id = $1 FOR UPDATE;
-- ... business logic ...
UPDATE accounts SET balance = $2 WHERE user_id = $1;
COMMIT;
```

**Optimistic locking with a version column.** Each row has a `version INT`.
Read it, do your logic, then `UPDATE ... WHERE version = $X`. If 0 rows are
updated (someone else won), retry from the top.

**Connection-pool sizing.** Independent of locking. SQLAlchemy's default async
pool is 5 + overflow 10. M1's configuration uses `pool_size=20, max_overflow=10`
to handle bursts without queueing requests at the asyncpg layer.

### Recommendation for NAFAD-PAY

**Pessimistic locking** for money operations — correctness over throughput is
the right trade-off for financial transactions. Contention per user account is
naturally low (a single user rarely makes more than 1 tx/second), so the
bottleneck is theoretical. M1's implementation enforces this via the
`idempotency_keys` PRIMARY KEY constraint, which serializes concurrent retries
of the same logical operation; account-level row locks would be added for the
production version where balances are tracked.

See `docs/idempotency-implementation.md` for the relationship between
idempotency and concurrency in M1's code.

---

## 2. Clock skew · *Owner: M4*

> **Question**: 2 575 rows in the broader dataset have `completed_at <
> created_at`. Why? How do we fix it?

### Root cause

Each of the 5 NAFAD-PAY nodes (3 NKC + 2 NDB) has its own system clock.
Even with NTP synchronization, clocks drift by tens of milliseconds. A request
created on `NDB-NODE-1` (clock running +50 ms ahead) and completed on
`NKC-NODE-2` (clock running −20 ms behind) shows `completed_at < created_at`
even though the request actually took 70 ms.

The synthetic dataset reproduces this realistic anomaly intentionally (master
doc section 2.2).

### Three fixes, in order of correctness

**Fix 1 — Single authoritative DB-side timestamp.** The API never accepts
client-supplied `created_at` or `completed_at`. The `transactions` table column
defaults to `DEFAULT NOW()`. PostgreSQL has one clock per primary, so all rows
are ordered consistently. **Recommended for NAFAD-PAY.**

**Fix 2 — NTP synchronization on every node.** Standard ops practice, but NTP
typically holds clocks within ~1 ms in good network conditions and ~10 ms
under load. Necessary but insufficient for ordering guarantees.

**Fix 3 — Hybrid Logical Clocks (HLC).** A `(physical_time, logical_counter)`
pair that gives causal ordering even when physical clocks disagree. Used by
CockroachDB and Spanner. Overkill for NAFAD-PAY's centralized PostgreSQL.

### What M1's API actually does

The `Transaction` model declares `created_at: Mapped[datetime] =
mapped_column(server_default=func.now())`. Client-supplied timestamps are
ignored. This makes Fix 1 the operational reality.

---

## 3. Idempotency · *Owner: M5 (with M1's draft)*

> **Question**: Why is idempotency critical for `POST /transactions`? How is
> it implemented? What happens with concurrent requests using the same key?

### Why it matters

A network glitch causes the client to retry `POST /transactions`. Without
idempotency protection, the server processes the retry as a new request and
debits the user twice. **Real money lost.** The `Idempotency-Key` header (a
client-generated UUID per logical operation) lets the server recognize retries
and return the original response without reprocessing.

### M1's implementation

See `docs/idempotency-implementation.md` for the full algorithm. Summary:

```
1. Read Idempotency-Key from headers (400 if missing).
2. Compute SHA256 of canonical (sorted-keys) JSON body → request_hash.
3. SELECT response_payload, request_hash FROM idempotency_keys WHERE key = $1.
4a. Row exists with same hash    → return cached response_payload.
4b. Row exists with different hash → 422 IDEMPOTENCY_MISMATCH.
4c. Row does not exist          → continue.
5. BEGIN.
6. INSERT INTO transactions (...) RETURNING *.
7. INSERT INTO idempotency_keys (key, request_hash, response_payload, created_at).
8. COMMIT.
9. On IntegrityError at step 7 (concurrent request beat us) → ROLLBACK,
   re-read step 3, return cached payload.
```

### Concurrent requests with the same key

Two parallel requests both pass step 3 (no row yet). Both reach step 7. The
PRIMARY KEY constraint on `idempotency_keys.key` allows only one INSERT through.
The loser catches `IntegrityError`, rolls back its transaction (the
`transactions` row is also rolled back), re-reads the cached response from the
winner, and returns it.

The database's unique constraint is the synchronization primitive. No
application-level locks needed.

### TTL

Idempotency keys are kept for 24 hours, then deleted by a daily cron. Documented
in the API contract so clients know the replay window.

---

## 4. Eventual consistency · *Owner: M5*

> **Question**: At Scale, when read replicas are added, a `GET /transactions`
> issued 50 ms after a `POST` may not see the new row. How do we handle it?

### The problem

Read replicas in `architecture-at-scale.md` lag 10–500 ms behind the primary.
A user who just made a transaction polls `GET /transactions` 50 ms later and
sees the *old* state — their transaction appears to have vanished.

### Three strategies

**Strategy 1 — Read-your-writes via session pinning.** After a `POST` for user
X, route all of X's reads to the primary for the next 5 seconds. Implemented
via a Redis flag `pin:user:{id}` with TTL 5 s. The API checks this flag on
every read. **Recommended for the user-facing API.**

**Strategy 2 — Read-from-primary for recency-critical endpoints.**
`GET /transactions/recent` always hits primary. `GET /transactions/historical?
date_lt=...` hits replica. Trade-off: more load on primary, less benefit from
read replicas. Useful for the "did my payment go through?" use case.

**Strategy 3 — Accept the lag, document it in the API contract.** Suitable
for analytics and dashboard polling where 500 ms staleness is invisible to the
user. The polling cadence (2 s for `TxTable`, 5 s for `StatsBanner`) is
already much higher than typical replica lag, so the staleness is undetectable.

### Recommendation for NAFAD-PAY

Strategy 1 for the user-facing API (`POST /transactions` followed by
`GET /transactions/{id}` works deterministically). Strategy 3 for the demo
dashboard polling. Strategy 2 reserved for a future `GET /transactions/recent`
endpoint serving the user's account view.

This is a hypothetical extension — M1's current implementation talks to a
single PostgreSQL instance, so eventual-consistency issues do not yet apply.
The mitigation is documented here as part of the migration plan in
`architecture-at-scale.md`.

---

## References

- M1's implementation note: `docs/idempotency-implementation.md`
- M4's Early Stage architecture: `docs/architecture-early-stage.md`
- M5's At Scale architecture: `docs/architecture-at-scale.md`
- M3's EDA findings: `eda/analysis.md`
- Master document: `PROJET_NAFAD_PAY.html` sections 2.2, 3.3
