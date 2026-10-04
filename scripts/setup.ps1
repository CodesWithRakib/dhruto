# Dhruto Setup Script for Windows PowerShell
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "          Dhruto Logistics OS — Monorepo Setup            " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify Node
Write-Host "[1/8] Verifying Node.js..."
$nodeVersion = node -v
Write-Host "  Found Node: $nodeVersion" -ForegroundColor Green

# 2. Verify pnpm
Write-Host "[2/8] Verifying pnpm..."
$pnpmVersion = pnpm -v
Write-Host "  Found pnpm: $pnpmVersion" -ForegroundColor Green

# 3. Verify Docker
Write-Host "[3/8] Checking Docker availability..."
try {
    $dockerVersion = docker --version
    Write-Host "  Docker is available: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  Notice: Docker is not installed or not in PATH." -ForegroundColor Yellow
}

$rootDir = Split-Path -Parent $PSScriptRoot

# 4. Prepare environment files
Write-Host "[4/8] Preparing environment configuration..."
if (-not (Test-Path "$rootDir\.env") -and (Test-Path "$rootDir\.env.example")) {
    Copy-Item "$rootDir\.env.example" "$rootDir\.env"
    Write-Host "  Created root .env" -ForegroundColor Green
}
if (-not (Test-Path "$rootDir\apps\api\.env") -and (Test-Path "$rootDir\.env.example")) {
    Copy-Item "$rootDir\.env.example" "$rootDir\apps\api\.env"
    Write-Host "  Created apps/api/.env" -ForegroundColor Green
}
if (-not (Test-Path "$rootDir\apps\web-merchant\.env.local") -and (Test-Path "$rootDir\apps\web-merchant\.env.example")) {
    Copy-Item "$rootDir\apps\web-merchant\.env.example" "$rootDir\apps\web-merchant\.env.local"
    Write-Host "  Created apps/web-merchant/.env.local" -ForegroundColor Green
}

# 5. Install dependencies
Write-Host "[5/8] Installing workspace dependencies with pnpm..."
Set-Location $rootDir
pnpm install

# 6. Build shared packages
Write-Host "[6/8] Building shared packages..."
pnpm --filter "@dhruto/contracts" build
pnpm --filter "@dhruto/ui" build

# 7. Run Typecheck
Write-Host "[7/8] Verifying types across workspaces..."
pnpm turbo typecheck

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "          Dhruto Setup Completed Successfully!            " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Local Application URLs:"
Write-Host "  - Merchant Portal:   http://localhost:3000"
Write-Host "  - Booking Page:      http://localhost:3000/bookings/new"
Write-Host "  - Backend API:       http://localhost:4000/api/v1"
Write-Host "  - Health Check:      http://localhost:4000/api/v1/health"
Write-Host "  - Swagger Docs:      http://localhost:4000/docs"
