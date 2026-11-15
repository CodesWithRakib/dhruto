import { Injectable, Logger } from "@nestjs/common";
import { type Socket } from "socket.io";
import { ChatSocketErrorCode, type ChatSocketError } from "@dhruto/contracts";
import { CustomJwtService } from "../../auth/jwt/custom-jwt.service.js";
import { type AuthenticatedUser } from "../../auth/jwt/jwt.interface.js";
import { CacheService } from "../../common/cache/cache.service.js";
import { ChatAuthorizationService } from "../services/chat-authorization.service.js";
import { loadChatRealtimeConfig } from "./chat-realtime.config.js";

/** Error passed to Socket.IO namespace middleware -> client `connect_error`. */
export class ChatSocketAuthError extends Error {
  readonly data: ChatSocketError;

  constructor(code: ChatSocketErrorCode, message: string) {
    super(message);
    this.data = { code, message };
  }
}

export interface ChatSocketIdentity {
  user: AuthenticatedUser;
  /** Access-token expiry (epoch ms); the session is closed at this time. */
  expiresAt: number;
}

/**
 * Handshake authentication for the `/chat` namespace, built on the existing
 * CustomJwtService (HS256, signature + expiry, `type: "access"`). No issuer /
 * audience claims are configured anywhere in this API, so none are checked.
 *
 * Identity is derived ONLY from the verified token subject, then the account
 * is re-loaded from PostgreSQL: inactive/suspended users are rejected and the
 * role/merchant/rider scope come from the database, not from token claims or
 * anything the client sends (`handshake.auth.userId`, query params, etc. are
 * ignored). Tokens are never logged.
 *
 * Rejection uses namespace middleware `next(err)`, which Socket.IO sends to
 * the client as `connect_error` — unlike per-packet `socket.use` errors it
 * does not raise a server-side `error` event (see the S-1 crash fix).
 */
@Injectable()
export class ChatSocketAuthenticator {
  private readonly logger = new Logger(ChatSocketAuthenticator.name);
  private readonly connectionsPerMinute = loadChatRealtimeConfig().connectionsPerMinute;
  /** Fallback handshake counter when Redis is unavailable (per instance). */
  private readonly localWindows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly jwt: CustomJwtService,
    private readonly authz: ChatAuthorizationService,
    private readonly cache: CacheService,
  ) {}

  async authenticate(socket: Socket): Promise<ChatSocketIdentity> {
    const token = this.extractToken(socket);
    if (!token)
      throw new ChatSocketAuthError(ChatSocketErrorCode.UNAUTHENTICATED, "Authentication required");

    let subject: string;
    let expiresAt: number;
    let email: string;
    try {
      const payload = this.jwt.verifyAccessToken(token);
      if (!payload.sub || typeof payload.exp !== "number") {
        throw new ChatSocketAuthError(
          ChatSocketErrorCode.UNAUTHENTICATED,
          "Token must carry a subject and expiry",
        );
      }
      subject = payload.sub;
      expiresAt = payload.exp * 1000;
      email = payload.email;
    } catch (error) {
      if (error instanceof ChatSocketAuthError) throw error;
      const expired = error instanceof Error && /expired/i.test(error.message);
      throw new ChatSocketAuthError(
        expired ? ChatSocketErrorCode.TOKEN_EXPIRED : ChatSocketErrorCode.UNAUTHENTICATED,
        expired ? "Access token expired" : "Invalid access token",
      );
    }
    if (expiresAt <= Date.now()) {
      throw new ChatSocketAuthError(ChatSocketErrorCode.TOKEN_EXPIRED, "Access token expired");
    }

    if (await this.overConnectionBudget(subject)) {
      throw new ChatSocketAuthError(
        ChatSocketErrorCode.RATE_LIMITED,
        "Too many connection attempts",
      );
    }

    const scope = (await this.authz.loadScopesForUsers([subject])).get(subject);
    if (!scope)
      throw new ChatSocketAuthError(ChatSocketErrorCode.UNAUTHENTICATED, "Account is not active");

    return {
      expiresAt,
      user: {
        id: scope.userId,
        email,
        phone: scope.phone,
        role: scope.role,
        merchantId: scope.merchantId,
        riderId: scope.riderId,
        hubId: scope.riderHubId,
      },
    };
  }

  private extractToken(socket: Socket): string | null {
    const auth: unknown = socket.handshake.auth;
    if (
      typeof auth === "object" &&
      auth !== null &&
      "token" in auth &&
      typeof auth.token === "string"
    ) {
      return auth.token.trim() || null;
    }
    const header = socket.handshake.headers.authorization;
    if (typeof header === "string" && /^bearer\s+/i.test(header)) {
      return header.replace(/^bearer\s+/i, "").trim() || null;
    }
    return null;
  }

  private async overConnectionBudget(userId: string): Promise<boolean> {
    const shared = await this.cache.incr(`rl:chat-connect:${userId}`, 60).catch(() => null);
    if (shared) return shared.count > this.connectionsPerMinute;
    const now = Date.now();
    const window = this.localWindows.get(userId);
    if (!window || window.resetAt <= now) {
      this.localWindows.set(userId, { count: 1, resetAt: now + 60_000 });
      if (this.localWindows.size > 10_000) this.pruneWindows(now);
      return false;
    }
    window.count += 1;
    return window.count > this.connectionsPerMinute;
  }

  private pruneWindows(now: number): void {
    for (const [key, window] of this.localWindows)
      if (window.resetAt <= now) this.localWindows.delete(key);
    this.logger.debug(`SOCKET_AUTH_WINDOWS_PRUNED size=${this.localWindows.size}`);
  }
}
