-- Dhruto Logistics OS Automated Snapshot
-- Timestamp: 2026-10-05T13:14:15.082Z
-- Integrity Check: SHA-256 enabled
-- Target: PostgreSQL / TypeORM
SELECT current_database(), current_user, version();
SELECT count(*) AS total_parcels FROM parcels;
SELECT count(*) AS total_ledgers FROM cash_ledgers;
-- End of Snapshot