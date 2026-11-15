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
  addChatParticipantSchema,
  chatStatusActionSchema,
  createChatConversationSchema,
  listChatConversationsQuerySchema,
  removeChatParticipantSchema,
  updateChatConversationSchema,
  type AddChatParticipantRequest,
  type ChatStatusActionRequest,
  type CreateChatConversationRequest,
  type ListChatConversationsQuery,
  type RemoveChatParticipantRequest,
  type UpdateChatConversationRequest,
} from "@dhruto/contracts";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { CHAT_RATE_LIMITS } from "./chat.config.js";
import { chatContext } from "./chat-request.js";
import { ZodValidationPipe } from "./pipes/zod-validation.pipe.js";
import {
  ChatConversationService,
  type ChatStatusAction,
} from "./services/chat-conversation.service.js";
import { ChatParticipantService } from "./services/chat-participant.service.js";

/**
 * Conversations and participants. Any authenticated role may call these
 * routes; access is decided per conversation by ChatAuthorizationService
 * (membership + live scope eligibility, or an audited staff permission).
 * RolesGuard's ADMIN bypass therefore grants nothing here.
 */
@ApiTags("Chat")
@ApiBearerAuth()
@UseGuards(RateLimitGuard)
@Controller("chat/conversations")
export class ChatConversationsController {
  constructor(
    private readonly conversations: ChatConversationService,
    private readonly participants: ChatParticipantService,
  ) {}

  @Post()
  @RateLimit(CHAT_RATE_LIMITS.createConversation)
  @ApiOperation({ summary: "Create a conversation, or get the existing one for idempotent types" })
  async create(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodValidationPipe(createChatConversationSchema)) body: CreateChatConversationRequest,
  ) {
    const result = await this.conversations.create(chatContext(user, req), body);
    res.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result.conversation;
  }

  @Get()
  @RateLimit(CHAT_RATE_LIMITS.read)
  @ApiOperation({ summary: "List the caller's conversations (keyset paginated)" })
  list(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Query(new ZodValidationPipe(listChatConversationsQuerySchema))
    query: ListChatConversationsQuery,
  ) {
    return this.conversations.list(chatContext(user, req), query);
  }

  @Get(":id")
  @RateLimit(CHAT_RATE_LIMITS.read)
  @ApiOperation({ summary: "Conversation detail (members only)" })
  detail(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.conversations.getDetail(chatContext(user, req), id);
  }

  @Patch(":id")
  @RateLimit(CHAT_RATE_LIMITS.mutate)
  @ApiOperation({ summary: "Rename a conversation (owner/moderator)" })
  update(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateChatConversationSchema)) body: UpdateChatConversationRequest,
  ) {
    return this.conversations.updateTitle(chatContext(user, req), id, body.title);
  }

  /* Lifecycle transitions. lock/unlock always require staff permission + reason. */

  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.mutate)
  @ApiOperation({ summary: "Archive (owner/moderator, or staff with reason)" })
  archive(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(chatStatusActionSchema)) body: ChatStatusActionRequest,
  ) {
    return this.transition(user, req, id, "archive", body);
  }

  @Post(":id/close")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.mutate)
  @ApiOperation({ summary: "Close (owner/moderator, or staff with reason)" })
  close(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(chatStatusActionSchema)) body: ChatStatusActionRequest,
  ) {
    return this.transition(user, req, id, "close", body);
  }

  @Post(":id/reopen")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.mutate)
  @ApiOperation({ summary: "Reopen an archived/closed conversation" })
  reopen(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(chatStatusActionSchema)) body: ChatStatusActionRequest,
  ) {
    return this.transition(user, req, id, "reopen", body);
  }

  @Post(":id/lock")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.mutate)
  @ApiOperation({ summary: "Lock (staff moderation permission + reason)" })
  lock(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(chatStatusActionSchema)) body: ChatStatusActionRequest,
  ) {
    return this.transition(user, req, id, "lock", body);
  }

  @Post(":id/unlock")
  @HttpCode(HttpStatus.OK)
  @RateLimit(CHAT_RATE_LIMITS.mutate)
  @ApiOperation({ summary: "Unlock (staff moderation permission + reason)" })
  unlock(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(chatStatusActionSchema)) body: ChatStatusActionRequest,
  ) {
    return this.transition(user, req, id, "unlock", body);
  }

  private transition(
    user: AuthenticatedUser | null,
    req: RequestWithId,
    id: string,
    action: ChatStatusAction,
    body: ChatStatusActionRequest,
  ) {
    return this.conversations.changeStatus(chatContext(user, req), id, action, body.reason);
  }

  @Get(":id/participants")
  @RateLimit(CHAT_RATE_LIMITS.read)
  @ApiOperation({ summary: "Active participants (members only)" })
  listParticipants(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.participants.list(chatContext(user, req), id);
  }

  @Post(":id/participants")
  @RateLimit(CHAT_RATE_LIMITS.participants)
  @ApiOperation({ summary: "Add a participant (owner/moderator, or staff with reason)" })
  addParticipant(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(addChatParticipantSchema)) body: AddChatParticipantRequest,
  ) {
    return this.participants.add(chatContext(user, req), id, body);
  }

  @Delete(":id/participants/:userId")
  @RateLimit(CHAT_RATE_LIMITS.participants)
  @ApiOperation({ summary: "Leave (self) or remove a participant" })
  removeParticipant(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body(new ZodValidationPipe(removeChatParticipantSchema)) body: RemoveChatParticipantRequest,
  ) {
    return this.participants.remove(chatContext(user, req), id, userId, body.reason);
  }
}
