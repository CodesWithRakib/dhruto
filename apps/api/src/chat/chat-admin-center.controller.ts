import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  adminChatInboxQuerySchema,
  updateChatEscalationSchema,
  type AdminChatInboxQuery,
  type UpdateChatEscalationRequest,
} from "@dhruto/contracts";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { UserRole } from "../database/entities/index.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { CHAT_RATE_LIMITS } from "./chat.config.js";
import { chatContext } from "./chat-request.js";
import { ZodValidationPipe } from "./pipes/zod-validation.pipe.js";
import { ChatAdminInboxService } from "./services/chat-admin-inbox.service.js";
import { ChatEscalationService } from "./services/chat-escalation.service.js";

/**
 * Phase 7 Admin Communication Center endpoints (inbox, metrics, effective
 * permissions, escalation). Thin: every decision is made in the services
 * (effective ChatPermission incl. grants, scope, audit). `@Roles` is coarse
 * defence in depth only.
 */
@ApiTags("Chat Admin")
@ApiBearerAuth()
@UseGuards(RateLimitGuard)
@Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
@Controller("chat/admin")
export class ChatAdminCenterController {
  constructor(
    private readonly inbox: ChatAdminInboxService,
    private readonly escalations: ChatEscalationService,
  ) {}

  @Get("me")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Caller's effective chat staff permissions (role ceiling ∩ grants)" })
  me(@CurrentUser() user: AuthenticatedUser | null, @Req() req: RequestWithId) {
    return this.inbox.staffProfile(chatContext(user, req));
  }

  @Get("inbox")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({
    summary:
      "Operational inbox: metadata, activity order, filters, exact id/tracking search (audited)",
  })
  list(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Query(new ZodValidationPipe(adminChatInboxQuerySchema)) query: AdminChatInboxQuery,
  ) {
    return this.inbox.inbox(chatContext(user, req), query);
  }

  @Get("metrics")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Operational communication metrics from live data (counts only)" })
  metrics(@CurrentUser() user: AuthenticatedUser | null, @Req() req: RequestWithId) {
    return this.inbox.metrics(chatContext(user, req));
  }

  @Get("conversations/:id/escalation")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Current escalation state and history" })
  escalation(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.escalations.get(chatContext(user, req), id);
  }

  @Put("conversations/:id/escalation")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({
    summary:
      "Change escalation state / assignee (note required except IN_REVIEW; idempotent, audited)",
  })
  updateEscalation(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateChatEscalationSchema)) body: UpdateChatEscalationRequest,
  ) {
    return this.escalations.update(chatContext(user, req), id, body);
  }
}
