import {
  Controller,
  Get,
  Post,
  Delete,
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
import { WebhooksService } from "./webhooks.service.js";
import {
  CreateWebhookSubscriptionDto,
} from "./dto/webhook.dto.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { CustomJwtService } from "../auth/jwt/custom-jwt.service.js";
import { MerchantsService } from "../merchants/merchants.service.js";
import { WebhookDeliveryStatus } from "@dhruto/contracts";

@ApiTags("Webhooks")
@ApiBearerAuth("JWT-auth")
@Controller("webhooks")
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
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

    const authHeader = req?.headers?.authorization;
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

  @Get("subscriptions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List all webhook subscriptions for merchant" })
  async listSubscriptions(
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const subscriptions = await this.webhooksService.listSubscriptions(merchantId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Webhook subscriptions retrieved successfully",
      data: subscriptions,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("subscriptions")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new webhook subscription" })
  async createSubscription(
    @Body() dto: CreateWebhookSubscriptionDto,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const subscription = await this.webhooksService.createSubscription(merchantId, dto);

    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: "Webhook subscription registered successfully",
      data: subscription,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Delete("subscriptions/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a webhook subscription" })
  async deleteSubscription(
    @Param("id") id: string,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    await this.webhooksService.deleteSubscription(id, merchantId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Webhook subscription deleted successfully",
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("subscriptions/:id/ping")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Test dispatch an immediate ping event to webhook" })
  async pingSubscription(
    @Param("id") id: string,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const delivery = await this.webhooksService.pingSubscription(id, merchantId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: `Ping dispatched to webhook URL (Status: ${delivery.status})`,
      data: delivery,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("deliveries")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List recent webhook deliveries and dead-letters" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: WebhookDeliveryStatus })
  async listDeliveries(
    @CurrentUser() user?: AuthenticatedUser,
    @Query("limit") limit?: number,
    @Query("status") status?: WebhookDeliveryStatus,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const deliveries = await this.webhooksService.listDeliveries(
      merchantId,
      limit ? Number(limit) : 50,
      status,
    );

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Webhook deliveries retrieved successfully",
      data: deliveries,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("deliveries/:id/retry")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Manually re-attempt a failed or dead-letter delivery" })
  async retryDelivery(
    @Param("id") id: string,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const delivery = await this.webhooksService.retryDelivery(id, merchantId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: `Delivery re-attempted (Status: ${delivery.status})`,
      data: delivery,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
