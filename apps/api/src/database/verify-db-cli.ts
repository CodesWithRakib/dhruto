import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AppModule } from "../app.module.js";

interface VerificationCheck {
  name: string;
  category: "MIGRATION" | "REFERENTIAL_INTEGRITY" | "FINANCE_LEDGER" | "INTELLIGENCE" | "ACCOUNTS";
  status: "PASS" | "FAIL";
  details: string;
}

async function verifyDatabase(): Promise<void> {
  const logger = new Logger("DatabaseVerifier");
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });

  const checks: VerificationCheck[] = [];

  try {
    const ds = app.get(DataSource);
    if (!ds.isInitialized) {
      await ds.initialize();
    }

    // 1. Migration Status Check
    const pendingMigrations = await ds.showMigrations();
    checks.push({
      name: "Schema Migrations Synchronization",
      category: "MIGRATION",
      status: !pendingMigrations ? "PASS" : "FAIL",
      details: pendingMigrations
        ? "Pending unapplied migrations detected"
        : "All migrations applied and synced with PostgreSQL schema",
    });

    // 2. Referential Integrity & Zero Orphan Checks
    const orphanQueries: Array<{ name: string; query: string }> = [
      {
        name: "Parcels -> Merchants",
        query: `SELECT COUNT(*)::int AS count FROM parcels p LEFT JOIN merchants m ON p.merchant_id = m.id WHERE m.id IS NULL`,
      },
      {
        name: "Parcels -> Riders",
        query: `SELECT COUNT(*)::int AS count FROM parcels p LEFT JOIN riders r ON p.current_rider_id = r.id WHERE p.current_rider_id IS NOT NULL AND r.id IS NULL`,
      },
      {
        name: "Parcels -> Hubs",
        query: `SELECT COUNT(*)::int AS count FROM parcels p LEFT JOIN hubs h ON p.current_hub_id = h.id WHERE p.current_hub_id IS NOT NULL AND h.id IS NULL`,
      },
      {
        name: "Parcel Status History -> Parcels",
        query: `SELECT COUNT(*)::int AS count FROM parcel_status_histories psh LEFT JOIN parcels p ON psh.parcel_id = p.id WHERE p.id IS NULL`,
      },
      {
        name: "Financial Entries -> Transactions",
        query: `SELECT COUNT(*)::int AS count FROM financial_entries fe LEFT JOIN financial_transactions ft ON fe.transaction_id = ft.id WHERE ft.id IS NULL`,
      },
      {
        name: "Cash Ledgers -> Parcels",
        query: `SELECT COUNT(*)::int AS count FROM cash_ledgers cl LEFT JOIN parcels p ON cl.parcel_id = p.id WHERE p.id IS NULL`,
      },
      {
        name: "Wallet Transactions -> Wallets",
        query: `SELECT COUNT(*)::int AS count FROM wallet_transactions wt LEFT JOIN wallets w ON wt.wallet_id = w.id WHERE w.id IS NULL`,
      },
      {
        name: "Delivery Attempts -> Parcels",
        query: `SELECT COUNT(*)::int AS count FROM delivery_attempts da LEFT JOIN parcels p ON da.parcel_id = p.id WHERE p.id IS NULL`,
      },
    ];

    for (const orphan of orphanQueries) {
      const res = await ds.query(orphan.query);
      const count = Number(res[0]?.count ?? 0);
      checks.push({
        name: `Zero Orphan Check: ${orphan.name}`,
        category: "REFERENTIAL_INTEGRITY",
        status: count === 0 ? "PASS" : "FAIL",
        details: count === 0 ? "0 orphans detected (clean)" : `${count} orphan records found`,
      });
    }

    // 3. Double-Entry Accounting Invariant Audit
    const unbalancedTxQuery = `
      SELECT ft.transaction_code,
             SUM(CASE WHEN fe.direction = 'DEBIT' THEN fe.amount_minor ELSE 0 END) AS total_debit,
             SUM(CASE WHEN fe.direction = 'CREDIT' THEN fe.amount_minor ELSE 0 END) AS total_credit
      FROM financial_transactions ft
      JOIN financial_entries fe ON fe.transaction_id = ft.id
      WHERE ft.status = 'POSTED'
      GROUP BY ft.id, ft.transaction_code
      HAVING SUM(CASE WHEN fe.direction = 'DEBIT' THEN fe.amount_minor ELSE 0 END) !=
             SUM(CASE WHEN fe.direction = 'CREDIT' THEN fe.amount_minor ELSE 0 END)
    `;
    const unbalanced = await ds.query(unbalancedTxQuery);
    checks.push({
      name: "Double-Entry Balance Invariant (Sum DEBIT == Sum CREDIT)",
      category: "FINANCE_LEDGER",
      status: unbalanced.length === 0 ? "PASS" : "FAIL",
      details:
        unbalanced.length === 0
          ? "All posted financial transactions are strictly balanced"
          : `Unbalanced transactions found: ${unbalanced.map((u: { transaction_code: string }) => u.transaction_code).join(", ")}`,
    });

    // 4. Geography Dataset & Intelligence Model Registry
    const [geoVersions, geoDistricts, geoThanas, activeModels] = await Promise.all([
      ds.query(`SELECT COUNT(*)::int AS count FROM geo_dataset_versions WHERE status = 'ACTIVE'`),
      ds.query(`SELECT COUNT(*)::int AS count FROM geo_places WHERE kind = 'DISTRICT'`),
      ds.query(`SELECT COUNT(*)::int AS count FROM geo_places WHERE kind = 'UPAZILA'`),
      ds.query(`SELECT COUNT(*)::int AS count FROM scoring_models WHERE status = 'ACTIVE'`),
    ]);

    const activeGeoCount = Number(geoVersions[0]?.count ?? 0);
    const districtCount = Number(geoDistricts[0]?.count ?? 0);
    const thanaCount = Number(geoThanas[0]?.count ?? 0);
    const modelCount = Number(activeModels[0]?.count ?? 0);

    checks.push({
      name: "Authoritative Bangladesh Geography (64 Districts, 590+ Thanas)",
      category: "INTELLIGENCE",
      status: districtCount === 64 && thanaCount >= 590 ? "PASS" : "FAIL",
      details: `Districts: ${districtCount}/64, Thanas: ${thanaCount}/590+, Active Dataset Versions: ${activeGeoCount}`,
    });

    checks.push({
      name: "Scoring Model Registry Availability",
      category: "INTELLIGENCE",
      status: modelCount >= 1 ? "PASS" : "FAIL",
      details: `${modelCount} active scoring models registered`,
    });

    // 5. Account Verification & Password Hashes
    const users = await ds.query(
      `SELECT role, COUNT(*)::int AS count, bool_and(password_hash LIKE '$2%') AS valid_hashes FROM users GROUP BY role`,
    );
    const rolesPresent = new Set(users.map((u: { role: string }) => u.role));
    const allRolesPresent = ["ADMIN", "MERCHANT", "RIDER", "HUB_MANAGER"].every((r) =>
      rolesPresent.has(r),
    );
    const allHashesValid = users.every((u: { valid_hashes: boolean }) => u.valid_hashes);

    checks.push({
      name: "Role Accounts & Bcrypt Credential Formats",
      category: "ACCOUNTS",
      status: allRolesPresent && allHashesValid ? "PASS" : "FAIL",
      details: `Roles present: ${Array.from(rolesPresent).join(", ")} | Bcrypt valid: ${allHashesValid}`,
    });

    // Summary Reporting
    const failedChecks = checks.filter((c) => c.status === "FAIL");
    console.info("\n========================================================");
    console.info("🔎 DHRUTO DATABASE INTEGRITY & SEED VERIFICATION REPORT");
    console.info("========================================================");
    for (const check of checks) {
      const icon = check.status === "PASS" ? "✅" : "❌";
      console.info(`${icon} [${check.category}] ${check.name}`);
      console.info(`   └─ ${check.details}`);
    }
    console.info("========================================================");
    console.info(`Total Checks: ${checks.length} | Passed: ${checks.length - failedChecks.length} | Failed: ${failedChecks.length}`);
    console.info("========================================================\n");

    if (failedChecks.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    logger.error("Verification execution failed", error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void verifyDatabase();
