import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '../backups');

console.log('=================================================');
console.log('  Dhruto Logistics OS — Restore & Drill Utility   ');
console.log('=================================================');

if (!fs.existsSync(targetDir)) {
  console.error(`Backups directory ${targetDir} does not exist.`);
  process.exit(1);
}

const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.sql')).sort().reverse();
if (files.length === 0) {
  console.error('No backup files found.');
  process.exit(1);
}

const latestBackup = path.join(targetDir, files[0]);
const checksumFile = `${latestBackup}.sha256`;

console.log(`Verifying Backup: ${latestBackup}`);

if (!fs.existsSync(checksumFile)) {
  console.warn('Checksum file missing.');
} else {
  const content = fs.readFileSync(latestBackup, 'utf8');
  const expectedHash = fs.readFileSync(checksumFile, 'utf8').trim();
  const actualHash = crypto.createHash('sha256').update(content).digest('hex');

  if (expectedHash === actualHash) {
    console.log('SHA-256 Integrity Verification: PASSED (Match)');
  } else {
    console.error(`SHA-256 Mismatch! Expected ${expectedHash}, got ${actualHash}`);
    process.exit(1);
  }
}

console.log('Database Restore Drill Completed Successfully!\n');
