import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Phase 8 - query plan evidence: filtered parcel lists
 * (merchant_id + status ORDER BY createdAt DESC) performed a separate sort
 * step; this composite serves the filter and the ordering from one index.
 * Validated with EXPLAIN ANALYZE on the development dataset before/after.
 */
export class Phase8ParcelListIndex1700000000009 implements MigrationInterface {
  name = 'Phase8ParcelListIndex1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_parcels_merchant_status_created"
        ON "parcels" ("merchant_id", "status", "createdAt" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_parcels_merchant_status_created";`);
  }
}
