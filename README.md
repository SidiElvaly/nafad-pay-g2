# NAFAD-PAY — Group 2 (Platform & API)

> SupNum NAFAD-PAY project — fictional Mauritanian mobile-payment system.
> Group 2 owns the public-facing layer: a **FastAPI** backend, a **React + Vite**
> frontend, a **PostgreSQL** database seeded with 100 000 historical
> transactions, and two **AWS** architecture documents (Early Stage MVP +
> At Scale target).

## Quick start

```bash
git clone <repo-url> nafad-pay-g2
cd nafad-pay-g2
cp .env.example .env
docker compose up
```

Then open:
- **Frontend** — http://localhost:3000
- **API docs (Swagger)** — http://localhost:8000/docs
- **Stats** — http://localhost:8000/stats

A clean boot takes about a minute (the seed loader copies 100 k rows into Postgres).

## Why React + Vite (not Next.js)

This is a single-page dashboard with no SEO needs and no per-route data-fetching, so **React + Vite (SPA)** keeps things minimal — one `index.html` served by nginx, all rendering in the browser, no Node runtime in production. Next.js would add SSR/edge complexity we don't use; the same UX would cost an always-on Node container in the deployment topology.

## What this project does

A small but realistic banking-style system. The frontend lets you trigger batch
generation of synthetic transactions and see them appear live in a paginated
table. Stats refresh every 5 seconds. Behind the scenes, the API enforces
**SHA256-based idempotency** so retries never duplicate writes — the most
heavily-tested behaviour in the codebase.

```
┌────────────────────────────────────────────────────────────────┐
│  React + Vite + Tailwind  (frontend, served on :3000)          │
│   • BatchForm     POST /simulate/batch?n=N                     │
│   • TxTable       polls GET /transactions every 2 s            │
│   • StatsBanner   polls GET /stats every 5 s                   │
└──────────────────────────────┬─────────────────────────────────┘
                               │ REST/JSON
┌──────────────────────────────▼─────────────────────────────────┐
│  FastAPI + asyncpg + SQLAlchemy 2.0  (api, served on :8000)    │
│   • POST   /transactions       full SHA256 idempotency         │
│   • GET    /transactions       paginated, max 100              │
│   • GET    /stats              one aggregate SQL query         │
│   • POST   /simulate/batch     bulk insert in chunks of 500    │
└──────────────────────────────┬─────────────────────────────────┘
                               │ TCP/5432
┌──────────────────────────────▼─────────────────────────────────┐
│  PostgreSQL 16  (postgres, served on :5432)                    │
│   • transactions       33 cols, 100 k seeded rows              │
│   • idempotency_keys   PK-constraint dedupe, JSONB cache       │
└────────────────────────────────────────────────────────────────┘
```

## Repo structure

```
nafad-pay-g2/
├── docker-compose.yml         wires the 3 services together
├── Makefile                   common commands (up, test, smoke)
├── README.md                  this file
├── .env.example               environment template
├── api-contract.md            locked JSON contract for the 4 endpoints
│
├── api/                       FastAPI backend
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py            FastAPI app + CORS
│   │   ├── routes.py          the 4 endpoints (idempotency core)
│   │   ├── models.py          SQLAlchemy ORM
│   │   ├── schemas.py         Pydantic v2 schemas
│   │   ├── db.py              async engine + session factory
│   │   └── simulator.py       synthetic generator
│   └── tests/
│       ├── test_idempotency.py    100-parallel + replay + 422
│       ├── test_pagination.py
│       └── test_endpoints.py
│
├── frontend/                  React + Vite + Tailwind SPA
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── api.ts
│       ├── types.ts
│       └── components/
│           ├── BatchForm.tsx
│           ├── TxTable.tsx
│           ├── StatsBanner.tsx
│           └── Toast.tsx
│
├── data/                      seed data
│   ├── historical_transactions.csv      100 000 rows (24 MB, see data/README.md)
│   ├── reference_wilayas.csv            15 wilayas + economic weights
│   ├── reference_tx_types.csv           8 transaction types
│   └── reference_categories.csv         merchant categories
│
├── sql/01_init.sql            DDL + indexes + COPY FROM csv
│
├── eda/                       exploratory analysis
│   ├── analysis.ipynb         Jupyter notebook reproducing all figures
│   ├── analysis.md            written report answering the 5 questions
│   ├── requirements.txt       notebook deps
│   └── figures/*.png          rendered charts
│
├── docs/                      architecture documents
│   ├── architecture-early-stage.md       MVP single-AZ on AWS
│   ├── architecture-at-scale.md          > 500 QPS, multi-AZ
│   ├── investigation-answers.md          4 distributed-systems answers
│   ├── idempotency-implementation.md     reference note
│   ├── deployment-notes.md               actual AWS ARNs
│   └── diagrams/                         PNG exports of C4 diagrams
│
├── scripts/bootstrap.sh       one-time setup helper
└── .github/workflows/
    ├── ci.yml                 backend tests + frontend build + compose smoke
    ├── deploy-api.yml         build → ECR → ECS Fargate (OIDC)
    └── deploy-frontend.yml    Vite build → S3 → CloudFront invalidation (OIDC)
```

