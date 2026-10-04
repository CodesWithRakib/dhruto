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
  Req,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { CustomJwtService } from "../auth/jwt/custom-jwt.service.js";
import { MerchantsService } from "../merchants/merchants.service.js";
import { NotificationChannel, NotificationType } from "@dhruto/contracts";

@ApiTags("Notifications")
@ApiBearerAuth("JWT-auth")
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly merchantsService: MerchantsService,
    private readonly jwtService: CustomJwtService,
  ) {}

  private async resolveMerchantId(
    user?: AuthenticatedUser,
    req?: RequestWithId,
  ): Promise<string> {
    if (user?.id) {
      const profile = await this.merchantsService.findByUserId(user.id);
      if (profile) return profile.id;
    }

    const authHeader = (req as any)?.headers?.authorization;
    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const payload = this.jwtService.verifyAccessToken(token);
        if (payload?.sub) {
          const profile = await this.merchantsService.findByUserId(payload.sub);
          if (profile) return profile.id;
        }
      } catch {
        // Fall back to default
      }
    }

    const defaultMerchant = await this.merchantsService.getDefaultMerchant();
    if (!defaultMerchant) {
      throw new NotFoundException("No merchant profile found");
    }
    return defaultMerchant.id;
  }

  @Get("me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get current merchant in-app notifications" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "unreadOnly", required: false, type: Boolean })
  async getMyNotifications(
    @CurrentUser() user?: AuthenticatedUser,
    @Query("limit") limit?: number,
    @Query("unreadOnly") unreadOnly?: boolean,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const notifications = await this.notificationsService.getMerchantNotifications(
      merchantId,
      limit ? Number(limit) : 20,
      unreadOnly === true || String(unreadOnly) === "true",
    );

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Notifications retrieved successfully",
      data: notifications,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("unread-count")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get unread notification count for merchant" })
  async getUnreadCount(
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const count = await this.notificationsService.getUnreadCount(merchantId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Unread count retrieved successfully",
      data: { unreadCount: count },
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark a notification as read" })
  async markAsRead(
    @Param("id") id: string,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const notification = await this.notificationsService.markAsRead(id, merchantId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Notification marked as read",
      data: notification,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("read-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark all merchant notifications as read" })
  async markAllAsRead(
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const result = await this.notificationsService.markAllAsRead(merchantId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: `Marked ${result.updatedCount} notifications as read`,
      data: result,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("test-sms")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Dispatch simulated SMS notification" })
  async testSms(
    @Body() dto: { phone: string; message: string },
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const notification = await this.notificationsService.createNotification({
      merchantId,
      channel: NotificationChannel.SMS,
      type: NotificationType.SYSTEM,
      title: "Test SMS Notification",
      message: dto.message || "Dhruto Express: Test SMS notification delivery confirmed.",
      recipientTarget: dto.phone || "01700000000",
    });

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Test SMS dispatched successfully",
      data: notification,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
