.PHONY: help up down logs reset test backend-test frontend-build smoke

help:
	@echo "NAFAD-PAY G2 — common commands"
	@echo ""
	@echo "  make up              Boot the full stack (postgres + api + frontend)"
	@echo "  make down            Stop the stack (data preserved)"
	@echo "  make reset           Stop + delete all data (fresh start)"
	@echo "  make logs            Tail logs from all services"
	@echo "  make test            Run all tests (backend pytest)"
	@echo "  make backend-test    Run backend tests only"
	@echo "  make frontend-build  Build the frontend bundle to frontend/dist"
	@echo "  make smoke           End-to-end smoke test on a clean stack"
	@echo ""

up:
	docker compose up -d

down:
	docker compose down

reset:
	docker compose down -v

logs:
	docker compose logs -f

test: backend-test

backend-test:
	cd api && pip install -e ".[dev]" -q && pytest --cov=app --cov-report=term-missing

frontend-build:
	cd frontend && npm install && npm run build

smoke:
	@echo "==> Reset stack"
	docker compose down -v
	@echo "==> Boot stack"
	docker compose up -d --build
	@echo "==> Wait for API healthcheck"
	sleep 10
	@echo "==> Hit /stats"
	curl -fsS http://localhost:8000/stats | python3 -m json.tool
	@echo "==> Generate 100 transactions"
	curl -fsS -X POST "http://localhost:8000/simulate/batch?n=100" | python3 -m json.tool
	@echo "==> List transactions"
	curl -fsS "http://localhost:8000/transactions?limit=5" | python3 -m json.tool
	@echo "==> Smoke test passed."
