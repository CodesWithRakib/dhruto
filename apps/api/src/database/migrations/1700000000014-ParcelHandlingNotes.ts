import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Separate merchant handling notes from the parcel description.
 *
 * Previously the edit dialog's "delivery notes" overwrote
 * `parcel_description` (what is inside the parcel) and pickup instructions
 * were appended to it, so riders and hubs lost the item description.
 *
 *  - merchant_note:        merchant's delivery note for the rider
 *  - pickup_instructions:  merchant's instructions for the pickup rider
 *
 * Additive and nullable only: no backfill, no table rewrite, fully reversible.
 */
export class ParcelHandlingNotes1700000000014 implements MigrationInterface {
  name = "ParcelHandlingNotes1700000000014";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "parcels"
        ADD COLUMN IF NOT EXISTS "merchant_note" varchar(500) NULL,
        ADD COLUMN IF NOT EXISTS "pickup_instructions" varchar(500) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "parcels"
        DROP COLUMN IF EXISTS "pickup_instructions",
        DROP COLUMN IF EXISTS "merchant_note";
    `);
  }
}