## Common commands

```bash
make help            # show all commands
make up              # docker compose up -d
make down            # stop, keep data
make reset           # stop + delete all data
make logs            # tail logs
make test            # run pytest (requires Postgres test instance)
make smoke           # full clean-room boot + curl smoke test
```

## Running the backend tests

The tests need a Postgres instance separate from the compose stack:

```bash
docker run -d --name pgtest -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16
export TEST_DATABASE_URL=postgresql+asyncpg://postgres:test@localhost:5433/postgres
cd api
pip install -e ".[dev]"
pytest --cov=app --cov-report=term-missing
```

The most important test is `tests/test_idempotency.py::test_100_parallel_requests_one_row`
— 100 concurrent `POST /transactions` calls with the same `Idempotency-Key` produce
exactly 1 row in the database and 100 identical responses.

## How idempotency works (TL;DR)

`POST /transactions` requires an `Idempotency-Key` header (UUIDv4 recommended).
The server stores the key + a SHA256 of the request body + the response payload
in `idempotency_keys`. On retry:

- Same key + same body → server returns the cached response, no second insert.
- Same key + different body → 422 (`IDEMPOTENCY_MISMATCH`).
- Concurrent requests with the same key → the PRIMARY KEY constraint admits one;
  losers catch `IntegrityError`, roll back, and read the cached response.

Full explanation in [`docs/idempotency-implementation.md`](docs/idempotency-implementation.md).

## Architecture documents

- [Early Stage (MVP)](docs/architecture-early-stage.md) — single-AZ, ~$50/month, 50 QPS ceiling.
- [At Scale](docs/architecture-at-scale.md) — multi-AZ, WAF, Cognito, RDS Proxy, 500 QPS target.
- [Investigation answers](docs/investigation-answers.md) — concurrency, clock skew, idempotency, eventual consistency.

## Deployment

CI (`.github/workflows/ci.yml`) runs on every push: backend tests, frontend
build, full compose smoke. CD (manual or `paths`-triggered) deploys to AWS via
two workflows that assume an OIDC role — no long-lived AWS keys in GitHub.

- [`.github/workflows/deploy-api.yml`](.github/workflows/deploy-api.yml) —
  builds the API Docker image, pushes to ECR, updates the ECS Fargate task
  definition, and waits for service stability.
- [`.github/workflows/deploy-frontend.yml`](.github/workflows/deploy-frontend.yml) —
  runs `npm run build`, syncs `dist/` to the S3 bucket with proper cache
  headers (immutable hashed assets, no-cache `index.html`), and invalidates
  CloudFront.

Required GitHub variables and secrets are listed in
[`docs/deployment-notes.md`](docs/deployment-notes.md). The first run requires
the AWS resources (VPC, ECR repo, ECS cluster + service, S3 bucket, CloudFront
distribution, OIDC role) to already exist in the target account.

## License & credits

Educational project for SupNum. Data is synthetic. Code authored by Group 2.
