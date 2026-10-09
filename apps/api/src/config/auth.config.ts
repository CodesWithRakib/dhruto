import { registerAs } from "@nestjs/config";

export interface AuthConfig {
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
}

export const authConfig = registerAs<AuthConfig>("auth", () => buildAuthConfig(process.env));

/**
 * Resolves JWT configuration from the environment. Fail-closed in
 * production: the application refuses to boot when required secrets are
 * missing, empty, or too weak, instead of falling back to a publicly known
 * development secret. Non-production keeps explicit dev defaults so local
 * development and tests work without extra setup.
 */
export function buildAuthConfig(env: NodeJS.ProcessEnv): AuthConfig {
  const isProduction = env.NODE_ENV === "production";
  const accessSecret = env.JWT_ACCESS_SECRET || "";
  const refreshSecret = env.JWT_REFRESH_SECRET || "";

  if (isProduction) {
    for (const [name, value] of [
      ["JWT_ACCESS_SECRET", accessSecret],
      ["JWT_REFRESH_SECRET", refreshSecret],
    ] as const) {
      if (!value || value.trim().length === 0) {
        throw new Error(
          `Fail-closed security: ${name} must be set in production (refusing to use dev fallback)`,
        );
      }
      if (value.trim().length < 32) {
        throw new Error(
          `Fail-closed security: ${name} must be at least 32 characters in production`,
        );
      }
    }
  }

  return {
    jwtAccessSecret: accessSecret || "dhruto_dev_jwt_access_secret_change_in_production_32chars",
    jwtRefreshSecret:
      refreshSecret || "dhruto_dev_jwt_refresh_secret_change_in_production_32chars",
    jwtAccessExpiresIn: env.JWT_ACCESS_EXPIRES_IN || "15m",
    jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN || "7d",
  };
}
