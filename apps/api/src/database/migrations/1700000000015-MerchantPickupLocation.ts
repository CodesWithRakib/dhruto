import { type MigrationInterface, type QueryRunner } from "typeorm";

/**
 * Structured merchant pickup location for first-mile routing.
 *
 * Pickup requests are routed to the hub serving the merchant's pickup
 * district (hubs.district). `pickup_address` stays the free-text address the
 * rider follows; these columns are the routing key.
 *
 * Additive + nullable. Backfill: the district is inferred from the existing
 * free-text address for the common districts; anything else stays NULL until
 * the merchant sets it in Settings. Reversible.
 */
export class MerchantPickupLocation1700000000015 implements MigrationInterface {
  name = "MerchantPickupLocation1700000000015";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "merchants"
        ADD COLUMN IF NOT EXISTS "pickup_district" varchar(100) NULL,
        ADD COLUMN IF NOT EXISTS "pickup_thana" varchar(100) NULL;
    `);
    await queryRunner.query(`
      UPDATE "merchants" SET "pickup_district" = CASE
        WHEN "pickup_address" ~* '(chittagong|chattogram)' THEN 'Chittagong'
        WHEN "pickup_address" ~* 'sylhet' THEN 'Sylhet'
        WHEN "pickup_address" ~* 'rajshahi' THEN 'Rajshahi'
        WHEN "pickup_address" ~* 'khulna' THEN 'Khulna'
        WHEN "pickup_address" ~* '(barishal|barisal)' THEN 'Barishal'
        WHEN "pickup_address" ~* 'rangpur' THEN 'Rangpur'
        WHEN "pickup_address" ~* 'mymensingh' THEN 'Mymensingh'
        WHEN "pickup_address" ~* 'gazipur' THEN 'Gazipur'
        WHEN "pickup_address" ~* 'narayanganj' THEN 'Narayanganj'
        WHEN "pickup_address" ~* '(cumilla|comilla)' THEN 'Cumilla'
        WHEN "pickup_address" ~* 'dhaka' THEN 'Dhaka'
        ELSE NULL END
      WHERE "pickup_district" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "merchants"
        DROP COLUMN IF EXISTS "pickup_thana",
        DROP COLUMN IF EXISTS "pickup_district";
    `);
  }
}
