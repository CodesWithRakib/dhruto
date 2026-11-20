import { DataSource, getMetadataArgsStorage, type QueryRunner } from "typeorm";
import * as entityExports from "../../src/database/entities/index.js";
import { InitialSchema1700000000000 } from "../../src/database/migrations/1700000000000-InitialSchema.js";
import { ReconcilePhase0Schema1700000000001 } from "../../src/database/migrations/1700000000001-ReconcilePhase0Schema.js";
import { Phase2HubOperations1700000000002 } from "../../src/database/migrations/1700000000002-Phase2HubOperations.js";
import { Phase3RiderDelivery1700000000003 } from "../../src/database/migrations/1700000000003-Phase3RiderDelivery.js";
import { Phase4FinanceLedger1700000000004 } from "../../src/database/migrations/1700000000004-Phase4FinanceLedger.js";
import { Phase4LedgerOpeningBalances1700000000005 } from "../../src/database/migrations/1700000000005-Phase4LedgerOpeningBalances.js";
import { Phase5NotificationsIntegrations1700000000006 } from "../../src/database/migrations/1700000000006-Phase5NotificationsIntegrations.js";
import { Phase6Intelligence1700000000007 } from "../../src/database/migrations/1700000000007-Phase6Intelligence.js";
import { Phase7Analytics1700000000008 } from "../../src/database/migrations/1700000000008-Phase7Analytics.js";
import { Phase8ParcelListIndex1700000000009 } from "../../src/database/migrations/1700000000009-Phase8ParcelListIndex.js";
import { CommunicationPhase1Foundation1700000000010 } from "../../src/database/migrations/1700000000010-CommunicationPhase1Foundation.js";
import { CommunicationPhase2Backend1700000000011 } from "../../src/database/migrations/1700000000011-CommunicationPhase2Backend.js";
import { CommunicationPhase7AdminCenter1700000000012 } from "../../src/database/migrations/1700000000012-CommunicationPhase7AdminCenter.js";
import { CustomerDeliveryPreference1700000000013 } from "../../src/database/migrations/1700000000013-CustomerDeliveryPreference.js";
import { ParcelHandlingNotes1700000000014 } from "../../src/database/migrations/1700000000014-ParcelHandlingNotes.js";
import { MerchantPickupLocation1700000000015 } from "../../src/database/migrations/1700000000015-MerchantPickupLocation.js";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Disposable-database harness for schema/migration tests.
 *
 * Safety: requires an explicit `CHAT_TEST_DATABASE_URL` whose database name
 * contains "test". The harness DROPS THE WHOLE SCHEMA before migrating, so it
 * refuses to run against anything that is not clearly a throwaway database
 * (it never falls back to DATABASE_URL / DB_* development settings).
 */
export const CHAT_TEST_DATABASE_URL = process.env.CHAT_TEST_DATABASE_URL;

export function assertDisposableDatabaseUrl(url: string): void {
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(dbName)) {
    throw new Error(
      `Refusing to run destructive schema tests against database "${dbName}": name must contain "test".`,
    );
  }
}

export const ALL_MIGRATIONS = [
  InitialSchema1700000000000,
  ReconcilePhase0Schema1700000000001,
  Phase2HubOperations1700000000002,
  Phase3RiderDelivery1700000000003,
  Phase4FinanceLedger1700000000004,
  Phase4LedgerOpeningBalances1700000000005,
  Phase5NotificationsIntegrations1700000000006,
  Phase6Intelligence1700000000007,
  Phase7Analytics1700000000008,
  Phase8ParcelListIndex1700000000009,
  CommunicationPhase1Foundation1700000000010,
  CommunicationPhase2Backend1700000000011,
  CommunicationPhase7AdminCenter1700000000012,
  CustomerDeliveryPreference1700000000013,
  ParcelHandlingNotes1700000000014,
  MerchantPickupLocation1700000000015,
];

/**
 * Guard against drift: the disposable schema must match production. Every
 * migration file needs an entry above (this list fell behind once, leaving
 * the throwaway DB without columns the entities expect).
 */
const MIGRATION_FILES = readdirSync(
  fileURLToPath(new URL("../../src/database/migrations/", import.meta.url)),
).filter((f) => /^\d+-.+\.ts$/.test(f));
if (MIGRATION_FILES.length !== ALL_MIGRATIONS.length) {
  throw new Error(
    `chat-test-db: ${MIGRATION_FILES.length} migration files but ${ALL_MIGRATIONS.length} registered in ALL_MIGRATIONS — add the missing ones.`,
  );
}

/** Every class exported from the entity barrel that TypeORM knows as an entity. */
export function allEntityClasses(): Array<new () => unknown> {
  const tables = getMetadataArgsStorage().tables;
  return Object.values(entityExports).filter(
    (value): value is new () => unknown =>
      typeof value === "function" && tables.some((table) => table.target === value),
  );
}

export function createChatTestDataSource(url: string): DataSource {
  assertDisposableDatabaseUrl(url);
  return new DataSource({
    type: "postgres",
    url,
    synchronize: false,
    dropSchema: true,
    logging: false,
    entities: allEntityClasses(),
    migrations: ALL_MIGRATIONS,
    migrationsTableName: "migrations",
  });
}

/** Runs `fn` and returns the PostgreSQL SQLSTATE it failed with (or null on success). */
export async function sqlStateOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === "string" ? code : "UNKNOWN";
  }
}

/** Executes `fn` in a transaction that is always rolled back (test isolation). */
export async function inRolledBackTransaction(
  dataSource: DataSource,
  fn: (runner: QueryRunner) => Promise<void>,
): Promise<void> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    await fn(runner);
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}
