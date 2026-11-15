import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { type Response } from "express";
import {
  chatPinSchema,
  chatReactionSchema,
  chatSearchQuerySchema,
  editChatMessageSchema,
  listChatMessagesQuerySchema,
  markChatDeliveredSchema,
  markChatReadSchema,
  removeChatMessageSchema,
  reportChatMessageSchema,
  sendChatMessageSchema,
  type ChatPinRequest,
  type ChatReactionRequest,
  type ChatSearchQuery,
  type EditChatMessageRequest,
  type ListChatMessagesQuery,
  type MarkChatDeliveredRequest,
  type MarkChatReadRequest,
  type RemoveChatMessageRequest,
  type ReportChatMessageRequest,
  type SendChatMessageRequest,
} from "@dhruto/contracts";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { CHAT_RATE_LIMITS } from "./chat.config.js";
import { chatContext } from "./chat-request.js";
import { ZodValidationPipe } from "./pipes/zod-validation.pipe.js";
import { ChatCursorService } from "./services/chat-cursor.service.js";
import { ChatInteractionService } from "./services/chat-interaction.service.js";
import { ChatMessageService } from "./services/chat-message.service.js";
import { ChatSearchService } from "./services/chat-search.service.js";

/**
 * Messages, cursors, reactions, pins, reports and search. Sender identity
 * and sequence numbers are always server-assigned; request bodies are strict
 * (unknown keys such as `senderId` or `sequence` are rejected with 422).
 */
@ApiTags("Chat")
@ApiBearerAuth()
@UseGuards(RateLimitGuard)
@Controller("chat")
export class ChatMessagesController {
  constructor(
    private readonly messages: ChatMessageService,
    private readonly cursors: ChatCursorService,
    private readonly interactions: ChatInteractionService,
    private readonly searchService: ChatSearchService,
  ) {}

  /* ---------------- conversation-scoped ---------------- */

  @Post("conversations/:id/messages")
  @RateLimit(CHAT_RATE_LIMITS.send)
  @ApiOperation({ summary: "Send a message (idempotent per clientMessageId)" })
  async send(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Res({ passthrough: true }) res: Response,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(sendChatMessageSchema)) body: SendChatMessageRequest,
  ) {
    const result = await this.messages.send(chatContext(user, req), id, body);
    res.status(result.replayed ? HttpStatus.OK : HttpStatus.CREATED);
    return result.message;
  }

  @Get("conversations/:id/messages")
  @RateLimit(CHAT_RATE_LIMITS.read)
  @ApiOperation({ summary: "Keyset message history (beforeSequence / afterSequence)" })
  history(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(listChatMessagesQuerySchema)) query: ListChatMessagesQuery,
  ) {
    return this.messages.history(chatContext(user, req), id, query);
  }

  @Post("conversations/:id/read")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.cursor)
  @ApiOperation({ summary: "Advance the caller's read cursor (monotonic)" })
  markRead(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(markChatReadSchema)) body: MarkChatReadRequest,
  ) {
    return this.cursors.markRead(chatContext(user, req), id, body.lastReadSequence);
  }

  @Post("conversations/:id/delivered")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.cursor)
  @ApiOperation({ summary: "Advance the caller's delivered cursor (monotonic)" })
  markDelivered(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(markChatDeliveredSchema)) body: MarkChatDeliveredRequest,
  ) {
    return this.cursors.markDelivered(chatContext(user, req), id, body.lastDeliveredSequence);
  }

  @Get("conversations/:id/pins")
  @RateLimit(CHAT_RATE_LIMITS.read)
  @ApiOperation({ summary: "Pinned messages" })
  listPins(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.interactions.listPins(chatContext(user, req), id);
  }

  @Post("conversations/:id/pins")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.mutate)
  @ApiOperation({ summary: "Pin a message (owner/moderator)" })
  pin(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(chatPinSchema)) body: ChatPinRequest,
  ) {
    return this.interactions.pin(chatContext(user, req), id, body.messageId);
  }

  @Delete("conversations/:id/pins/:messageId")
  @RateLimit(CHAT_RATE_LIMITS.mutate)
  @ApiOperation({ summary: "Unpin a message (owner/moderator)" })
  unpin(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("messageId", ParseUUIDPipe) messageId: string,
  ) {
    return this.interactions.unpin(chatContext(user, req), id, messageId);
  }

  /* ---------------- message-scoped ---------------- */

  @Get("messages/:id")
  @RateLimit(CHAT_RATE_LIMITS.read)
  @ApiOperation({ summary: "Get one message (members only)" })
  getMessage(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.messages.get(chatContext(user, req), id);
  }

  @Patch("messages/:id")
  @RateLimit(CHAT_RATE_LIMITS.mutate)
  @ApiOperation({ summary: "Edit own message within the edit window" })
  edit(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(editChatMessageSchema)) body: EditChatMessageRequest,
  ) {
    return this.messages.edit(chatContext(user, req), id, body.content);
  }

  @Delete("messages/:id")
  @RateLimit(CHAT_RATE_LIMITS.mutate)
  @ApiOperation({ summary: "Soft-delete own message" })
  deleteOwn(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.messages.deleteOwn(chatContext(user, req), id);
  }

  @Post("messages/:id/remove")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.mutate)
  @ApiOperation({ summary: "Moderator removal (participant moderator or staff), reason required" })
  remove(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(removeChatMessageSchema)) body: RemoveChatMessageRequest,
  ) {
    return this.messages.removeByModerator(chatContext(user, req), id, body.reason);
  }

  @Post("messages/:id/reactions")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.react)
  @ApiOperation({ summary: "Add a reaction (idempotent)" })
  react(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(chatReactionSchema)) body: ChatReactionRequest,
  ) {
    return this.interactions.addReaction(chatContext(user, req), id, body.reaction);
  }

  @Delete("messages/:id/reactions/:reaction")
  @RateLimit(CHAT_RATE_LIMITS.react)
  @ApiOperation({ summary: "Remove own reaction" })
  unreact(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("reaction") reaction: string,
  ) {
    return this.interactions.removeReaction(chatContext(user, req), id, reaction);
  }

  @Post("messages/:id/reports")
  @RateLimit(CHAT_RATE_LIMITS.report)
  @ApiOperation({ summary: "Report a message (once per user)" })
  report(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reportChatMessageSchema)) body: ReportChatMessageRequest,
  ) {
    return this.interactions.report(chatContext(user, req), id, body);
  }

  /* ---------------- search ---------------- */

  @Get("search")
  @RateLimit(CHAT_RATE_LIMITS.search)
  @ApiOperation({ summary: "Full-text search across the caller's own conversations" })
  search(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Query(new ZodValidationPipe(chatSearchQuerySchema)) query: ChatSearchQuery,
  ) {
    return this.searchService.search(chatContext(user, req), query);
  }
}
