import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { WebhooksService } from "./webhooks.service.js";
import { CreateWebhookSubscriptionDto, UpdateWebhookSubscriptionDto } from "./dto/webhook.dto.js";
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
import { WebhookDeliveryStatus } from "@dhruto/contracts";

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
 * Merchant webhook surface. Authenticated + merchant role required; the
 * merchant is always resolved from the session — there is no fallback, so
 * anonymous callers can never reach another merchant's integrations.
 */
@ApiTags("Webhooks")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.MERCHANT)
@Controller("webhooks")
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly merchantsService: MerchantsService,
  ) {}

  private async resolveMerchantId(user: AuthenticatedUser): Promise<string> {
    const profile = await this.merchantsService.findByUserId(user.id);
    if (!profile) {
      throw new NotFoundException({
        message: "No merchant profile found for this user",
        error: "MERCHANT_NOT_FOUND",
      });
    }
    return profile.id;
  }

  @Get("subscriptions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List webhook subscriptions (secrets masked)",
    description: "Full secrets are returned only once, on create/rotate responses.",
  })
  @ApiResponse({ status: 200, description: "Subscriptions." })
  async listSubscriptions(@CurrentUser() user: AuthenticatedUser, @Req() req?: RequestWithId) {
    const merchantId = await this.resolveMerchantId(user);
    const subscriptions = await this.webhooksService.listSubscriptions(merchantId);
    return envelope(
      HttpStatus.OK,
      "Webhook subscriptions retrieved successfully",
      subscriptions,
      req,
    );
  }

  @Post("subscriptions")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "webhook-create" })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a webhook subscription",
    description:
      "The endpoint URL is SSRF-validated. The full signing secret is returned exactly once in this response.",
  })
  @ApiResponse({ status: 201, description: "Subscription created (secret shown once)." })
  @ApiResponse({ status: 400, description: "URL rejected or unknown event." })
  async createSubscription(
    @Body() dto: CreateWebhookSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user);
    const subscription = await this.webhooksService.createSubscription(merchantId, dto);
    return envelope(
      HttpStatus.CREATED,
      "Webhook subscription registered successfully",
      subscription,
      req,
    );
  }

  @Patch("subscriptions/:id")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "webhook-update" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update URL, events, status or description",
    description: "URL changes re-run SSRF validation. Secrets never change here.",
  })
  @ApiResponse({ status: 200, description: "Subscription updated." })
  @ApiResponse({ status: 404, description: "Subscription not found for this merchant." })
  async updateSubscription(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user);
    const subscription = await this.webhooksService.updateSubscription(id, merchantId, dto);
    return envelope(HttpStatus.OK, "Webhook subscription updated successfully", subscription, req);
  }

  @Post("subscriptions/:id/rotate-secret")
  @RateLimit({ limit: 10, windowSeconds: 60, scope: "webhook-rotate" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rotate the signing secret",
    description: "The new full secret is returned exactly once and never logged.",
  })
  @ApiResponse({ status: 200, description: "Secret rotated (shown once)." })
  async rotateSecret(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user);
    const result = await this.webhooksService.rotateSecret(id, merchantId);
    return envelope(HttpStatus.OK, result.message, result, req);
  }

  @Delete("subscriptions/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a webhook subscription" })
  @ApiResponse({ status: 200, description: "Deleted." })
  async deleteSubscription(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user);
    await this.webhooksService.deleteSubscription(id, merchantId);
    return envelope(HttpStatus.OK, "Webhook subscription deleted successfully", null, req);
  }

  @Post("subscriptions/:id/ping")
  @RateLimit({ limit: 10, windowSeconds: 60, scope: "webhook-ping" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Send a synthetic test ping",
    description: "Clearly marked synthetic event; creates no parcel or financial state.",
  })
  @ApiResponse({ status: 200, description: "Ping dispatched." })
  async pingSubscription(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user);
    const delivery = await this.webhooksService.pingSubscription(id, merchantId);
    return envelope(
      HttpStatus.OK,
      `Ping dispatched to webhook URL (Status: ${delivery.status})`,
      delivery,
      req,
    );
  }

  @Get("deliveries")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Webhook deliveries with filters (paginated)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: WebhookDeliveryStatus })
  @ApiResponse({ status: 200, description: "Delivery page." })
  async listDeliveries(
    @CurrentUser() user: AuthenticatedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: number,
    @Query("status") status?: WebhookDeliveryStatus,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user);
    const deliveries = await this.webhooksService.listDeliveries(merchantId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      status,
    });
    return envelope(HttpStatus.OK, "Webhook deliveries retrieved successfully", deliveries, req);
  }

  @Post("deliveries/:id/retry")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "webhook-retry" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Re-attempt a failed or dead-letter delivery" })
  @ApiResponse({ status: 200, description: "Re-attempted." })
  async retryDelivery(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user);
    const delivery = await this.webhooksService.retryDelivery(id, merchantId);
    return envelope(
      HttpStatus.OK,
      `Delivery re-attempted (Status: ${delivery.status})`,
      delivery,
      req,
    );
  }
}
