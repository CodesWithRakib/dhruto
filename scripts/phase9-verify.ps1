<#
.SYNOPSIS
  Dhruto Phase 9 backlog — owner-run verification (Phase 10, item 1).
.DESCRIPTION
  Recreates the fresh disposable `dhruto_phase9` DB (drop/create + migrate +
  seed), starts TWO API instances (4000/4001, shared Redis) + the web dev
  server (5000), then runs:
    1. apps/api multi-instance limiter spec (shared counter across instances)
    2. Brave parcel-list journey (tests/e2e/parcel-list.spec.ts, 5 tests)
  All started processes are killed on exit (try/finally). Read-only besides
  the disposable DB and log files under $env:TEMP\opencode\phase9-verify.

  Usage (repo root): powershell -ExecutionPolicy Bypass -File scripts\phase9-verify.ps1
  Prereqs: local PostgreSQL with postgres/password, shared Redis reachable
  (Upstash per apps/api/.env), Brave installed, pnpm deps installed,
  apps/api/dist built.
#>
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$ApiDir = Join-Path $Root "apps\api"
$WebDir = Join-Path $Root "apps\web-merchant"
$LogDir = Join-Path $env:TEMP "opencode\phase9-verify"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$DbName = "dhruto_phase9"
$DbUrl = "postgresql://postgres:password@localhost:5432/$DbName"
$Psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
if (-not (Test-Path $Psql)) { $Psql = "psql" }
$env:PGPASSWORD = "password"

$started = @()

function Stop-Started {
  foreach ($p in $started) {
    try {
      $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
      if ($proc) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
    } catch { }
  }
}

function Wait-Http($Url, $TimeoutSec = 120) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $res = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
      if ($res.StatusCode -lt 500) { return $true }
    } catch { }
    Start-Sleep -Seconds 3
  }
  throw "Timed out waiting for $Url"
}

try {
  Write-Host "[1/6] Recreating disposable DB $DbName ..." -ForegroundColor Cyan
  & $Psql -h localhost -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DbName' AND pid<>pg_backend_pid();" | Out-Null
  & $Psql -h localhost -U postgres -d postgres -c "DROP DATABASE IF EXISTS $DbName WITH (FORCE);"
  & $Psql -h localhost -U postgres -d postgres -c "CREATE DATABASE $DbName;"

  Write-Host "[2/6] Migrating + seeding ..." -ForegroundColor Cyan
  $env:DATABASE_URL = $DbUrl
  $env:DB_DATABASE = $DbName
  node --prefix $ApiDir "$ApiDir/dist/database/migrate-cli.js" run
  if ($LASTEXITCODE -ne 0) { throw "migration failed" }
  node --prefix $ApiDir "$ApiDir/dist/database/seed/seed-cli.js"
  if ($LASTEXITCODE -ne 0) { throw "seed failed" }

  Write-Host "[3/6] Starting API instances :4000 + :4001 ..." -ForegroundColor Cyan
  $env:PORT = "4000"
  $a1 = Start-Process -FilePath "node" -ArgumentList "dist/main" -WorkingDirectory $ApiDir `
    -RedirectStandardOutput (Join-Path $LogDir "api-4000.log") `
    -RedirectStandardError (Join-Path $LogDir "api-4000.err.log") `
    -NoNewWindow -PassThru
  $started += $a1.Id
  $env:PORT = "4001"
  $a2 = Start-Process -FilePath "node" -ArgumentList "dist/main" -WorkingDirectory $ApiDir `
    -RedirectStandardOutput (Join-Path $LogDir "api-4001.log") `
    -RedirectStandardError (Join-Path $LogDir "api-4001.err.log") `
    -NoNewWindow -PassThru
  $started += $a2.Id
  Wait-Http "http://localhost:4000/health"
  Wait-Http "http://localhost:4001/health"
  Write-Host "API instances healthy (shared DB $DbName, shared Redis)." -ForegroundColor Green

  Write-Host "[4/6] Multi-instance limiter spec ..." -ForegroundColor Cyan
  Push-Location $ApiDir
  try {
    npx vitest run test/rate-limit-multi-instance.e2e-spec.ts
    if ($LASTEXITCODE -ne 0) { throw "multi-instance limiter spec FAILED" }
  } finally { Pop-Location }

  Write-Host "[5/6] Starting web dev server :5000 ..." -ForegroundColor Cyan
  $web = Start-Process -FilePath "pnpm" -ArgumentList "dev" -WorkingDirectory $WebDir `
    -RedirectStandardOutput (Join-Path $LogDir "web-5000.log") `
    -RedirectStandardError (Join-Path $LogDir "web-5000.err.log") `
    -NoNewWindow -PassThru
  $started += $web.Id
  Wait-Http "http://localhost:5000/en/login" -TimeoutSec 240

  Write-Host "[6/6] Brave parcel-list journey ..." -ForegroundColor Cyan
  Push-Location $WebDir
  try {
    npx playwright test --config=playwright.brave.config.ts parcel-list
    if ($LASTEXITCODE -ne 0) { throw "parcel-list Brave journey FAILED" }
  } finally { Pop-Location }

  Write-Host "PHASE9-VERIFY PASS — record results in docs/audit-validation/phase-9-parcel-history-and-limiter.md" -ForegroundColor Green
} finally {
  Write-Host "Cleaning up started processes ..." -ForegroundColor Yellow
  Stop-Started
}
