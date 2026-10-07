import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
  ParseUUIDPipe,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service.js";
import { TestSmsDto, UpdatePreferencesDto } from "./dto/notification.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { UserRole } from "../database/entities/index.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";
import { MerchantsService } from "../merchants/merchants.service.js";
import { NotificationChannel, NotificationType } from "@dhruto/contracts";

function envelope(statusCode: number, message: string, data: unknown, req?: RequestWithId) {
  return {
    success: true,
    statusCode,
    message,
    data,
    meta: {
      requestId: req?.requestId || "unknown",
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Notification center API. Every route requires authentication; the
 * recipient scope is derived from the session (merchant owners read
 * merchant rows, everyone else reads their own user rows) — never from
 * client-supplied ids, and never via a default-merchant fallback.
 */
@ApiTags("Notifications")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.MERCHANT, UserRole.RIDER, UserRole.HUB_MANAGER, UserRole.ADMIN)
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly merchantsService: MerchantsService,
  ) {}

  private async resolveScope(user: AuthenticatedUser): Promise<{
    merchantId?: string;
    userId?: string;
  }> {
    if (user.role === UserRole.MERCHANT) {
      const profile = await this.merchantsService.findByUserId(user.id);
      if (!profile) {
        throw new NotFoundException({
          message: "No merchant profile found for this user",
          error: "MERCHANT_NOT_FOUND",
        });
      }
      return { merchantId: profile.id };
    }
    return { userId: user.id };
  }

  @Get("me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Notification center list (paginated, newest first)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "unreadOnly", required: false, type: Boolean })
  @ApiResponse({ status: 200, description: "Notification page." })
  async getMyNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: number,
    @Query("unreadOnly") unreadOnly?: boolean,
    @Req() req?: RequestWithId,
  ) {
    const scope = await this.resolveScope(user);
    const result = await this.notificationsService.getNotifications(scope, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      unreadOnly: unreadOnly === true || String(unreadOnly) === "true",
    });
    return envelope(HttpStatus.OK, "Notifications retrieved successfully", result, req);
  }

  @Get("unread-count")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unread notification count for the bell" })
  @ApiResponse({ status: 200, description: "Unread count." })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser, @Req() req?: RequestWithId) {
    const scope = await this.resolveScope(user);
    const count = await this.notificationsService.getUnreadCount(scope);
    return envelope(
      HttpStatus.OK,
      "Unread count retrieved successfully",
      { unreadCount: count },
      req,
    );
  }

  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark a notification as read" })
  @ApiResponse({ status: 200, description: "Marked as read." })
  @ApiResponse({ status: 404, description: "Notification not found for this recipient." })
  async markAsRead(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const scope = await this.resolveScope(user);
    const notification = await this.notificationsService.markAsRead(id, scope);
    return envelope(HttpStatus.OK, "Notification marked as read", notification, req);
  }

  @Post("read-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark all notifications as read" })
  @ApiResponse({ status: 200, description: "Marked all as read." })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser, @Req() req?: RequestWithId) {
    const scope = await this.resolveScope(user);
    const result = await this.notificationsService.markAllAsRead(scope);
    return envelope(
      HttpStatus.OK,
      `Marked ${result.updatedCount} notifications as read`,
      result,
      req,
    );
  }

  @Get("preferences")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Notification channel preferences",
    description: "Financial and security categories are locked on and cannot be disabled.",
  })
  @ApiResponse({ status: 200, description: "Preference matrix." })
  async getPreferences(@CurrentUser() user: AuthenticatedUser, @Req() req?: RequestWithId) {
    const scope = await this.resolveScope(user);
    const preferences = await this.notificationsService.getPreferences(scope);
    return envelope(HttpStatus.OK, "Preferences retrieved successfully", preferences, req);
  }

  @Post("preferences")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "notif-preferences" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update notification channel preferences" })
  @ApiResponse({ status: 200, description: "Preferences updated." })
  @ApiResponse({ status: 403, description: "Locked category cannot be disabled." })
  async setPreferences(
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const scope = await this.resolveScope(user);
    const preferences = await this.notificationsService.setPreferences(scope, dto);
    return envelope(HttpStatus.OK, "Preferences updated successfully", preferences, req);
  }

  @Post("test-sms")
  @RateLimit({ limit: 5, windowSeconds: 60, scope: "notif-test-sms" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Send an immediate test SMS",
    description:
      "Rate-limited. The attempt is persisted before transport, honestly reported after.",
  })
  @ApiResponse({ status: 200, description: "Test SMS attempted." })
  @ApiResponse({ status: 429, description: "Too many test sends." })
  async testSms(
    @Body() dto: TestSmsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const scope = await this.resolveScope(user);
    const notification = await this.notificationsService.dispatchDirect({
      merchantId: scope.merchantId,
      userId: scope.userId,
      channel: NotificationChannel.SMS,
      type: NotificationType.SYSTEM,
      title: "Test SMS Notification",
      message: dto.message,
      recipientTarget: dto.phone,
    });

    return envelope(HttpStatus.OK, "Test SMS dispatched successfully", notification, req);
  }
}
