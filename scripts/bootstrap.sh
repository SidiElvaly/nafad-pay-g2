#!/usr/bin/env bash
# bootstrap.sh — one-time setup for new clones
# Usage: ./scripts/bootstrap.sh

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> NAFAD-PAY G2 bootstrap"

# 1. Copy .env if not present
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env from .env.example"
else
    echo "  .env already present, skipping"
fi

# 2. Check Docker
if ! command -v docker &>/dev/null; then
    echo "✗ Docker not installed. Install Docker Desktop or Docker Engine first."
    exit 1
fi
echo "✓ Docker installed: $(docker --version)"

if ! docker compose version &>/dev/null; then
    echo "✗ Docker Compose v2 not available. Update Docker."
    exit 1
fi
echo "✓ Compose: $(docker compose version --short)"

# 3. Check for the historical CSV
if [ ! -f data/historical_transactions.csv ]; then
    echo "⚠  data/historical_transactions.csv missing — see data/README.md"
    echo "   The stack will boot but the transactions table will be empty until you provide it."
fi

# 4. Pull base images
echo "==> Pulling base images"
docker pull postgres:16-alpine

echo ""
echo "==> Bootstrap complete. Next steps:"
echo "   1. Ensure data/historical_transactions.csv is present (see data/README.md)"
echo "   2. Run: docker compose up"
echo ""
