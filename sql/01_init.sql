-- =============================================================================
-- NAFAD-PAY — Database initialization
-- Owner: M3 — runs automatically on first Postgres boot via
--             /docker-entrypoint-initdb.d
--
-- The schema MUST match api/app/models.py and the 33 columns of
-- data/historical_transactions.csv exactly. Do not change one without the
-- other two.
-- =============================================================================

DROP TABLE IF EXISTS idempotency_keys;
DROP TABLE IF EXISTS transactions;

-- ============================================================================
-- transactions: 33 columns matching historical_transactions.csv
-- ============================================================================
CREATE TABLE transactions (
    id                      BIGSERIAL PRIMARY KEY,
    reference               VARCHAR(32) UNIQUE NOT NULL,
    transaction_type        VARCHAR(8)  NOT NULL,
    transaction_type_label  VARCHAR(64),
    amount                  NUMERIC(15, 2) NOT NULL,
    fee                     NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount            NUMERIC(15, 2) NOT NULL,
    currency                VARCHAR(3)  NOT NULL DEFAULT 'MRU',

    source_user_id          VARCHAR(32),
    source_user_name        VARCHAR(128),
    destination_user_id     VARCHAR(32),
    destination_user_name   VARCHAR(128),

    merchant_id             VARCHAR(32),
    merchant_name           VARCHAR(128),
    merchant_code           VARCHAR(16),

    agency_id               VARCHAR(32),
    agency_name             VARCHAR(128),

    wilaya_id               INTEGER NOT NULL,
    wilaya_name             VARCHAR(64),

    status                  VARCHAR(16) NOT NULL,
    failure_reason          VARCHAR(64),
    channel                 VARCHAR(16),
    device_type             VARCHAR(16),

    node_id                 VARCHAR(16) NOT NULL,
    datacenter              VARCHAR(32) NOT NULL,

    processing_latency_ms   INTEGER NOT NULL,
    queue_depth_at_arrival  INTEGER NOT NULL,
    retry_count             INTEGER NOT NULL DEFAULT 0,
    is_timeout              BOOLEAN NOT NULL DEFAULT FALSE,
    routing_key             VARCHAR(64),

    transaction_date        DATE NOT NULL,
    transaction_time        TIME NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tx_date       ON transactions (transaction_date DESC, transaction_time DESC);
CREATE INDEX idx_tx_node       ON transactions (node_id);
CREATE INDEX idx_tx_status     ON transactions (status);
CREATE INDEX idx_tx_created_at ON transactions (created_at DESC);

-- ============================================================================
-- idempotency_keys: dedupe table for POST /transactions
-- The PRIMARY KEY constraint is the synchronization primitive for concurrent
-- requests with the same key — only one INSERT wins, the others get
-- IntegrityError and re-read the cached response.
-- ============================================================================
CREATE TABLE idempotency_keys (
    key               VARCHAR(128) PRIMARY KEY,
    request_hash      VARCHAR(64)  NOT NULL,   -- SHA256 hex of canonical body
    response_payload  JSONB        NOT NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_idempotency_created ON idempotency_keys (created_at);

-- The 100 k-row seed lives in `02_seed.sh` (skipped automatically if the
-- 24 MB historical_transactions.csv is not mounted — e.g. in CI).
