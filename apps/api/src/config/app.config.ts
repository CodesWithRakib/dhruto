import { registerAs } from "@nestjs/config";

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
}

export const appConfig = registerAs<AppConfig>("app", () => ({
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  apiPrefix: process.env.API_PREFIX || "/api/v1",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5000",
}));
