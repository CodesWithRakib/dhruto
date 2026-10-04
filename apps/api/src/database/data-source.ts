import { DataSource, type DataSourceOptions } from "typeorm";

const isProduction = process.env.NODE_ENV === "production";
const databaseUrl = process.env.DATABASE_URL;

export const dataSourceOptions: DataSourceOptions = databaseUrl
  ? {
      type: "postgres",
      url: databaseUrl,
      synchronize: false,
      logging: !isProduction,
      entities: ["dist/**/*.entity.js"],
      migrations: ["dist/database/migrations/*.js"],
    }
  : {
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      username: process.env.DB_USERNAME || "postgres",
      password: process.env.DB_PASSWORD || "password",
      database: process.env.DB_DATABASE || "dhruto",
      synchronize: false,
      logging: !isProduction,
      entities: ["dist/**/*.entity.js"],
      migrations: ["dist/database/migrations/*.js"],
    };

export const AppDataSource = new DataSource(dataSourceOptions);
