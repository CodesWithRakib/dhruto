import { join } from "node:path";
import { registerAs } from "@nestjs/config";
import { type TypeOrmModuleOptions } from "@nestjs/typeorm";

export const databaseConfig = registerAs<TypeOrmModuleOptions>("database", () => {
  const databaseUrl = process.env.DATABASE_URL;

  // Schema is owned by migrations. `synchronize` is opt-in only (never implicit),
  // so a running instance can never silently reshape a shared database.
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
