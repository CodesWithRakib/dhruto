import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { type Namespace, type Socket } from "socket.io";
import { SOCKET_SERVER_OPTIONS } from "../../common/websocket/socket-server.options.js";
import { CustomJwtService } from "../../auth/jwt/custom-jwt.service.js";
import { type JwtPayload } from "../../auth/jwt/jwt.interface.js";

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: JwtPayload;
  };
}

/**
 * Real-Time Notifications WebSocket Gateway.
 * -------------------------------------------------------------
 * Provides instantaneous real-time push notifications across all user roles
 * (MERCHANT, RIDER, HUB_MANAGER, ADMIN, CUSTOMER).
 *
 * Rooms are joined only server-side, from the verified access token
 * (user / role / merchant / hub / rider). Clients cannot join rooms and this
 * gateway carries no chat traffic (see "Legacy chat containment" below).
 */
@WebSocketGateway({
  // Shared server options (S-2: env-driven origin allowlist + handshake Origin
  // check). Must be identical across gateways on the same port.
  ...SOCKET_SERVER_OPTIONS,
  namespace: "/",
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  /** With `namespace` set, Nest injects the Namespace (not the root Server). */
  @WebSocketServer()
  server: Namespace;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: CustomJwtService) {}

  /**
   * Authenticates connected socket clients via JWT and registers them into
   * dedicated user, merchant, hub, and role rooms.
   */
  async handleConnection(client: AuthenticatedSocket) {
    // Installed before any await so no event can slip through during auth.
    this.installLegacyChatGuard(client);
    try {
      const rawToken =
        client.handshake.auth?.token ||
        (typeof client.handshake.headers?.authorization === "string"
          ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
          : null);

      if (!rawToken) {
        this.logger.debug(`Socket connection rejected: No authentication token provided (${client.id})`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verifyAccessToken(rawToken);
      client.data.user = payload;

      const userId = payload.sub;
      const role = payload.role;
      const merchantId = payload.merchantId;
      const hubId = payload.hubId;
      const riderId = payload.riderId;

      // Join individual user room
      await client.join(`user:${userId}`);

      // Join role room
      await client.join(`role:${role}`);

      // Join tenant-specific rooms
      if (merchantId) {
        await client.join(`merchant:${merchantId}`);
      }
      if (hubId) {
        await client.join(`hub:${hubId}`);
      }
      if (riderId) {
        await client.join(`rider:${riderId}`);
      }

      this.logger.log(
        `SOCKET_CONNECTED client=${client.id} user=${userId} role=${role} merchant=${merchantId || "-"}`,
      );

      // Send connection acknowledgement
      client.emit("connection:ready", {
        status: "connected",
        userId,
        role,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication error";
      this.logger.debug(`Socket connection unauthorized: ${msg} (${client.id})`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data?.user;
    this.logger.log(`SOCKET_DISCONNECTED client=${client.id} user=${user?.sub || "anonymous"}`);
  }

  /* ================================================================== */
  /* Real-Time Notification Emitters                                   */
  /* ================================================================== */

  /**
   * Emits a real-time notification to a specific user.
   */
  emitToUser(userId: string, event: string, payload: unknown): boolean {
    if (!this.server) return false;
    this.server.to(`user:${userId}`).emit(event, payload);
    return true;
  }

  /**
   * Emits a real-time notification to an entire merchant team.
   */
  emitToMerchant(merchantId: string, event: string, payload: unknown): boolean {
    if (!this.server) return false;
    this.server.to(`merchant:${merchantId}`).emit(event, payload);
    return true;
  }

  /**
   * Emits a notification to all active users with a specific role.
   */
  emitToRole(role: string, event: string, payload: unknown): boolean {
    if (!this.server) return false;
    this.server.to(`role:${role}`).emit(event, payload);
    return true;
  }

  /**
   * Global broadcast to all connected clients.
   */
  broadcast(event: string, payload: unknown): boolean {
    if (!this.server) return false;
    this.server.emit(event, payload);
    return true;
  }

  /* ================================================================== */
  /* Legacy chat containment (communication Phase 2, finding S-1)       */
  /* ================================================================== */

  /**
   * The former placeholder `chat:join` / `chat:leave` / `chat:message` /
   * `chat:typing` handlers let any authenticated client join an arbitrary
   * `chat:<roomId>` room and broadcast unpersisted messages. They have been
   * removed: this gateway now exposes NO client-to-server chat events, and no
   * code path joins a socket to a `chat:*` room.
   *
   * As defence in depth, any client event in the reserved `chat:` namespace is
   * dropped, logged, and answered with an `exception` event. The packet is
   * deliberately NOT passed to `next(err)`: socket.io re-emits middleware
   * errors as a server-side `error` event, which would throw (and could crash
   * the process) when no listener is attached — turning the guard itself into
   * a denial-of-service vector. The authorized chat gateway is Phase 3.
   */
  static readonly LEGACY_CHAT_EVENT_PREFIX = "chat:";

  private installLegacyChatGuard(client: AuthenticatedSocket): void {
    client.use(([event], next) => {
      if (
        typeof event === "string" &&
        event.startsWith(NotificationsGateway.LEGACY_CHAT_EVENT_PREFIX)
      ) {
        this.logger.warn(
          `LEGACY_CHAT_EVENT_REJECTED client=${client.id} user=${client.data.user?.sub ?? "anonymous"} event=${event.slice(0, 64)}`,
        );
        client.emit("exception", {
          status: "error",
          message: "Chat events are not supported on this channel",
        });
        return; // drop the packet: never reaches any handler, never joins a room
      }
      next();
    });
  }
}
