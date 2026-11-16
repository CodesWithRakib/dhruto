import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  adminChatAttachmentDecisionSchema,
  adminChatAttachmentQueueSchema,
  adminChatReasonQuerySchema,
  type AdminChatAttachmentDecisionRequest,
  type AdminChatAttachmentQueueQuery,
  type AdminChatReasonQuery,
} from "@dhruto/contracts";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import { Roles } from "../../auth/decorators/roles.decorator.js";
import { type AuthenticatedUser } from "../../auth/jwt/jwt.interface.js";
import { UserRole } from "../../database/entities/index.js";
import { type RequestWithId } from "../../common/middleware/request-id.middleware.js";
import { RateLimit } from "../../common/rate-limit/rate-limit.decorator.js";
import { RateLimitGuard } from "../../common/rate-limit/rate-limit.guard.js";
import { CHAT_RATE_LIMITS } from "../chat.config.js";
import { chatContext } from "../chat-request.js";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe.js";
import { ChatAttachmentAdminService } from "./chat-attachment-admin.service.js";

/**
 * Phase 7 staff attachment endpoints. Restricted operations need an explicit
 * per-user grant (see `CHAT_GRANT_REQUIRED_PERMISSIONS`), enforced in the
 * service; `@Roles(ADMIN)` is defence in depth.
 */
@ApiTags("Chat Admin")
@ApiBearerAuth()
@UseGuards(RateLimitGuard)
@Roles(UserRole.ADMIN)
@Controller("chat/admin")
export class ChatAdminAttachmentsController {
  constructor(private readonly attachments: ChatAttachmentAdminService) {}

  @Get("conversations/:id/attachments")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Attachment metadata + scan state of a conversation (reason, audited)" })
  forConversation(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(adminChatReasonQuerySchema)) query: AdminChatReasonQuery,
  ) {
    return this.attachments.listForConversation(chatContext(user, req), id, query.reason);
  }

  @Get("attachments")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({
    summary: "Quarantine / scan queue (grant: restricted attachment access, audited)",
  })
  queue(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Query(new ZodValidationPipe(adminChatAttachmentQueueSchema))
    query: AdminChatAttachmentQueueQuery,
  ) {
    return this.attachments.queue(chatContext(user, req), query);
  }

  @Get("attachments/:attachmentId/download")
  @RateLimit(CHAT_RATE_LIMITS.download)
  @ApiOperation({
    summary: "Restricted staff download (grant + reason, audited, always as attachment)",
  })
  download(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
    @Query(new ZodValidationPipe(adminChatReasonQuerySchema)) query: AdminChatReasonQuery,
  ) {
    return this.attachments.restrictedDownload(chatContext(user, req), attachmentId, query.reason);
  }

  @Post("attachments/:attachmentId/decision")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Release or rescan a quarantined attachment (grant + reason, audited)" })
  decide(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
    @Body(new ZodValidationPipe(adminChatAttachmentDecisionSchema))
    body: AdminChatAttachmentDecisionRequest,
  ) {
    return this.attachments.decide(chatContext(user, req), attachmentId, body);
  }

  @Get("retention")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Attachment retention policy and eligible counts (grant)" })
  retention(@CurrentUser() user: AuthenticatedUser | null, @Req() req: RequestWithId) {
    return this.attachments.retentionStatus(chatContext(user, req));
  }
}
