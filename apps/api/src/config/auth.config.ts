import { registerAs } from "@nestjs/config";

export interface AuthConfig {
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
}

export const authConfig = registerAs<AuthConfig>("auth", () => ({
  jwtAccessSecret:
    process.env.JWT_ACCESS_SECRET || "dhruto_dev_jwt_access_secret_change_in_production_32chars",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || "dhruto_dev_jwt_refresh_secret_change_in_production_32chars",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
}));
