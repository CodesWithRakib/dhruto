#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "          Dhruto Logistics OS — Monorepo Setup            "
echo "=========================================================="

# 1. Verify Node
echo "[1/8] Verifying Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js >= 20.18.0."
    exit 1
fi
NODE_VERSION=$(node -v)
echo "  Found Node: $NODE_VERSION"

# 2. Verify pnpm
echo "[2/8] Verifying pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "ERROR: pnpm is not installed. Please install pnpm (npm install -g pnpm)."
    exit 1
fi
PNPM_VERSION=$(pnpm -v)
echo "  Found pnpm: $PNPM_VERSION"

# 3. Verify Docker
echo "[3/8] Checking Docker availability..."
if command -v docker &> /dev/null; then
    echo "  Docker is available: $(docker --version)"
else
    echo "  Notice: Docker is not installed or not in PATH."
    echo "  (For local dev, PostgreSQL and Redis can be run via Docker Compose when available, or via native services)."
fi

# 4. Prepare environment files from examples
echo "[4/8] Preparing environment configuration..."
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$ROOT_DIR/.env" ] && [ -f "$ROOT_DIR/.env.example" ]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    echo "  Created root .env from .env.example"
else
    echo "  Root .env already exists or .env.example missing, skipping."
fi

if [ ! -f "$ROOT_DIR/apps/api/.env" ] && [ -f "$ROOT_DIR/.env.example" ]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/apps/api/.env"
    echo "  Created apps/api/.env from .env.example"
fi

if [ ! -f "$ROOT_DIR/apps/web-merchant/.env.local" ] && [ -f "$ROOT_DIR/apps/web-merchant/.env.example" ]; then
    cp "$ROOT_DIR/apps/web-merchant/.env.example" "$ROOT_DIR/apps/web-merchant/.env.local"
    echo "  Created apps/web-merchant/.env.local from .env.example"
fi

# 5. Install dependencies
echo "[5/8] Installing workspace dependencies with pnpm..."
cd "$ROOT_DIR"
pnpm install

# 6. Build shared packages
echo "[6/8] Building shared packages..."
pnpm --filter "@dhruto/contracts" build
pnpm --filter "@dhruto/ui" build

# 7. Run Typecheck
echo "[7/8] Verifying types across workspaces..."
pnpm turbo typecheck

# 8. Success Report & URLs
echo "=========================================================="
echo "          Dhruto Setup Completed Successfully!            "
echo "=========================================================="
echo ""
echo "Local Application URLs:"
echo "  - Merchant Portal:   http://localhost:3000"
echo "  - Booking Page:      http://localhost:3000/bookings/new"
echo "  - Backend API:       http://localhost:4000/api/v1"
echo "  - Health Check:      http://localhost:4000/api/v1/health"
echo "  - Swagger Docs:      http://localhost:4000/docs"
echo ""
echo "Development Commands:"
echo "  pnpm dev            Run all applications concurrently"
echo "  pnpm build          Build all packages and applications"
echo "  pnpm test           Run unit and integration tests"
echo "  pnpm lint           Run linting across workspaces"
echo "  pnpm typecheck      Run TypeScript type checks"
echo ""
