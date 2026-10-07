import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import { JwtPayload } from "./jwt.interface.js";
import { AuthConfig } from "../../config/auth.config.js";
import { UserRole } from "../../database/entities/User.entity.js";

@Injectable()
export class CustomJwtService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(private readonly configService: ConfigService) {
    const authConfig = this.configService.get<AuthConfig>("auth");
    this.accessSecret =
      authConfig?.jwtAccessSecret || "dhruto_dev_jwt_access_secret_change_in_production_32chars";
    this.refreshSecret =
      authConfig?.jwtRefreshSecret || "dhruto_dev_jwt_refresh_secret_change_in_production_32chars";
    this.accessExpiresIn = authConfig?.jwtAccessExpiresIn || "15m";
    this.refreshExpiresIn = authConfig?.jwtRefreshExpiresIn || "7d";
  }

  /**
   * Base64URL encoder according to RFC 7515 / RFC 7519.
   */
  private base64UrlEncode(data: string | Buffer): string {
    const base64 = (Buffer.isBuffer(data) ? data : Buffer.from(data)).toString("base64");
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  /**
   * Base64URL decoder according to RFC 7515 / RFC 7519.
   */
  private base64UrlDecode(input: string): string {
    let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return Buffer.from(base64, "base64").toString("utf8");
  }

  /**
   * Parses time expression (e.g. '15m', '7d', '1h', '30s') into seconds.
   */
  private parseExpiresIn(expiresIn: string | number): number {
    if (typeof expiresIn === "number") {
      return expiresIn;
    }
    const match = /^(\d+)([smhd])$/.exec(expiresIn.trim());
    if (!match || !match[1] || !match[2]) {
      return 900; // default 15 minutes
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 3600;
      case "d":
        return value * 86400;
      default:
        return 900;
    }
  }

  /**
   * Signs a JWT with HMAC-SHA256 (HS256).
   */
  sign(
    payload: Omit<JwtPayload, "iat" | "exp">,
    secret: string,
    expiresIn: string | number,
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.parseExpiresIn(expiresIn);

    const header = {
      alg: "HS256",
      typ: "JWT",
    };

    const fullPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));
    const message = `${encodedHeader}.${encodedPayload}`;

    const signature = createHmac("sha256", secret).update(message).digest();
    const encodedSignature = this.base64UrlEncode(signature);

    return `${message}.${encodedSignature}`;
  }

  /**
   * Verifies and decodes a JWT token.
   * Throws UnauthorizedException if expired, invalid signature, or malformed.
   */
  verify(token: string, secret: string): JwtPayload {
    if (!token || typeof token !== "string") {
      throw new UnauthorizedException("Authentication token is missing");
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new UnauthorizedException("Malformed JWT token structure");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedException("Malformed JWT token structure");
    }
    const message = `${encodedHeader}.${encodedPayload}`;

    // Verify signature
    const expectedSignature = createHmac("sha256", secret).update(message).digest();
    const expectedEncodedSignature = this.base64UrlEncode(expectedSignature);

    // Constant-time comparison to prevent timing attacks
    const sigA = Buffer.from(encodedSignature);
    const sigB = Buffer.from(expectedEncodedSignature);

    if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
      throw new UnauthorizedException("Invalid JWT signature");
    }

    // Decode header & check algorithm
    let header: { alg?: string; typ?: string };
    try {
      header = JSON.parse(this.base64UrlDecode(encodedHeader));
    } catch {
      throw new UnauthorizedException("Invalid JWT header");
    }

    if (header.alg !== "HS256") {
      throw new UnauthorizedException(`Unsupported JWT algorithm: ${header.alg}`);
    }

    // Decode payload
    let payload: JwtPayload;
    try {
      payload = JSON.parse(this.base64UrlDecode(encodedPayload));
    } catch {
      throw new UnauthorizedException("Invalid JWT payload");
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedException("JWT token has expired");
    }

    return payload;
  }

  /**
   * Generates both Access Token and Refresh Token for a user.
   */
  generateAuthTokens(user: {
    id: string;
    email: string;
    phone: string;
    role: UserRole;
    merchantId?: string | null;
    riderId?: string | null;
    hubId?: string | null;
  }): { accessToken: string; refreshToken: string; expiresIn: number } {
    const basePayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      merchantId: user.merchantId || null,
      riderId: user.riderId || null,
      hubId: user.hubId || null,
    };

    const accessToken = this.sign(
      { ...basePayload, type: "access" },
      this.accessSecret,
      this.accessExpiresIn,
    );

    const refreshToken = this.sign(
      { ...basePayload, type: "refresh" },
      this.refreshSecret,
      this.refreshExpiresIn,
    );

    const expiresInSeconds = this.parseExpiresIn(this.accessExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Verifies access token.
   */
  verifyAccessToken(token: string): JwtPayload {
    const payload = this.verify(token, this.accessSecret);
    if (payload.type && payload.type !== "access") {
      throw new UnauthorizedException("Invalid token type for authorization");
    }
    return payload;
  }

  /**
   * Verifies refresh token.
   */
  verifyRefreshToken(token: string): JwtPayload {
    const payload = this.verify(token, this.refreshSecret);
    if (payload.type && payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid token type for session refresh");
    }
    return payload;
  }
}
