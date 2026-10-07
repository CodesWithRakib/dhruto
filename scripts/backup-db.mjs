import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Real PostgreSQL backup via pg_dump (custom format, compressed).
 * Replaces the old snapshot stub which never dumped data.
 *
 * Env: PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSWORD (defaults below) or
 * DATABASE_URL. Retention: RETENTION_COUNT (default 7).
 */
const targetDir = path.resolve(__dirname, '../backups');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function pickDb() {
  if (process.env.DATABASE_URL) {
    const u = new URL(process.env.DATABASE_URL);
    return {
      host: u.hostname, port: u.port || '5432',
      user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
    };
  }
  return {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || '5432',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'password',
    database: process.env.PGDATABASE || 'dhruto',
  };
}

const db = pickDb();
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(targetDir, `dhruto_backup_${timestamp}.dump`);
const checksumFile = `${backupFile}.sha256`;

console.log('=================================================');
console.log('  Dhruto Logistics OS — Database Backup (pg_dump)  ');
console.log('=================================================');

const env = { ...process.env, PGPASSWORD: db.password };
execFileSync(
  'pg_dump',
  ['-h', db.host, '-p', db.port, '-U', db.user, '-F', 'c', '-Z', '6', '-f', backupFile, db.database],
  { env, stdio: 'inherit' },
);

const hash = crypto.createHash('sha256').update(fs.readFileSync(backupFile)).digest('hex');
fs.writeFileSync(checksumFile, hash, 'utf8');

const stats = fs.statSync(backupFile);
console.log(`Backup File: ${backupFile}`);
console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`SHA-256: ${hash}`);

// Retention rotation (default keep 7 newest dumps + checksums).
const retention = Number(process.env.RETENTION_COUNT ?? 7);
const dumps = fs
  .readdirSync(targetDir)
  .filter((f) => f.startsWith('dhruto_backup_') && f.endsWith('.dump'))
  .sort();
while (dumps.length > retention) {
  const victim = dumps.shift();
  if (!victim) break;
  fs.rmSync(path.join(targetDir, victim), { force: true });
  fs.rmSync(path.join(targetDir, `${victim}.sha256`), { force: true });
  console.log(`Rotated out: ${victim}`);
}
console.log('Backup Completed Successfully!\n');
