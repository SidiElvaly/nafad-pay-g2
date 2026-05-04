<h1 align="center">NAFAD-PAY G2</h1>

<p align="center">
  <strong>A Mauritanian mobile-payment simulator</strong><br/>
  FastAPI backend with SHA256-based idempotency, React + Vite dashboard,
  PostgreSQL seeded with 100 000 historical transactions,<br/>
  one-command local boot, and a full AWS deployment behind CloudFront.
</p>

<p align="center">
  <a href="https://github.com/SidiElvaly/nafad-pay-g2/actions/workflows/ci.yml"><img src="https://github.com/SidiElvaly/nafad-pay-g2/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/SidiElvaly/nafad-pay-g2/actions/workflows/deploy-api.yml"><img src="https://github.com/SidiElvaly/nafad-pay-g2/actions/workflows/deploy-api.yml/badge.svg" alt="Deploy API"></a>
  <a href="https://github.com/SidiElvaly/nafad-pay-g2/actions/workflows/deploy-frontend.yml"><img src="https://github.com/SidiElvaly/nafad-pay-g2/actions/workflows/deploy-frontend.yml/badge.svg" alt="Deploy frontend"></a>
  <img src="https://img.shields.io/badge/python-3.12-blue" alt="Python 3.12">
  <img src="https://img.shields.io/badge/react-18-61dafb" alt="React 18">
  <img src="https://img.shields.io/badge/postgres-16-336791" alt="Postgres 16">
  <img src="https://img.shields.io/badge/AWS-eu--west--3-FF9900" alt="AWS eu-west-3">
</p>

---

## Live demo

<table>
  <tr>
    <td><strong>Dashboard</strong></td>
    <td><a href="https://dlblyfqhsm6re.cloudfront.net">https://dlblyfqhsm6re.cloudfront.net</a></td>
  </tr>
 
  <tr>
    <td><strong>Swagger UI</strong></td>
    <td><a href="https://dlblyfqhsm6re.cloudfront.net/api/docs">https://dlblyfqhsm6re.cloudfront.net/api/docs</a></td>
  </tr>
  <tr>
    <td><strong>Stats endpoint</strong></td>
    <td><a href="https://dlblyfqhsm6re.cloudfront.net/api/stats">https://dlblyfqhsm6re.cloudfront.net/api/stats</a></td>
  </tr>
</table>

> Hosted on AWS `eu-west-3` (Paris) by the [CloudFormation
> template](infrastructure/cloudformation.yml) and two GitHub Actions deploy


## Highlights

- **Idempotent writes by design.** Every `POST /transactions` carries an
  `Idempotency-Key`; the database's PRIMARY KEY constraint is the
  synchronization primitive — no application-level locks. Verified by a 100-
  parallel test that produces exactly 1 row + 100 identical responses.
- **Empirical realism.** Synthetic transactions are sampled from log-normal
  latencies, empirical wilaya / channel / device frequencies, and a 67.3 %
  success rate — all extracted from the 100 k-row historical dataset and
  documented in [`eda/analysis.ipynb`](eda/analysis.ipynb).
- **One-command boot.** `docker compose up` brings the full stack up locally
  in under a minute (postgres + 100 k-row seed + API + frontend).
- **Production-grade deployment.** A single CloudFormation template
  provisions VPC, ALB, ECS Fargate, RDS, ECR, Secrets Manager, S3 + CloudFront
  with `/api` routing, and a GitHub OIDC role — no long-lived AWS keys.
- **Full test coverage of the critical path.** 24 backend tests including the
  100-parallel idempotency canary and the pagination boundary cases.

## Quick start

<details open>
  <summary><strong>Local development</strong> (docker-compose, ~1 minute)</summary>

```bash
git clone https://github.com/SidiElvaly/nafad-pay-g2.git
cd nafad-pay-g2
cp .env.example .env
docker compose up
```

Then open:

| | |
|---|---|
| Frontend | <http://localhost:3000> |
| Swagger | <http://localhost:8000/docs> |
| Stats | <http://localhost:8000/stats> |

The seed loads 100 k-rows on first boot if `data/historical_transactions.csv`
is present (download from the course materials — it is gitignored at 24 MB).
Without it, the stack still boots and the database is empty.
</details>

<details>
  <summary><strong>Run the backend test suite</strong></summary>

```bash
docker run -d --name pgtest -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16
export TEST_DATABASE_URL=postgresql+asyncpg://postgres:test@localhost:5433/postgres
cd api
pip install -e ".[dev]"
pytest --cov=app --cov-report=term-missing
```

24 tests across endpoints,pagination, and idempotency. The most important
case is `tests/test_idempotency.py::test_100_parallel_requests_one_row` —
100 concurrent `POST /transactions` with the same `Idempotency-Key` produce
exactly 1 row in the database and 100 identical responses.
</details>

<details>
  <summary><strong> Deploy your own copy on AWS </strong> ( ~ 15 minutes)</summary>

```bash
aws cloudformation deploy \
  --region eu-west-3 \
  --stack-name nafad-pay-g2 \
  --template-file infrastructure/cloudformation.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides DBPassword='pick-something-strong-12chars-min'
```

