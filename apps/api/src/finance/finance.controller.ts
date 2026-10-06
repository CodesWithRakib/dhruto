import {
  Controller,
  Get,
  Post,
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
import { FinanceService } from "./finance.service.js";
import {
  RequestPayoutDto,
  VerifyCashLedgerDto,
  ProcessPayoutDto,
} from "./dto/finance.dto.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";
import { MerchantsService } from "../merchants/merchants.service.js";

import { CustomJwtService } from "../auth/jwt/custom-jwt.service.js";

@ApiTags("Finance")
@ApiBearerAuth("JWT-auth")
@Controller("finance")
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly merchantsService: MerchantsService,
    private readonly jwtService: CustomJwtService,
  ) {}

  /**
   * Helper to resolve merchant ID for authenticated user or demo fallback.
   */
  private async resolveMerchantId(
    user?: AuthenticatedUser,
    req?: RequestWithId,
  ): Promise<string> {
    if (user?.id) {
      const profile = await this.merchantsService.findByUserId(user.id);
      if (profile) {
        return profile.id;
      }
    }

    const authHeader = req?.headers?.authorization;
    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const payload = this.jwtService.verifyAccessToken(token);
        if (payload?.sub) {
          const profile = await this.merchantsService.findByUserId(payload.sub);
          if (profile) {
            return profile.id;
          }
        }
      } catch {
        // Fall back to default
      }
    }

    // Fallback to first merchant in database for unauthenticated or hub terminal requests
    const defaultMerchant = await this.merchantsService.getDefaultMerchant();
    if (!defaultMerchant) {
      throw new NotFoundException("No merchant profile found");
    }
    return defaultMerchant.id;
  }

  @Get("wallet/me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get current merchant wallet balance and stats",
    description: "Returns available balance, pending COD collections, and lifetime withdrawals.",
  })
  async getMyWallet(
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const wallet = await this.financeService.getMerchantWallet(merchantId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Merchant wallet retrieved successfully",
      data: wallet,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("wallet/transactions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get wallet transaction statement",
    description: "Returns chronological ledger entries including COD credits, delivery fee debits, and payouts.",
  })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getWalletTransactions(
    @CurrentUser() user?: AuthenticatedUser,
    @Query("limit") limit?: number,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const wallet = await this.financeService.getOrCreateWallet(merchantId);
    const transactions = await this.financeService.getWalletTransactions(
      wallet.id,
      limit ? Number(limit) : 50,
    );

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Transactions retrieved successfully",
      data: transactions,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("payouts/request")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Merchant requests payout withdrawal",
    description: "Deducts available balance and queues payout request.",
  })
  async requestPayout(
    @Body() dto: RequestPayoutDto,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const payout = await this.financeService.requestPayout(merchantId, dto);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: `Payout request for ৳${payout.amount} submitted successfully`,
      data: payout,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("payouts/me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get merchant payout withdrawal history",
  })
  async getMyPayouts(
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await this.resolveMerchantId(user, req);
    const payouts = await this.financeService.getMerchantPayouts(merchantId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Payouts retrieved successfully",
      data: payouts,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("reconciliation/pending")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List all pending rider cash hand-in records",
    description: "Returns collected COD entries waiting for Hub Manager verification and merchant settlement.",
  })
  async getPendingReconciliations(@Req() req?: RequestWithId) {
    const items = await this.financeService.getPendingReconciliations();

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Pending cash reconciliations retrieved successfully",
      data: items,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("reconciliation/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Hub Manager verifies cash hand-in and settles to merchant wallet",
    description: "Transitions cash ledger to VERIFIED and automatically credits net settlement to merchant wallet.",
  })
  async verifyCashHandIn(
    @Body() dto: VerifyCashLedgerDto,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const userId = user?.id || "00000000-0000-0000-0000-000000000000";
    const result = await this.financeService.verifyCashHandIn(dto, userId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("payouts/:id/process")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Admin approves or rejects a payout request",
  })
  async processPayout(
    @Param("id") id: string,
    @Body() dto: ProcessPayoutDto,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const userId = user?.id || "00000000-0000-0000-0000-000000000000";
    const payout = await this.financeService.processPayout(id, dto, userId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: `Payout marked as ${payout.status}`,
      data: payout,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("reconciliation/summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Overall system financial reconciliation summary",
  })
  async getReconciliationSummary(@Req() req?: RequestWithId) {
    const summary = await this.financeService.getReconciliationSummary();

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Reconciliation summary retrieved successfully",
      data: summary,
      meta: {
        requestId: req?.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
