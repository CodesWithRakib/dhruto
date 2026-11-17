<#
.SYNOPSIS
    Dhruto Logistics OS — Production Zero-Downtime Deployment Runner (Windows PowerShell)
.DESCRIPTION
    Builds multi-stage Docker images, verifies PostgreSQL and Redis readiness,
    applies migrations, boots API and Web containers, and monitors healthchecks.
#>

[CmdletBinding()]
param(
    [string]$ComposeFile = "docker-compose.prod.yml",
    [string]$EnvFile = ".env.production"
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "    🚀 Dhruto Logistics OS — Production Deployment Orchestrator     " -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

# 1. Pre-flight Checks
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "[ERROR] Docker is not installed or not in PATH."
    exit 1
}

if (-not (Test-Path $EnvFile)) {
    Write-Warning "[$EnvFile] not found. Checking for '.env'..."
    if (Test-Path ".env") {
        Write-Warning "Using '.env' as fallback configuration."
        $EnvFile = ".env"
    } else {
        Write-Error "[ERROR] No '$EnvFile' or '.env' found! Copy '.env.production.example' to '$EnvFile' before deploying."
        exit 1
    }
}

Write-Host "[✓] Pre-flight checks passed using configuration: $EnvFile" -ForegroundColor Green

# 2. Build multi-stage optimized production images
Write-Host "`n[1/4] Building production images with Docker BuildKit..." -ForegroundColor Cyan
$env:DOCKER_BUILDKIT = "1"
& docker compose -f $ComposeFile --env-file $EnvFile build --pull
if ($LASTEXITCODE -ne 0) { throw "Image build failed with exit code $LASTEXITCODE" }

# 3. Start database and cache services
Write-Host "`n[2/4] Starting PostgreSQL and Redis data layer..." -ForegroundColor Cyan
& docker compose -f $ComposeFile --env-file $EnvFile up -d postgres redis
if ($LASTEXITCODE -ne 0) { throw "Data layer startup failed" }

Write-Host "Waiting for database health check..." -ForegroundColor Yellow
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    $status = docker inspect --format='{{json .State.Health.Status}}' dhruto-postgres-prod 2>$null
    if ($status -eq '"healthy"') {
        $healthy = $true
        break
    }
    Start-Sleep -Seconds 2
    Write-Host -NoNewline "."
}

if (-not $healthy) {
    throw "PostgreSQL failed to report healthy status within timeout."
}
Write-Host "`n[✓] PostgreSQL is healthy." -ForegroundColor Green

# 4. Run automated database migrations
Write-Host "`n[3/4] Applying pending database migrations..." -ForegroundColor Cyan
& docker compose -f $ComposeFile --env-file $EnvFile run --rm migration
if ($LASTEXITCODE -ne 0) { throw "Database migration execution failed" }

# 5. Launch API and Next.js frontend
Write-Host "`n[4/4] Launching API and Web Merchant application containers..." -ForegroundColor Cyan
& docker compose -f $ComposeFile --env-file $EnvFile up -d --remove-orphans api web
if ($LASTEXITCODE -ne 0) { throw "Container launch failed" }

# 6. Verify health probes
Write-Host "`nVerifying system readiness via health probes..." -ForegroundColor Yellow
$maxAttempts = 30
$allHealthy = $false

for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    $apiStatus = docker inspect --format='{{json .State.Health.Status}}' dhruto-api-prod 2>$null
    $webStatus = docker inspect --format='{{json .State.Health.Status}}' dhruto-web-prod 2>$null

    if ($apiStatus -eq '"healthy"' -and $webStatus -eq '"healthy"') {
        $allHealthy = $true
        break
    }
    Write-Host "Waiting for services... API: $apiStatus, Web: $webStatus (attempt $attempt/$maxAttempts)"
    Start-Sleep -Seconds 2
}

if ($allHealthy) {
    Write-Host "`n====================================================================" -ForegroundColor Green
    Write-Host "  🎉 Dhruto Logistics OS successfully deployed and fully healthy!   " -ForegroundColor Green
    Write-Host "====================================================================" -ForegroundColor Green
    Write-Host "  API Service: http://localhost:4000/api/v1 (Health: http://localhost:4000/health)"
    Write-Host "  Web Portal:  http://localhost:5000"
    Write-Host "`nActive Containers:"
    & docker compose -f $ComposeFile --env-file $EnvFile ps
} else {
    Write-Error "[ERROR] Services failed to reach healthy state within timeout!"
    Write-Host "`nRecent container logs:" -ForegroundColor Yellow
    & docker compose -f $ComposeFile --env-file $EnvFile logs --tail=50
    exit 1
}
