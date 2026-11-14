import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { CustomJwtService } from "../../auth/jwt/custom-jwt.service.js";
import { type JwtPayload } from "../../auth/jwt/jwt.interface.js";

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: JwtPayload;
  };
}

/**
 * Real-Time Notifications & Messaging WebSocket Gateway.
 * -------------------------------------------------------------
 * Provides instantaneous real-time push notifications across all user roles
 * (MERCHANT, RIDER, HUB_MANAGER, ADMIN, CUSTOMER).
 *
 * Extensible for Future Chatting:
 * Includes built-in room routing, private messaging channels, and typing indicators
 * ready for upcoming Rider-Customer and Merchant-Support live chat features.
 */
@WebSocketGateway({
  cors: {
    origin: ["http://localhost:5000", "http://127.0.0.1:5000"],
    credentials: true,
  },
  namespace: "/",
  pingInterval: 10000,
  pingTimeout: 5000,
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: CustomJwtService) {}

  /**
   * Authenticates connected socket clients via JWT and registers them into
   * dedicated user, merchant, hub, and role rooms.
   */
  async handleConnection(client: AuthenticatedSocket) {
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
  /* Future Chatting & Live Messaging Channels                         */
  /* ================================================================== */

  /**
   * Allows users/riders to join a dedicated chat session (e.g. order-specific chat).
   */
  @SubscribeMessage("chat:join")
  async handleChatJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const user = client.data.user;
    if (!user || !data.roomId) return { success: false, error: "Unauthorized or invalid roomId" };

    await client.join(`chat:${data.roomId}`);
    this.logger.log(`CHAT_ROOM_JOINED user=${user.sub} room=${data.roomId}`);

    client.to(`chat:${data.roomId}`).emit("chat:user_joined", {
      userId: user.sub,
      role: user.role,
      roomId: data.roomId,
      timestamp: new Date().toISOString(),
    });

    return { success: true, roomId: data.roomId };
  }

  /**
   * Leaves a chat room.
   */
  @SubscribeMessage("chat:leave")
  async handleChatLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const user = client.data.user;
    if (!user || !data.roomId) return { success: false };

    await client.leave(`chat:${data.roomId}`);
    client.to(`chat:${data.roomId}`).emit("chat:user_left", {
      userId: user.sub,
      roomId: data.roomId,
    });

    return { success: true };
  }

  /**
   * Dispatches a message inside a chat room (ready for live chatting).
   */
  @SubscribeMessage("chat:message")
  handleChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; content: string; metadata?: Record<string, unknown> },
  ) {
    const user = client.data.user;
    if (!user || !data.roomId || !data.content?.trim()) {
      return { success: false, error: "Invalid message payload" };
    }

    const messagePayload = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      roomId: data.roomId,
      senderId: user.sub,
      senderRole: user.role,
      content: data.content.trim(),
      metadata: data.metadata || null,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to everyone in the room
    this.server.to(`chat:${data.roomId}`).emit("chat:message", messagePayload);
    return { success: true, message: messagePayload };
  }

  /**
   * Relays typing indicator in a chat room.
   */
  @SubscribeMessage("chat:typing")
  handleChatTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    const user = client.data.user;
    if (!user || !data.roomId) return;

    client.to(`chat:${data.roomId}`).emit("chat:typing", {
      userId: user.sub,
      role: user.role,
      isTyping: Boolean(data.isTyping),
    });
  }
}
