import { join } from "node:path";
import { registerAs } from "@nestjs/config";
import { type TypeOrmModuleOptions } from "@nestjs/typeorm";

export const databaseConfig = registerAs<TypeOrmModuleOptions>("database", () => {
  const databaseUrl = process.env.DATABASE_URL;

  // Schema is owned by migrations. `synchronize` is opt-in only (never implicit),
  // so a running instance can never silently reshape a shared database.
  //
  // Pool sizing (measured rationale): pg defaults to 10 connections per
  // instance. Dhruto keeps transactions short and read-heavy, so max 20 per
  // instance supports burst without exhausting a db.t3-class PostgreSQL
  // (max_connections 100 ÷ up to 4 instances + headroom). statement_timeout
  // bounds runaway analytics/exports; pool errors surface instead of hanging.
  const baseConfig: TypeOrmModuleOptions = {
    type: "postgres",
    autoLoadEntities: true,
    synchronize: process.env.DB_SYNCHRONIZE === "true",
    logging: process.env.DB_LOGGING === "true",
    migrations: [join(__dirname, "..", "database", "migrations", "*{.ts,.js}")],
    migrationsTableName: "migrations",
    // Migrations are applied explicitly (`pnpm migration:run`), never on boot,
    // so a rolling deploy cannot race two instances against the same schema.
    migrationsRun: false,
    extra: {
      max: Number(process.env.DB_POOL_MAX ?? 20),
      min: Number(process.env.DB_POOL_MIN ?? 2),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 30000),
    },
  };

  if (databaseUrl) {
    return {
      ...baseConfig,
      url: databaseUrl,
    };
  }

  return {
    ...baseConfig,
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_DATABASE || "dhruto",
  };
});
