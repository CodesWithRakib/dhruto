import { registerAs } from "@nestjs/config";
import { type TypeOrmModuleOptions } from "@nestjs/typeorm";

export const databaseConfig = registerAs<TypeOrmModuleOptions>("database", () => {
  const isProduction = process.env.NODE_ENV === "production";
  const databaseUrl = process.env.DATABASE_URL;

  const baseConfig: TypeOrmModuleOptions = {
    type: "postgres",
    autoLoadEntities: true,
    synchronize: process.env.DB_SYNCHRONIZE === "true" || !isProduction,
    logging: !isProduction,
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
