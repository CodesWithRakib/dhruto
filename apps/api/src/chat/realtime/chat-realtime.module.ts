import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../../auth/auth.module.js";
import { REALTIME_FANOUT_HANDLER } from "../../integrations/realtime-fanout.port.js";
import { ChatModule } from "../chat.module.js";
import { ChatGateway } from "./chat.gateway.js";
import { ChatPresenceService } from "./chat-presence.service.js";
import { ChatRealtimeFanoutService } from "./chat-realtime-fanout.service.js";
import { ChatRealtimeMetricsService } from "./chat-realtime-metrics.service.js";
import { ChatRedisService } from "./chat-redis.service.js";
import { ChatSocketAuthenticator } from "./chat-socket-auth.js";
import { ChatSocketServer } from "./chat-socket-server.js";

/**
 * Communication Phase 3 — realtime engine.
 *
 * Global so that (a) the outbox relay in IntegrationsModule can inject the
 * REALTIME_FANOUT_HANDLER port without a circular module import, and (b) the
 * health controller can report realtime readiness.
 */
@Global()
@Module({
  imports: [ConfigModule, AuthModule, ChatModule],
  providers: [
    ChatRedisService,
    ChatSocketServer,
    ChatRealtimeMetricsService,
    ChatPresenceService,
    ChatSocketAuthenticator,
    ChatRealtimeFanoutService,
    ChatGateway,
    { provide: REALTIME_FANOUT_HANDLER, useExisting: ChatRealtimeFanoutService },
  ],
  exports: [REALTIME_FANOUT_HANDLER, ChatRealtimeMetricsService],
})
export class ChatRealtimeModule {}
