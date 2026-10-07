import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AppModule } from "../app.module.js";

type MigrationCommand = "run" | "revert" | "show";

async function bootstrap(): Promise<void> {
  const logger = new Logger("MigrationCLI");
  const command = (process.argv[2] as MigrationCommand | undefined) ?? "run";

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "error", "warn"],
  });

  try {
    // Resolving through the Nest context guarantees the exact same connection
    // configuration (and .env loading) the API runtime uses.
    const dataSource = app.get(DataSource);

    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    if (command === "show") {
      const pending = await dataSource.showMigrations();
      logger.log(`Pending migrations: ${pending ? "yes" : "none"}`);
      return;
    }

    if (command === "revert") {
      await dataSource.undoLastMigration({ transaction: "each" });
      logger.log("Reverted the last migration.");
      return;
    }

    const applied = await dataSource.runMigrations({ transaction: "each" });
    if (applied.length === 0) {
      logger.log("No pending migrations. Database schema is up to date.");
    } else {
      for (const migration of applied) {
        logger.log(`Applied migration: ${migration.name}`);
      }
    }
  } catch (error) {
    logger.error("Migration failed", error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
