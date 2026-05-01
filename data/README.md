# `data/` — runtime data

This folder contains:

- `reference_wilayas.csv` — 15 Mauritanian wilayas with economic weights (committed)
- `reference_tx_types.csv` — 8 transaction types DEP/WIT/TRF/PAY/BIL/AIR/SAL/REV (committed)
- `reference_categories.csv` — merchant categories (committed)
- **`historical_transactions.csv`** — 100 000 historical transactions (NOT committed — too big for git)

## Getting `historical_transactions.csv`

The CSV is 24 MB and is excluded from the repo via `.gitignore`. To get it:

1. Download `NAFAD-PAY_G2_SIMULATOR.zip` from the course materials.
2. Extract `G2_SIMULATOR/historical_transactions.csv` into this folder.

Verify with:

```bash
wc -l data/historical_transactions.csv
# Should output: 100001 data/historical_transactions.csv  (100k rows + header)
```

## Why it's not in git

- 24 MB binary-ish file would bloat the repo and slow down every `git clone`.
- It's a fixed input — every team member uses the exact same file.
- For CI / production deployment, fetch it from S3 or course materials at build time.

When the file is in place, `sql/01_init.sql` will automatically `COPY` it into
the `transactions` table on first Postgres boot.
