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
import { createChatAttachmentSchema, type CreateChatAttachmentRequest } from "@dhruto/contracts";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import { type AuthenticatedUser } from "../../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../../common/middleware/request-id.middleware.js";
import { RateLimit } from "../../common/rate-limit/rate-limit.decorator.js";
import { RateLimitGuard } from "../../common/rate-limit/rate-limit.guard.js";
import { CHAT_RATE_LIMITS } from "../chat.config.js";
import { chatContext } from "../chat-request.js";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe.js";
import { ChatAttachmentService } from "./chat-attachment.service.js";

/**
 * Attachment upload lifecycle and authorized downloads (Phase 6). Thin
 * controller: access decisions (membership, live eligibility, capability,
 * ownership, status) live in ChatAttachmentService. Any authenticated role
 * may call these routes; there is no implicit ADMIN access.
 */
@ApiTags("Chat attachments")
@ApiBearerAuth()
@UseGuards(RateLimitGuard)
@Controller("chat")
export class ChatAttachmentsController {
  constructor(private readonly attachments: ChatAttachmentService) {}

  @Post("conversations/:id/attachments")
  @RateLimit(CHAT_RATE_LIMITS.upload)
  @ApiOperation({
    summary: "Reserve an attachment upload",
    description:
      "Validates membership (SEND_MESSAGE, writable conversation) and the upload policy, creates a PENDING attachment and returns a short-lived presigned PUT for a server-generated key.",
  })
  reserve(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) conversationId: string,
    @Body(new ZodValidationPipe(createChatAttachmentSchema)) body: CreateChatAttachmentRequest,
  ) {
    return this.attachments.reserve(chatContext(user, req), conversationId, body);
  }

  @Post("attachments/:id/complete")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.upload)
  @ApiOperation({
    summary: "Complete an upload",
    description:
      "Server verifies the stored object (exact size, SHA-256, file signature). UPLOADED on success, REJECTED otherwise. Idempotent.",
  })
  complete(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.attachments.complete(chatContext(user, req), id);
  }

  @Delete("attachments/:id")
  @RateLimit(CHAT_RATE_LIMITS.upload)
  @ApiOperation({ summary: "Cancel an unsent attachment (uploader only)" })
  cancel(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.attachments.cancel(chatContext(user, req), id);
  }

  @Get("attachments/:id/download")
  @RateLimit(CHAT_RATE_LIMITS.download)
  @ApiOperation({
    summary: "Authorized short-lived download URL",
    description:
      "Current eligible participants only; the attachment must be verified and its message not deleted (or, before sending, the caller must be the uploader). `?download=true` forces Content-Disposition: attachment.",
  })
  download(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("download") download?: string,
  ) {
    return this.attachments.download(chatContext(user, req), id, {
      forceDownload: download === "true",
    });
  }
}
