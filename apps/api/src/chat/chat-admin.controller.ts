import {
  Body,
  Controller,
  Delete,
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
  adminChatAuditQuerySchema,
  adminChatExportQuerySchema,
  adminChatInterveneSchema,
  adminChatMessagesQuerySchema,
  adminChatReasonQuerySchema,
  adminListChatConversationsQuerySchema,
  adminListChatReportsQuerySchema,
  createChatInternalNoteSchema,
  reviewChatReportSchema,
  type AdminChatAuditQuery,
  type AdminChatExportQuery,
  type AdminChatInterveneRequest,
  type AdminChatMessagesQuery,
  type AdminChatReasonQuery,
  type AdminListChatConversationsQuery,
  type AdminListChatReportsQuery,
  type CreateChatInternalNoteRequest,
  type ReviewChatReportRequest,
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
import { ChatAdminService } from "./services/chat-admin.service.js";

/**
 * Staff-only chat endpoints. `@Roles` is coarse defence in depth only: the
 * decisive check is the specific ChatPermission enforced in ChatAdminService
 * (role ceiling + hub scope), and every content read requires a `reason`
 * that is written to chat_audit_logs.
 */
@ApiTags("Chat Admin")
@ApiBearerAuth()
@UseGuards(RateLimitGuard)
@Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
@Controller("chat/admin")
export class ChatAdminController {
  constructor(private readonly admin: ChatAdminService) {}

  @Get("conversations")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Platform-wide conversation metadata (no content), audited" })
  list(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Query(new ZodValidationPipe(adminListChatConversationsQuerySchema))
    query: AdminListChatConversationsQuery,
  ) {
    return this.admin.listConversations(chatContext(user, req), query);
  }

  @Get("conversations/:id")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "View a conversation as staff (reason required, audited)" })
  view(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(adminChatReasonQuerySchema)) query: AdminChatReasonQuery,
  ) {
    return this.admin.viewConversation(chatContext(user, req), id, query.reason);
  }

  @Get("conversations/:id/messages")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Read history as staff (reason required, audited)" })
  messages(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(adminChatMessagesQuerySchema)) query: AdminChatMessagesQuery,
  ) {
    return this.admin.viewMessages(chatContext(user, req), id, query);
  }

  @Get("conversations/:id/export")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Export a page of history (reason required, audited)" })
  exportMessages(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(adminChatExportQuerySchema)) query: AdminChatExportQuery,
  ) {
    return this.admin.exportMessages(chatContext(user, req), id, query);
  }

  @Post("conversations/:id/intervene")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Join a conversation visibly as moderator (reason required, audited)" })
  intervene(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(adminChatInterveneSchema)) body: AdminChatInterveneRequest,
  ) {
    return this.admin.intervene(chatContext(user, req), id, body.reason);
  }

  @Get("conversations/:id/notes")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Internal staff notes" })
  listNotes(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.admin.listNotes(chatContext(user, req), id);
  }

  @Post("conversations/:id/notes")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Add an internal staff note (audited)" })
  createNote(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createChatInternalNoteSchema)) body: CreateChatInternalNoteRequest,
  ) {
    return this.admin.createNote(chatContext(user, req), id, body.body);
  }

  @Delete("notes/:noteId")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Delete an internal note (author or admin, audited)" })
  deleteNote(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("noteId", ParseUUIDPipe) noteId: string,
  ) {
    return this.admin.deleteNote(chatContext(user, req), noteId);
  }

  @Get("reports")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Moderation report queue" })
  reports(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Query(new ZodValidationPipe(adminListChatReportsQuerySchema)) query: AdminListChatReportsQuery,
  ) {
    return this.admin.listReports(chatContext(user, req), query);
  }

  @Post("reports/:reportId/review")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Review / resolve / dismiss a report (audited)" })
  review(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("reportId", ParseUUIDPipe) reportId: string,
    @Body(new ZodValidationPipe(reviewChatReportSchema)) body: ReviewChatReportRequest,
  ) {
    return this.admin.reviewReport(chatContext(user, req), reportId, body);
  }

  @Get("audit-logs")
  @RateLimit(CHAT_RATE_LIMITS.admin)
  @ApiOperation({ summary: "Chat audit log (reading it is itself audited)" })
  auditLogs(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Query(new ZodValidationPipe(adminChatAuditQuerySchema)) query: AdminChatAuditQuery,
  ) {
    return this.admin.auditLogs(chatContext(user, req), query);
  }
}
