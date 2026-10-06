import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  Headers,
  Req,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
  ApiResponse,
} from "@nestjs/swagger";
import { FinanceService } from "./finance.service.js";
import {
  RequestPayoutDto,
  VerifyCashLedgerDto,
  ProcessPayoutDto,
  ApprovePayoutDto,
  CreateAdjustmentDto,
  ReverseTransactionDto,
  CreateSettlementBatchDto,
  ResolveDiscrepancyDto,
} from "./dto/finance.dto.js";
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
import {
  FinancialTransactionType,
  FinancialTransactionStatus,
  PayoutStatus,
  SettlementStatus,
  SettlementBatchStatus,
  WalletTransactionType,
} from "@dhruto/contracts";

function envelope(
  statusCode: number,
  message: string,
  data: unknown,
  req?: RequestWithId,
) {
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

async function requireMerchant(
  merchantsService: MerchantsService,
  user: AuthenticatedUser,
): Promise<string> {
  const profile = await merchantsService.findByUserId(user.id);
  if (!profile) {
    throw new NotFoundException({
      message: "No merchant profile found for this user",
      error: "MERCHANT_NOT_FOUND",
    });
  }
  return profile.id;
}

/**
 * Merchant-owned finance surface. Every route requires authentication plus
 * the merchant role (admins bypass via RolesGuard but still resolve no
 * merchant — these endpoints are strictly owner-scoped).
 */
@ApiTags("Finance")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.MERCHANT)
@Controller("finance")
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly merchantsService: MerchantsService,
  ) {}

  @Get("wallet/me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get current merchant wallet balance and stats",
    description: "Returns available balance, pending COD collections, and lifetime withdrawals.",
  })
  @ApiResponse({ status: 200, description: "Wallet retrieved." })
  @ApiResponse({ status: 401, description: "Authentication required." })
  @ApiResponse({ status: 403, description: "Merchant role required." })
  async getMyWallet(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await requireMerchant(this.merchantsService, user);
    const wallet = await this.financeService.getMerchantWallet(merchantId);
    return envelope(HttpStatus.OK, "Merchant wallet retrieved successfully", wallet, req);
  }

  @Get("wallet/transactions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get wallet transaction statement",
    description: "Paginated newest-first statement including COD credits, fees and payouts.",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "type", required: false, enum: WalletTransactionType })
  @ApiResponse({ status: 200, description: "Statement page." })
  async getWalletTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("type") type?: WalletTransactionType,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await requireMerchant(this.merchantsService, user);
    const wallet = await this.financeService.getOrCreateWallet(merchantId);
    const transactions = await this.financeService.getWalletTransactions(wallet.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : 50,
      type,
    });
    return envelope(HttpStatus.OK, "Transactions retrieved successfully", transactions, req);
  }

  @Post("payouts/request")
  @RateLimit({ limit: 10, windowSeconds: 60, scope: "payout-request" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Merchant requests payout withdrawal",
    description:
      "Reserves available balance through a balanced PAYOUT_RESERVATION posting. Accepts an Idempotency-Key: repeats replay the recorded request.",
  })
  @ApiHeader({ name: "Idempotency-Key", required: false, description: "Makes duplicate submissions safe" })
  @ApiResponse({ status: 200, description: "Payout requested." })
  @ApiResponse({ status: 400, description: "Insufficient balance." })
  @ApiResponse({ status: 409, description: "Key reused with another payload." })
  async requestPayout(
    @Body() dto: RequestPayoutDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    const merchantId = await requireMerchant(this.merchantsService, user);
    const payout = await this.financeService.requestPayout(
      merchantId,
      dto,
      user.id,
      idempotencyKey?.trim() || undefined,
    );
    return envelope(
      HttpStatus.OK,
      `Payout request for ৳${payout.amount} submitted successfully`,
      payout,
      req,
    );
  }

  @Get("payouts/me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get merchant payout withdrawal history" })
  @ApiResponse({ status: 200, description: "Payout history." })
  async getMyPayouts(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await requireMerchant(this.merchantsService, user);
    const payouts = await this.financeService.getMerchantPayouts(merchantId);
    return envelope(HttpStatus.OK, "Payouts retrieved successfully", payouts, req);
  }

  @Get("payouts/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get one merchant payout with masked destination" })
  @ApiResponse({ status: 200, description: "Payout detail." })
  @ApiResponse({ status: 404, description: "Payout not found for this merchant." })
  async getMyPayout(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await requireMerchant(this.merchantsService, user);
    const payout = await this.financeService.getMerchantPayout(merchantId, id);
    return envelope(HttpStatus.OK, "Payout retrieved successfully", payout, req);
  }

  @Post("payouts/:id/cancel")
  @RateLimit({ limit: 10, windowSeconds: 60, scope: "payout-cancel" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Merchant cancels a pending payout",
    description: "Only REQUESTED payouts can be cancelled; reserved funds are released through reversal postings.",
  })
  @ApiResponse({ status: 200, description: "Payout cancelled." })
  @ApiResponse({ status: 400, description: "Payout is no longer cancellable." })
  async cancelMyPayout(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await requireMerchant(this.merchantsService, user);
    const payout = await this.financeService.cancelPayout(merchantId, id);
    return envelope(HttpStatus.OK, "Payout cancelled and funds released", payout, req);
  }

  @Get("settlements/me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Merchant parcel settlements",
    description: "Per-parcel financial close: gross COD, fee snapshot, net payable and ledger reference.",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Settlement page." })
  async getMySettlements(
    @CurrentUser() user: AuthenticatedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await requireMerchant(this.merchantsService, user);
    const settlements = await this.financeService.getMerchantSettlements(merchantId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return envelope(HttpStatus.OK, "Settlements retrieved successfully", settlements, req);
  }

  @Get("settlements/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Merchant settlement statement detail" })
  @ApiResponse({ status: 200, description: "Settlement detail." })
  @ApiResponse({ status: 404, description: "Settlement not found for this merchant." })
  async getMySettlement(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const merchantId = await requireMerchant(this.merchantsService, user);
    const settlement = await this.financeService.getMerchantSettlement(merchantId, id);
    return envelope(HttpStatus.OK, "Settlement retrieved successfully", settlement, req);
  }
}

