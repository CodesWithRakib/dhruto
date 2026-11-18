import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Customer delivery preference (customer portal "Reschedule").
 *
 * A recipient can ask for a preferred delivery date / time slot and leave a
 * doorstep instruction. This is a *preference* for hub and rider planning —
 * it never changes `parcels.status` (the state machine only allows
 * RESCHEDULED after a failed delivery attempt).
 *
 * Additive and nullable only: no backfill, no locks beyond a brief
 * ACCESS EXCLUSIVE for the catalog change, fully reversible.
 */
export class CustomerDeliveryPreference1700000000013 implements MigrationInterface {
  name = "CustomerDeliveryPreference1700000000013";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "parcels"
        ADD COLUMN IF NOT EXISTS "preferred_delivery_date" date NULL,
        ADD COLUMN IF NOT EXISTS "preferred_delivery_slot" varchar(40) NULL,
        ADD COLUMN IF NOT EXISTS "customer_delivery_note" varchar(300) NULL,
        ADD COLUMN IF NOT EXISTS "delivery_preference_updated_at" timestamptz NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "parcels"
        DROP COLUMN IF EXISTS "delivery_preference_updated_at",
        DROP COLUMN IF EXISTS "customer_delivery_note",
        DROP COLUMN IF EXISTS "preferred_delivery_slot",
        DROP COLUMN IF EXISTS "preferred_delivery_date";
    `);
  }
}
