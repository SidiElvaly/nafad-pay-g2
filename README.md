# NAFAD-PAY — Group 2 (Platform & API)

> SupNum NAFAD-PAY project — fictional Mauritanian mobile-payment system.
> Group 2 owns the public-facing layer: a **FastAPI** backend, a **React + Vite**
> frontend, a **PostgreSQL** database seeded with 100 000 historical
> transactions, and two **AWS** architecture documents (Early Stage MVP +
> At Scale target).

## Live deployment

| Surface | URL |
|---|---|
| Frontend dashboard | **<https://dlblyfqhsm6re.cloudfront.net>** |
| API root | <https://dlblyfqhsm6re.cloudfront.net/api> |
| Swagger UI | <https://dlblyfqhsm6re.cloudfront.net/api/docs> |
| Stats endpoint | <https://dlblyfqhsm6re.cloudfront.net/api/stats> |

Deployed on AWS `eu-west-3` (Paris) by the [CloudFormation
template](infrastructure/cloudformation.yml) and the two GitHub Actions deploy
workflows.

## Quick start (local)

```bash
git clone https://github.com/SidiElvaly/nafad-pay-g2.git
cd nafad-pay-g2
cp .env.example .env
docker compose up
```

Then open:
- **Frontend** — http://localhost:3000
- **API docs (Swagger)** — http://localhost:8000/docs
- **Stats** — http://localhost:8000/stats

A clean boot takes about a minute (the seed loader copies 100 k rows into Postgres).

## What this project does

A small but realistic banking-style system. The frontend lets you trigger batch
generation of synthetic transactions and see them appear live in a paginated
table. Stats refresh every 5 seconds. Behind the scenes, the API enforces
**SHA256-based idempotency** so retries never duplicate writes — the most
heavily-tested behaviour in the codebase.

## Why React + Vite (not Next.js)

This is a single-page dashboard with no SEO needs and no per-route data-fetching, so **React + Vite (SPA)** keeps things minimal — one `index.html` served by nginx, all rendering in the browser, no Node runtime in production. Next.js would add SSR/edge complexity we don't use; the same UX would cost an always-on Node container in the deployment topology.

## Architecture

### Local development (docker-compose)

```mermaid
flowchart LR
    Browser([Browser]) -->|HTTP :3000| Nginx[nginx<br/>frontend SPA]
    Browser -->|HTTP :8000| API[FastAPI<br/>asyncpg]
    Nginx -.fetches static.-> Disk[(Vite dist/)]
    API -->|TCP :5432| PG[(PostgreSQL 16<br/>seeded 100k rows)]

    classDef svc fill:#1e293b,stroke:#3157e0,color:#fff,stroke-width:1.5px;
    class Nginx,API svc;
```

### AWS production

```mermaid
architecture-beta
    group aws(logos:aws)[AWS eu-west-3]

    service browser(internet)[User Browser]
    service cdn(logos:aws-cloudfront)[CloudFront] in aws
    service s3(logos:aws-s3)[S3 frontend bucket] in aws
    service alb(logos:aws-elastic-load-balancing)[ALB] in aws
    service ecs(logos:aws-ecs)[ECS Fargate] in aws
    service ecr(logos:aws-ecr)[ECR] in aws
    service rds(logos:aws-rds)[RDS PostgreSQL] in aws
    service sm(logos:aws-secrets-manager)[Secrets Manager] in aws
    service logs(logos:aws-cloudwatch)[CloudWatch Logs] in aws

    browser:R --> L:cdn
    cdn:T --> B:s3
    cdn:R --> L:alb
    alb:R --> L:ecs
    ecs:R --> L:rds
    ecs:B --> T:sm
    ecs:T --> B:ecr
    ecs:T --> B:logs
```