/**
 * Hub cash operations: hand-in batches and per-ledger verification.
 * Hub managers only ever see their assigned hubs; admins see everything.
 */
@ApiTags("Finance")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.ADMIN, UserRole.HUB_MANAGER)
@Controller("finance")
export class HubCashController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("reconciliation/pending")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List cash collections awaiting hub verification",
    description: "Hub-scoped: managers see only their own hubs.",
  })
  @ApiResponse({ status: 200, description: "Pending reconciliations." })
  async getPendingReconciliations(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const items = await this.financeService.getPendingReconciliations(user);
    return envelope(HttpStatus.OK, "Pending cash reconciliations retrieved successfully", items, req);
  }

  @Post("reconciliation/verify")
  @RateLimit({ limit: 60, windowSeconds: 60, scope: "cash-verify" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Hub verifies cash hand-in and settles to merchant wallet",
    description:
      "Locks the ledger row, preserves collected vs counted amounts, opens a discrepancy on mismatch, posts a balanced COD_SETTLEMENT and creates the parcel settlement.",
  })
  @ApiResponse({ status: 200, description: "Cash verified and settled." })
  @ApiResponse({ status: 400, description: "Already verified." })
  @ApiResponse({ status: 403, description: "Cash belongs to another hub." })
  @ApiResponse({ status: 409, description: "Already settled." })
  async verifyCashHandIn(
    @Body() dto: VerifyCashLedgerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.financeService.verifyCashHandIn(dto, user);
    return envelope(HttpStatus.OK, result.message, result, req);
  }

  @Get("cash-handins")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rider hand-in batches for the hub",
    description: "Batch custody records with server-computed expected totals and derived status.",
  })
  @ApiQuery({ name: "status", required: false, description: "SUBMITTED | VERIFIED | DISCREPANCY | RESOLVED" })
  @ApiResponse({ status: 200, description: "Hand-in batches." })
  async getHubHandIns(
    @CurrentUser() user: AuthenticatedUser,
    @Query("status") status?: string,
    @Req() req?: RequestWithId,
  ) {
    const batches = await this.financeService.getHubHandIns(user, { status });
    return envelope(HttpStatus.OK, "Hand-in batches retrieved successfully", batches, req);
  }

  @Get("reconciliation/summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "System financial reconciliation summary" })
  @ApiResponse({ status: 200, description: "Summary aggregates." })
  async getReconciliationSummary(@Req() req?: RequestWithId) {
    const summary = await this.financeService.getReconciliationSummary();
    return envelope(HttpStatus.OK, "Reconciliation summary retrieved successfully", summary, req);
  }

  @Get("discrepancies")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cash discrepancies needing review" })
  @ApiQuery({ name: "status", required: false, description: "OPEN | RESOLVED" })
  @ApiResponse({ status: 200, description: "Discrepancy list." })
  async listDiscrepancies(
    @CurrentUser() user: AuthenticatedUser,
    @Query("status") status?: string,
    @Req() req?: RequestWithId,
  ) {
    const rows = await this.financeService.listDiscrepancies(user, { status });
    return envelope(HttpStatus.OK, "Discrepancies retrieved successfully", rows, req);
  }
}