Then copy the stack outputs into the GitHub repo's variables and secrets
(table in [`infrastructure/README.md`](infrastructure/README.md)) and trigger
the two deploy workflows. See [`docs/deployment-notes.md`](docs/deployment-notes.md)
for the full bootstrap walkthrough.
</details>

## Architecture

### Local development

```mermaid
flowchart LR
    Browser([Browser]) -->|HTTP :3000| Nginx[nginx<br/>Vite static build]
    Browser -->|HTTP :8000| API[FastAPI<br/>asyncpg pool]
    API -->|TCP :5432| PG[(PostgreSQL 16<br/>100 k seeded rows)]

    classDef svc fill:#1e293b,stroke:#3157e0,color:#fff,stroke-width:1.5px;
    classDef db  fill:#fff,stroke:#336791,color:#336791,stroke-width:1.5px;
    class Nginx,API svc;
    class PG db;
```

### AWS production

```mermaid
flowchart TB
    Browser([User Browser]):::user

    subgraph AWS["AWS  eu-west-3 (Paris)"]
        direction TB
        CDN["CloudFront<br/>distribution"]:::cdn

        subgraph Edge["Edge / Static"]
            S3[("S3<br/>frontend bucket")]:::storage
        end

        subgraph VPC["VPC  10.0.0.0/16"]
            ALB["Application<br/>Load Balancer"]:::compute
            ECS["ECS Fargate<br/>nafad-api task"]:::compute
            RDS[("RDS PostgreSQL 16<br/>db.t4g.micro")]:::db
        end

        subgraph Support["Account-wide services"]
            ECR[("ECR<br/>nafad-api image")]:::storage
            SM["Secrets Manager<br/>DATABASE_URL"]:::sec
            Logs["CloudWatch Logs<br/>/ecs/nafad-api"]:::ops
        end
    end

    Browser -->|HTTPS| CDN
    CDN -->|"default → S3"| S3
    CDN -->|"/api/* → ALB"| ALB
    ALB -->|HTTP :8000| ECS
    ECS -->|TCP :5432| RDS
    ECS -->|GetSecretValue| SM
    ECS -.pull image.-> ECR
    ECS -.JSON logs.-> Logs

    classDef user    fill:#fff,stroke:#64748b,color:#1e293b,stroke-width:1.5px;
    classDef cdn     fill:#8C4FFF,stroke:#5A2DA0,color:#fff,stroke-width:1.5px;
    classDef compute fill:#FF9900,stroke:#cc7a00,color:#1e293b,stroke-width:1.5px;
    classDef storage fill:#7AA116,stroke:#5d7d10,color:#fff,stroke-width:1.5px;
    classDef db      fill:#3B48CC,stroke:#2a35a0,color:#fff,stroke-width:1.5px;
    classDef sec     fill:#DD344C,stroke:#a8243a,color:#fff,stroke-width:1.5px;
    classDef ops     fill:#FF4F8B,stroke:#cc3a6e,color:#fff,stroke-width:1.5px;
```

CloudFront has two cache behaviors:

- `/api/*` → ALB → ECS Fargate. The `/api` prefix is preserved by CloudFront
  and stripped server-side by FastAPI's `root_path="/api"`, which keeps
  Swagger UI's spec-fetch path correct.