**Routing (CloudFront has two cache behaviors):**
- `/api/*` → ALB → ECS Fargate (`/api` prefix is preserved by CloudFront and stripped server-side via FastAPI's `root_path="/api"`)
- everything else → S3 frontend bucket (with SPA fallback to `/index.html`)

**Endpoints:**
- `POST /transactions` — full SHA256-based idempotency
- `GET  /transactions` — paginated, max 100
- `GET  /stats` — one aggregate SQL query
- `POST /simulate/batch` — bulk insert in chunks of 500

## AWS deployment

One CloudFormation stack creates the full Early-Stage architecture (VPC, ALB,
ECS cluster, RDS, ECR, Secrets Manager, S3, CloudFront, GitHub OIDC role) in
~15 minutes. See [`infrastructure/README.md`](infrastructure/README.md) for the
exact `aws cloudformation deploy` command and the GitHub variables/secrets
table you need to populate from the stack outputs.

After the stack is up, the two GitHub Actions deploy workflows take over —
they assume the OIDC role (no long-lived AWS keys in GitHub):

- [`.github/workflows/deploy-api.yml`](.github/workflows/deploy-api.yml) —
  builds `api/Dockerfile` → pushes to ECR → renders a new ECS task definition
  with the new image → bumps `desiredCount` from 0 to 1 on the first run →
  waits for service stability.
- [`.github/workflows/deploy-frontend.yml`](.github/workflows/deploy-frontend.yml) —
  `npm ci` → `npm run build` (Vite, with `VITE_API_URL` injected) → `aws s3
  sync dist/` (immutable cache for hashed assets, no-cache for `index.html`)
  → `aws cloudfront create-invalidation`.

Idle cost: **~$50–60 / month**. Tear down with `aws cloudformation delete-stack`
when you're done with the demo.

## Repo structure

```
nafad-pay-g2/
├── docker-compose.yml         wires the 3 services together (local)
├── Makefile                   common commands (up, test, smoke)
├── README.md                  this file
├── .env.example               environment template
├── api-contract.md            locked JSON contract for the 4 endpoints
│
├── api/                       FastAPI backend
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py            FastAPI app + CORS + lifespan (table create-if-missing)
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
│   ├── .env.example           VITE_API_URL template
│   └── src/
│       ├── App.tsx
│       ├── api.ts
│       ├── types.ts
│       └── components/
│           ├── BatchForm.tsx
│           ├── TxTable.tsx
│           ├── StatsBanner.tsx
│           ├── Toast.tsx
│           ├── Modal.tsx
│           ├── CreateTxModal.tsx
│           └── TxDetailsModal.tsx
│
├── data/                      seed data (CSV files)
├── sql/01_init.sql            DDL + indexes + COPY FROM csv (local Postgres only)
│
├── eda/                       exploratory analysis
│   ├── analysis.ipynb         Jupyter notebook reproducing all figures
│   ├── analysis.md            written report answering the 5 questions
│   ├── numbers-cheatsheet.md  quick-reference card for the architecture docs
│   ├── requirements.txt       notebook deps
│   └── figures/*.png          rendered charts (q1-5 + 4 distribution figures)
│
├── docs/                      architecture documents
│   ├── architecture-early-stage.md       MVP single-AZ on AWS
│   ├── architecture-at-scale.md          > 500 QPS, multi-AZ, full security checklist
│   ├── investigation-answers.md          4 distributed-systems answers
│   ├── idempotency-implementation.md     reference note
│   ├── deployment-notes.md               GitHub vars/secrets + AWS ARN placeholders
│   └── diagrams/                         PNG exports of C4 diagrams
│
├── infrastructure/
│   ├── cloudformation.yml                full Early-Stage stack (33 resources)
│   └── README.md                         deploy instructions
│
├── scripts/bootstrap.sh       one-time setup helper (local)
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

24 tests across endpoints, pagination, and idempotency. The most important is
`tests/test_idempotency.py::test_100_parallel_requests_one_row` — 100
concurrent `POST /transactions` with the same `Idempotency-Key` produce
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
- [At Scale](docs/architecture-at-scale.md) — multi-AZ, WAF, Cognito, RDS Proxy, 500 QPS target, full §8 security checklist (transport, OWASP Top 10, observability) and DC fictional → AWS / GCP / Hetzner mapping.
- [Investigation answers](docs/investigation-answers.md) — concurrency, clock skew, idempotency, eventual consistency.

## License & credits

Educational project for SupNum. Data is synthetic. Code authored by Group 2.