/**
 * Finance administration: payouts, settlements, adjustments, reversals,
 * reports and the automated reconciliation check.
 */
@ApiTags("Finance")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/finance")
export class FinanceAdminController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("overview")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Admin finance overview aggregates" })
  @ApiResponse({ status: 200, description: "Overview." })
  async getOverview(@Req() req?: RequestWithId) {
    const summary = await this.financeService.getReconciliationSummary();
    return envelope(HttpStatus.OK, "Finance overview retrieved successfully", summary, req);
  }

  @Get("payouts")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "All payout requests with filters" })
  @ApiQuery({ name: "merchantId", required: false })
  @ApiQuery({ name: "status", required: false, enum: PayoutStatus })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Payout page." })
  async listPayouts(
    @Query("merchantId") merchantId?: string,
    @Query("status") status?: PayoutStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.financeService.payoutReport({
      merchantId,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return envelope(HttpStatus.OK, "Payouts retrieved successfully", result, req);
  }

  @Post("payouts/:id/approve")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "payout-approve" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Approve a requested payout",
    description: "REQUESTED -> APPROVED. No money moves at approval; disbursement happens on process.",
  })
  @ApiResponse({ status: 200, description: "Payout approved." })
  @ApiResponse({ status: 400, description: "Payout is not approvable." })
  async approvePayout(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: ApprovePayoutDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const payout = await this.financeService.approvePayout(id, user.id, dto);
    return envelope(HttpStatus.OK, `Payout ${payout.payoutCode} approved`, payout, req);
  }

  @Post("payouts/:id/process")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "payout-process" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Execute a payout decision",
    description:
      "COMPLETED disburses reserved funds with a provider reference; FAILED/REJECTED release them back through reversal postings.",
  })
  @ApiResponse({ status: 200, description: "Decision recorded." })
  @ApiResponse({ status: 400, description: "Invalid transition for the current status." })
  async processPayout(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: ProcessPayoutDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const payout = await this.financeService.processPayout(id, dto, user.id);
    return envelope(HttpStatus.OK, `Payout marked as ${payout.status}`, payout, req);
  }

  @Get("settlements")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "All parcel settlements with filters" })
  @ApiQuery({ name: "merchantId", required: false })
  @ApiQuery({ name: "status", required: false, enum: SettlementStatus })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Settlement page." })
  async listSettlements(
    @Query("merchantId") merchantId?: string,
    @Query("status") status?: SettlementStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.financeService.listSettlements({
      merchantId,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return envelope(HttpStatus.OK, "Settlements retrieved successfully", result, req);
  }

  @Post("settlements/batches")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "settlement-batch" })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Group settled parcels into a reporting batch",
    description: "Batches never move money (funds release at verification); they group settlements for review and payout reference.",
  })
  @ApiResponse({ status: 201, description: "Batch created." })
  async createSettlementBatch(
    @Body() dto: CreateSettlementBatchDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const batch = await this.financeService.createSettlementBatch(user.id, dto);
    return envelope(HttpStatus.CREATED, "Settlement batch created", batch, req);
  }

  @Get("settlements/batches")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Settlement batches" })
  @ApiQuery({ name: "merchantId", required: false })
  @ApiQuery({ name: "status", required: false, enum: SettlementBatchStatus })
  @ApiResponse({ status: 200, description: "Batch page." })
  async listSettlementBatches(
    @Query("merchantId") merchantId?: string,
    @Query("status") status?: SettlementBatchStatus,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.financeService.listSettlementBatches({ merchantId, status });
    return envelope(HttpStatus.OK, "Settlement batches retrieved successfully", result, req);
  }

  @Post("settlements/batches/:id/complete")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "settlement-batch" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark a settlement batch reviewed and complete" })
  @ApiResponse({ status: 200, description: "Batch completed." })
  async completeSettlementBatch(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() req?: RequestWithId,
  ) {
    const batch = await this.financeService.completeSettlementBatch(id);
    return envelope(HttpStatus.OK, "Settlement batch completed", batch, req);
  }

  @Post("discrepancies/:id/resolve")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "discrepancy-resolve" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Resolve a cash discrepancy",
    description: "An optional recovery amount is posted back to the merchant wallet through the journal.",
  })
  @ApiResponse({ status: 200, description: "Discrepancy resolved." })
  async resolveDiscrepancy(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: ResolveDiscrepancyDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.financeService.resolveDiscrepancy(id, user.id, dto);
    return envelope(HttpStatus.OK, "Discrepancy resolved", result, req);
  }

  @Post("adjustments")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "finance-adjustment" })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a manual financial adjustment",
    description: "Requires a reason; posts balanced ADJUSTMENT entries and updates the materialized wallet atomically. Accepts an Idempotency-Key.",
  })
  @ApiResponse({ status: 201, description: "Adjustment posted." })
  async createAdjustment(
    @Body() dto: CreateAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    const transaction = await this.financeService.createAdjustment(
      user.id,
      dto,
      idempotencyKey?.trim() || undefined,
    );
    return envelope(HttpStatus.CREATED, "Adjustment posted", transaction, req);
  }

  @Post("transactions/:id/reverse")
  @RateLimit({ limit: 30, windowSeconds: 60, scope: "finance-reverse" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Reverse a posted transaction",
    description: "Posts mirror entries and marks the original REVERSED. The original is never edited.",
  })
  @ApiResponse({ status: 200, description: "Reversal posted." })
  @ApiResponse({ status: 400, description: "Transaction cannot be reversed." })
  async reverseTransaction(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: ReverseTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: RequestWithId,
  ) {
    const reversal = await this.financeService.reverseTransaction(user.id, id, dto);
    return envelope(HttpStatus.OK, "Reversal posted", reversal, req);
  }

  @Get("transactions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Journal explorer with entries" })
  @ApiQuery({ name: "type", required: false, enum: FinancialTransactionType })
  @ApiQuery({ name: "status", required: false, enum: FinancialTransactionStatus })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Journal page." })
  async listTransactions(
    @Query("type") type?: FinancialTransactionType,
    @Query("status") status?: FinancialTransactionStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.financeService.listFinancialTransactions({
      type,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return envelope(HttpStatus.OK, "Transactions retrieved successfully", result, req);
  }

  @Get("transactions/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Journal transaction with entries" })
  @ApiResponse({ status: 200, description: "Transaction detail." })
  async getTransaction(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() req?: RequestWithId,
  ) {
    const transaction = await this.financeService.getFinancialTransaction(id);
    return envelope(HttpStatus.OK, "Transaction retrieved successfully", transaction, req);
  }

  @Get("reports/cod")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "COD collection report (json or csv)" })
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  @ApiQuery({ name: "merchantId", required: false })
  @ApiQuery({ name: "hubId", required: false })
  @ApiQuery({ name: "riderId", required: false })
  @ApiQuery({ name: "format", required: false, enum: ["json", "csv"] })
  @ApiResponse({ status: 200, description: "COD report." })
  async codReport(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("merchantId") merchantId?: string,
    @Query("hubId") hubId?: string,
    @Query("riderId") riderId?: string,
    @Query("format") format?: "json" | "csv",
    @Req() req?: RequestWithId,
  ) {
    const result = await this.financeService.codReport({
      from,
      to,
      merchantId,
      hubId,
      riderId,
      page: 1,
      limit: 500,
    });
    if (format === "csv") {
      return toCsvResponse(
        result.items,
        ["settlementCode", "trackingCode", "merchantId", "grossMinor", "feeMinor", "netMinor", "status", "settledAt"],
        "cod-report.csv",
      );
    }
    return envelope(HttpStatus.OK, "COD report retrieved successfully", result, req);
  }

  @Get("reports/payouts")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Payout report (json or csv)" })
  @ApiQuery({ name: "merchantId", required: false })
  @ApiQuery({ name: "status", required: false, enum: PayoutStatus })
  @ApiQuery({ name: "format", required: false, enum: ["json", "csv"] })
  @ApiResponse({ status: 200, description: "Payout report." })
  async payoutReport(
    @Query("merchantId") merchantId?: string,
    @Query("status") status?: PayoutStatus,
    @Query("format") format?: "json" | "csv",
    @Req() req?: RequestWithId,
  ) {
    const result = await this.financeService.payoutReport({
      merchantId,
      status,
      page: 1,
      limit: 500,
    });
    if (format === "csv") {
      return toCsvResponse(
        result.items,
        ["payoutCode", "merchantId", "amount", "payoutMethod", "status", "transactionReference", "createdAt"],
        "payout-report.csv",
      );
    }
    return envelope(HttpStatus.OK, "Payout report retrieved successfully", result, req);
  }

  @Get("reports/fees")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Fee revenue report per day" })
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  @ApiResponse({ status: 200, description: "Fee report." })
  async feeReport(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.financeService.feeReport({ from, to });
    return envelope(HttpStatus.OK, "Fee report retrieved successfully", result, req);
  }

  @Get("reconciliation/check")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Automated ledger-vs-wallet reconciliation check",
    description:
      "Compares ledger-derived merchant balances against materialized wallets, rider cash positions, settlement math and journal balance per transaction. Reports mismatches; never repairs.",
  })
  @ApiQuery({ name: "merchantId", required: false })
  @ApiResponse({ status: 200, description: "Reconciliation verdict." })
  async reconciliationCheck(
    @Query("merchantId") merchantId?: string,
    @Req() req?: RequestWithId,
  ) {
    const result = await this.financeService.reconciliationCheck(merchantId);
    return envelope(
      HttpStatus.OK,
      result.ok ? "All financial invariants hold" : "Reconciliation mismatches found",
      result,
      req,
    );
  }
}

function toCsvResponse(
  rows: object[],
  columns: string[],
  filename: string,
) {
  const escape = (value: unknown): string => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => escape((row as Record<string, unknown>)[column])).join(","),
    ),
  ];
  return {
    success: true,
    statusCode: HttpStatus.OK,
    message: `${rows.length} rows exported`,
    data: { filename, csv: lines.join("\n") },
    meta: { requestId: "csv-export", timestamp: new Date().toISOString() },
  };
}