- everything else → S3, with a SPA fallback to `/index.html`.

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/transactions` | Create a transaction. Requires `Idempotency-Key` header. SHA256 hash of body is stored alongside the response payload; replays return the cached response, mismatches return 422. |
| `GET` | `/transactions?limit=&offset=` | Paginated list ordered by `(date DESC, time DESC, id DESC)`. `limit` capped at 100. |
| `GET` | `/stats` | Aggregate query: `today_volume`, `success_rate`, `tx_per_second` (over the last 60 s), `total_count`. |
| `POST` | `/simulate/batch?n=` | Bulk-insert N synthetic rows (1–10 000) using the empirical distributions in [`api/app/simulator.py`](api/app/simulator.py). |

Full contract: [`api-contract.md`](api-contract.md). Live OpenAPI spec:
<https://dlblyfqhsm6re.cloudfront.net/api/openapi.json>.

## Tech stack

| Layer | Tools |
|---|---|
| **Backend** | FastAPI 0.110 · SQLAlchemy 2.0 (async) · asyncpg · Pydantic v2 · NumPy (simulator) · uvicorn |
| **Frontend** | React 18 · Vite 5 · TypeScript 5.5 · Tailwind CSS · Inter font |
| **Database** | PostgreSQL 16 · BIGSERIAL primary keys · JSONB idempotency cache |
| **Local infra** | Docker Compose (postgres + api + nginx-frontend) |
| **Cloud infra** | CloudFormation · ECS Fargate · ALB · RDS · CloudFront · S3 · Secrets Manager · ECR · CloudWatch · IAM OIDC |
| **CI/CD** | GitHub Actions: backend tests + frontend build + compose smoke + two OIDC deploy workflows |
| **Tests** | pytest · pytest-asyncio · httpx · ruff |

## Project structure

```
nafad-pay-g2/
├── api/                          FastAPI backend
│   ├── app/                          main.py · routes.py · models.py · schemas.py · db.py · simulator.py
│   ├── tests/                        24 tests (idempotency · pagination · endpoints)
│   ├── Dockerfile
│   └── pyproject.toml
│
├── frontend/                     React + Vite + Tailwind SPA
│   ├── src/
│   │   ├── App.tsx · api.ts · types.ts
│   │   └── components/               BatchForm · TxTable · StatsBanner · Toast · Modal · CreateTxModal · TxDetailsModal
│   ├── .env.example                  VITE_API_URL template
│   └── Dockerfile                    multi-stage: node build → nginx serve
│
├── data/                         seed data
│   ├── historical_transactions.csv   (24 MB, gitignored — download separately)
│   ├── reference_wilayas.csv         15 wilayas + economic weights
│   ├── reference_tx_types.csv        8 transaction types
│   └── reference_categories.csv      merchant categories
│
├── sql/
│   ├── 01_init.sql               DDL + indexes
│   └── 02_seed.sh                guarded COPY (skips silently if CSV absent)
│
├── eda/                          exploratory analysis
│   ├── analysis.ipynb            Jupyter notebook reproducing all figures
│   ├── analysis.md               written report (5 investigation questions)
│   ├── numbers-cheatsheet.md     quick-reference card for architecture docs
│   ├── figures/                  9 PNG charts (Q1-Q5 + 4 distributions)
│   └── requirements.txt
│
├── docs/                         architecture documents
│   ├── architecture-early-stage.md   single-AZ MVP (~$50/month)
│   ├── architecture-at-scale.md      multi-AZ at 500+ QPS, full §8 security checklist
│   ├── investigation-answers.md      4 distributed-systems answers
│   ├── idempotency-implementation.md
│   ├── deployment-notes.md           GitHub vars/secrets + AWS ARN placeholders
│   └── diagrams/                     PNG exports of C4 diagrams
│
├── infrastructure/
│   ├── cloudformation.yml        full Early-Stage stack (33 resources)
│   └── README.md                 deploy walkthrough + tear-down
│
├── .github/workflows/
│   ├── ci.yml                    backend tests · frontend build · compose smoke
│   ├── deploy-api.yml            build → ECR → ECS Fargate (OIDC)
│   └── deploy-frontend.yml       Vite build → S3 → CloudFront invalidation (OIDC)
│
├── docker-compose.yml
├── api-contract.md               locked JSON contract
├── Makefile                      common commands (up, test, smoke)
└── scripts/bootstrap.sh
```

## How idempotency works

`POST /transactions` requires an `Idempotency-Key` header (UUIDv4 recommended).
The server stores the key + a SHA256 of the canonical request body + the
response payload in `idempotency_keys`. On retry:

| Scenario | Behaviour |
|---|---|
| Same key + same body | Server returns the cached response — no second insert. |
| Same key + different body | 422 `IDEMPOTENCY_MISMATCH`. |
| Concurrent same-key requests | The PRIMARY KEY constraint admits exactly one writer; losers catch `IntegrityError`, roll back, and read the cached response. |

The database's unique constraint *is* the synchronization primitive — no
application-level locks are needed. Full walk-through:
[`docs/idempotency-implementation.md`](docs/idempotency-implementation.md).

## Documentation

| Document | Description |
|---|---|
| [`api-contract.md`](api-contract.md) | Locked JSON shapes for all 4 endpoints. |
| [`docs/architecture-early-stage.md`](docs/architecture-early-stage.md) | Single-AZ MVP architecture (~$50/month, 50 QPS ceiling). |
| [`docs/architecture-at-scale.md`](docs/architecture-at-scale.md) | Multi-AZ at 500 + QPS, ADRs, full §8 security checklist (transport · OWASP Top 10 · observability), threat model, datacenter mapping (AWS / GCP / Hetzner). |
| [`docs/idempotency-implementation.md`](docs/idempotency-implementation.md) | The 6-step algorithm + concurrency proof. |
| [`docs/investigation-answers.md`](docs/investigation-answers.md) | Concurrency · clock skew · idempotency · eventual consistency. |
| [`docs/deployment-notes.md`](docs/deployment-notes.md) | GitHub variables / secrets table + AWS ARN placeholders. |
| [`eda/analysis.ipynb`](eda/analysis.ipynb) | Re-runnable notebook reproducing every figure. |
| [`eda/numbers-cheatsheet.md`](eda/numbers-cheatsheet.md) | Quick-reference card for the architecture docs. |
| [`infrastructure/README.md`](infrastructure/README.md) | CloudFormation deploy + tear-down. |

## Why React + Vite (not Next.js)

This is a single-page dashboard with no SEO needs and no per-route
data-fetching, so **React + Vite (SPA)** keeps things minimal — one
`index.html` served by nginx, all rendering in the browser, no Node runtime
in production. Next.js would add SSR/edge complexity we don't use; the same
UX would cost an always-on Node container in the deployment topology.

## License & credits

Educational project for **SupNum**. Data is synthetic. Code authored by
**Group 2** (Platform & API).
