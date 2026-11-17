#!/usr/bin/env bash
# ==============================================================================
# Dhruto Logistics OS — Production Zero-Downtime Deployment Runner (Linux/macOS)
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

echo -e "${BLUE}====================================================================${NC}"
echo -e "${BLUE}    🚀 Dhruto Logistics OS — Production Deployment Orchestrator     ${NC}"
echo -e "${BLUE}====================================================================${NC}"

# 1. Pre-flight Checks
if ! command -v docker &> /dev/null; then
  echo -e "${RED}[ERROR] Docker is not installed or not in PATH.${NC}" >&2
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo -e "${RED}[ERROR] Docker Compose V2 plugin is not installed.${NC}" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}[WARNING] '$ENV_FILE' not found. Checking if .env exists...${NC}"
  if [ -f ".env" ]; then
    echo -e "${YELLOW}Using '.env' as fallback environment configuration.${NC}"
    ENV_FILE=".env"
  else
    echo -e "${RED}[ERROR] No '$ENV_FILE' or '.env' found! Copy '.env.production.example' to '$ENV_FILE' and configure secrets before deploying.${NC}" >&2
    exit 1
  fi
fi

echo -e "${GREEN}[✓] Pre-flight checks passed using configuration: $ENV_FILE${NC}"

# 2. Build multi-stage optimized production images
echo -e "\n${BLUE}[1/4] Building production images with Docker BuildKit...${NC}"
DOCKER_BUILDKIT=1 docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --pull

# 3. Start database and cache services first
echo -e "\n${BLUE}[2/4] Starting PostgreSQL and Redis data layer...${NC}"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres redis

echo -e "${YELLOW}Waiting for database health check...${NC}"
until [ "$(docker inspect --format='{{json .State.Health.Status}}' dhruto-postgres-prod 2>/dev/null || echo '"starting"')" = '"healthy"' ]; do
  sleep 2
  echo -n "."
done
echo -e "\n${GREEN}[✓] PostgreSQL is healthy.${NC}"

# 4. Run automated database migrations
echo -e "\n${BLUE}[3/4] Applying pending database migrations...${NC}"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm migration

# 5. Launch API and Next.js frontend
echo -e "\n${BLUE}[4/4] Launching API and Web Merchant application containers...${NC}"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans api web

# 6. Verify health endpoints
echo -e "\n${YELLOW}Verifying system readiness via health probes...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
HEALTHY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  API_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' dhruto-api-prod 2>/dev/null || echo '"starting"')
  WEB_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' dhruto-web-prod 2>/dev/null || echo '"starting"')

  if [ "$API_STATUS" = '"healthy"' ] && [ "$WEB_STATUS" = '"healthy"' ]; then
    HEALTHY=true
    break
  fi
  echo -e "Waiting for services... API: $API_STATUS, Web: $WEB_STATUS (attempt $ATTEMPT/$MAX_ATTEMPTS)"
  sleep 2
done

if [ "$HEALTHY" = true ]; then
  echo -e "\n${GREEN}====================================================================${NC}"
  echo -e "${GREEN}  🎉 Dhruto Logistics OS successfully deployed and fully healthy!   ${NC}"
  echo -e "${GREEN}====================================================================${NC}"
  echo -e "  API Service: http://localhost:4000/api/v1 (Health: http://localhost:4000/health)"
  echo -e "  Web Portal:  http://localhost:5000"
  echo -e "  Active Containers:"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
else
  echo -e "\n${RED}[ERROR] Services failed to reach healthy state within timeout!${NC}" >&2
  echo -e "${YELLOW}Recent container logs:${NC}"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=50
  exit 1
fi
