#!/bin/sh
# Optional seed step: load 100 k historical transactions from the mounted CSV.
# Skipped silently when the file is absent (CI, fresh checkouts without the
# 24 MB CSV downloaded). Runs after 01_init.sql via docker-entrypoint-initdb.d.
set -eu

CSV=/data/historical_transactions.csv

if [ ! -s "$CSV" ]; then
  echo "[nafad-seed] $CSV is missing or empty — starting with an empty database."
  exit 0
fi

ROWS=$(wc -l < "$CSV")
echo "[nafad-seed] Seeding $((ROWS - 1)) rows from $CSV …"

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=on <<SQL
COPY transactions (
    id, reference, transaction_type, transaction_type_label,
    amount, fee, total_amount, currency,
    source_user_id, source_user_name, destination_user_id, destination_user_name,
    merchant_id, merchant_name, merchant_code,
    agency_id, agency_name,
    wilaya_id, wilaya_name,
    status, failure_reason, channel, device_type,
    node_id, datacenter,
    processing_latency_ms, queue_depth_at_arrival, retry_count, is_timeout, routing_key,
    transaction_date, transaction_time, created_at
)
FROM '$CSV'
WITH (FORMAT csv, HEADER true, NULL '');

-- Reset the sequence past the seeded ids so new INSERTs don't collide.
SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));
SQL

echo "[nafad-seed] Done."
