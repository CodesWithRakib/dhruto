import { Controller, Get, Patch, Body, UseGuards, HttpCode, HttpStatus, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from "@nestjs/swagger";
import { MerchantsService } from "./merchants.service.js";
import { UpdateMerchantDto } from "./dto/update-merchant.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { UserRole } from "../database/entities/User.entity.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";

@ApiTags("Merchants")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("merchants")
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get("me")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get current merchant profile",
    description: "Returns profile details for the authenticated merchant.",
  })
  @ApiOkResponse({ description: "Merchant profile retrieved successfully" })
  async getProfile(@CurrentUser() user: AuthenticatedUser, @Req() req: RequestWithId) {
    const profile = await this.merchantsService.getProfile(user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Merchant profile retrieved successfully",
      data: profile,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Patch("me")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update current merchant profile",
    description: "Updates business name, contact phone, or pickup address.",
  })
  @ApiOkResponse({ description: "Merchant profile updated successfully" })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMerchantDto,
    @Req() req: RequestWithId,
  ) {
    const updated = await this.merchantsService.updateProfile(user.id, dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Merchant profile updated successfully",
      data: updated,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("me/dashboard")
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get merchant dashboard metrics",
    description: "Returns order counts, status breakdowns, financial sums, and recent bookings.",
  })
  @ApiOkResponse({ description: "Merchant dashboard metrics retrieved successfully" })
  async getDashboard(@CurrentUser() user: AuthenticatedUser, @Req() req: RequestWithId) {
    const data = await this.merchantsService.getDashboardStats(user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Dashboard metrics retrieved successfully",
      data,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
