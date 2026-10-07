import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Real restore drill: verifies checksum, restores the latest pg_dump custom
 * archive into RESTORE_DATABASE (default `dhruto_restore_drill`), then runs
 * integrity checks (migrations table, row counts, FK violations).
 *
 * Usage: node scripts/restore-db.mjs [backupFile] [restoreDatabase]
 * Never restores into the live database unless RESTORE_DATABASE points there
 * explicitly — the default is always the drill database.
 */
const targetDir = path.resolve(__dirname, '../backups');

function pickDb(override) {
  if (override) {
    return { host: 'localhost', port: '5432', user: 'postgres', password: 'password', database: override };
  }
  return {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || '5432',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'password',
    database: process.env.PGDATABASE || 'dhruto',
  };
}

console.log('=================================================');
console.log('  Dhruto Logistics OS — Restore Drill (pg_restore) ');
console.log('=================================================');

if (!fs.existsSync(targetDir)) {
  console.error(`Backups directory ${targetDir} does not exist.`);
  process.exit(1);
}

const argFile = process.argv[2];
const candidates = argFile
  ? [argFile]
  : fs.readdirSync(targetDir).filter((f) => f.endsWith('.dump')).sort().reverse();
if (candidates.length === 0) {
  console.error('No .dump backup files found. Run backup-db.mjs first.');
  process.exit(1);
}

const latestBackup = path.isAbsolute(candidates[0])
  ? candidates[0]
  : path.join(targetDir, candidates[0]);
const checksumFile = `${latestBackup}.sha256`;

console.log(`Verifying Backup: ${latestBackup}`);
if (fs.existsSync(checksumFile)) {
  const expectedHash = fs.readFileSync(checksumFile, 'utf8').trim();
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(latestBackup)).digest('hex');
  if (expectedHash !== actualHash) {
    console.error(`SHA-256 Mismatch! Expected ${expectedHash}, got ${actualHash}`);
    process.exit(1);
  }
  console.log('SHA-256 Integrity Verification: PASSED (Match)');
} else {
  console.warn('Checksum file missing — continuing without verification.');
}

const restoreDbName = process.argv[3] || process.env.RESTORE_DATABASE || 'dhruto_restore_drill';
const db = pickDb(null);
const env = { ...process.env, PGPASSWORD: db.password };
const started = Date.now();

console.log(`Drop/create drill database: ${restoreDbName}`);
execFileSync('psql', ['-h', db.host, '-p', db.port, '-U', db.user, '-c', `DROP DATABASE IF EXISTS ${restoreDbName};`], { env, stdio: 'inherit' });
execFileSync('psql', ['-h', db.host, '-p', db.port, '-U', db.user, '-c', `CREATE DATABASE ${restoreDbName};`], { env, stdio: 'inherit' });

console.log('Restoring archive (pg_restore --clean --if-exists)...');
execFileSync(
  'pg_restore',
  ['-h', db.host, '-p', db.port, '-U', db.user, '-d', restoreDbName, '--clean', '--if-exists', '--no-owner', latestBackup],
  { env, stdio: 'inherit' },
);

console.log('Integrity checks on restored database...');
const check = (sql) =>
  execFileSync('psql', ['-h', db.host, '-p', db.port, '-U', db.user, '-d', restoreDbName, '-t', '-c', sql], { env, encoding: 'utf8' }).trim();
const migrations = check('SELECT count(*) FROM migrations;');
const parcels = check('SELECT count(*) FROM parcels;');
const wallets = check('SELECT count(*) FROM wallets;');
const fkViolations = check(`SELECT count(*) FROM (
  SELECT 1 FROM parcels p LEFT JOIN merchants m ON m.id = p.merchant_id WHERE m.id IS NULL
  UNION ALL
  SELECT 1 FROM cash_ledgers l LEFT JOIN parcels p ON p.id = l.parcel_id WHERE p.id IS NULL
) v;`);
console.log(`migrations applied : ${migrations}`);
console.log(`parcels restored   : ${parcels}`);
console.log(`wallets restored   : ${wallets}`);
console.log(`FK violations      : ${fkViolations}`);
if (fkViolations !== '0') {
  console.error('Referential integrity check FAILED.');
  process.exit(1);
}
console.log(`Restore Drill Completed Successfully in ${((Date.now() - started) / 1000).toFixed(1)}s!\n`);
