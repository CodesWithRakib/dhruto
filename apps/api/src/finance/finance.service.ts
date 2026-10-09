import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  HttpStatus,
  Logger,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager, In, QueryFailedError } from "typeorm";
import {
  Wallet,
  WalletTransaction,
  PayoutRequest,
  CashLedger,
  Parcel,
  ParcelStatus,
  ParcelStatusHistory,
  Settlement,
  SettlementBatch,
  SettlementBatchStatus,
  SettlementStatus,
  CashHandIn,
  CashHandInItem,
  CashDiscrepancy,
  FinancialTransaction,
  FinancialTransactionType,
  FinancialTransactionStatus,
  FinancialAccount,
  EntryDirection,
  HubUserAssignment,
} from "../database/entities/index.js";
import {
  DomainEventPublisher,
  PayoutRequestedEvent,
  PayoutApprovedEvent,
  PayoutCompletedEvent,
  PayoutFailedEvent,
  CashVerifiedEvent,
  SettlementCreatedEvent,
  DiscrepancyOpenedEvent,
} from "../events/index.js";
import { CashHandInStatus } from "../database/entities/CashLedger.entity.js";
import {
  WalletTransactionType,
  PayoutStatus,
  maskAccountNumber,
  type RequestPayoutDto,
  type VerifyCashLedgerDto,
  type ProcessPayoutDto,
  type ApprovePayoutDto,
  type CreateAdjustmentDto,
  type ReverseTransactionDto,
  type CreateSettlementBatchDto,
  type ResolveDiscrepancyDto,
  type MerchantWalletData,
  type WalletTransactionItem,
  type PayoutRequestItem,
  type PendingReconciliationItem,
  type SettlementItem,
  type SettlementBatchItem,
  type CashHandInBatchItem,
  type FinancialTransactionItem,
  type ReconciliationCheckResult,
  CashDiscrepancyStatus as DiscrepancyStatus,
  CashDiscrepancyType as DiscrepancyType,
  CashHandInStatus as BatchStatus,
  DomainEventType,
} from "@dhruto/contracts";
import { toMinor, toMajor, netPayableMinor, CURRENCY_BDT } from "../common/money/money.js";
import { LedgerService } from "./ledger/ledger.service.js";
import {
  IdempotencyClaimConflict,
  IdempotencyService,
} from "../common/idempotency/idempotency.service.js";
import { OutboxService } from "../integrations/outbox.service.js";
import { UserRole } from "../database/entities/index.js";

/** Account details as returned by the API contract (masked). */
type PayoutAccountDetails = PayoutRequestItem["accountDetails"];

/**
 * Narrows the persisted JSONB account details into the response contract.
 * Only the masked number ever leaves the server.
 */
function toPayoutAccountDetails(raw: Record<string, unknown>): PayoutAccountDetails {
  const readString = (key: string): string | undefined => {
    const value = raw[key];
    return typeof value === "string" ? value : undefined;
  };
  const full = readString("accountNumber") ?? "";

  return {
    accountNumber: full ? maskAccountNumber(full) : "",
    accountType: readString("accountType"),
    bankName: readString("bankName"),
    branchName: readString("branchName"),
    accountHolderName: readString("accountHolderName"),
  };
}

function toPayoutItem(payout: PayoutRequest): PayoutRequestItem {
  const details =
    payout.accountDetails && typeof payout.accountDetails === "object" ? payout.accountDetails : {};
  return {
    id: payout.id,
    payoutCode: payout.payoutCode ?? "",
    amount: Number(payout.amount),
    payoutMethod: payout.payoutMethod,
    accountDetails: toPayoutAccountDetails(details as Record<string, unknown>),
    status: payout.status,
    transactionReference: payout.transactionReference ?? undefined,
    rejectionReason: payout.rejectionReason ?? undefined,
    failureReason: payout.failureReason ?? undefined,
    approvedBy: payout.approvedBy ?? undefined,
    approvedAt: payout.approvedAt?.toISOString(),
    createdAt: payout.createdAt.toISOString(),
    processedAt: payout.processedAt?.toISOString(),
    notes: payout.notes ?? undefined,
  };
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepo: Repository<WalletTransaction>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(CashLedger)
    private readonly cashLedgerRepo: Repository<CashLedger>,
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(Settlement)
    private readonly settlementRepo: Repository<Settlement>,
    @InjectRepository(SettlementBatch)
    private readonly batchRepo: Repository<SettlementBatch>,
    @InjectRepository(CashHandIn)
    private readonly handInRepo: Repository<CashHandIn>,
    @InjectRepository(CashHandInItem)
    private readonly handInItemRepo: Repository<CashHandInItem>,
    @InjectRepository(CashDiscrepancy)
    private readonly discrepancyRepo: Repository<CashDiscrepancy>,
    @InjectRepository(FinancialTransaction)
    private readonly financialTxRepo: Repository<FinancialTransaction>,
    @InjectRepository(HubUserAssignment)
    private readonly hubAssignmentRepo: Repository<HubUserAssignment>,
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
    private readonly idempotency: IdempotencyService,
    private readonly outbox: OutboxService,
    @Optional()
    private readonly eventPublisher?: DomainEventPublisher,
  ) {}

  /* ================================================================== */
  /* Wallets                                                            */
  /* ================================================================== */

  /**
   * Resolves or initializes merchant wallet.
   */
  async getOrCreateWallet(merchantId: string, manager?: EntityManager): Promise<Wallet> {
    const repo = manager ? manager.getRepository(Wallet) : this.walletRepo;
    let wallet = await repo.findOne({ where: { merchantId } });

    if (!wallet) {
      wallet = repo.create({
        merchantId,
        balance: 0,
        pendingBalance: 0,
        withdrawnTotal: 0,
        currency: CURRENCY_BDT,
        status: "ACTIVE",
      });
      await repo.save(wallet);
      this.logger.log(`Initialized new merchant wallet for merchant: ${merchantId}`);
    }

    return wallet;
  }

  /**
   * Retrieves merchant wallet summary data. `pendingBalance` is derived from
   * unsettled CASH_PENDING parcels — the ledger (not this field) is the
   * source of truth for available funds.
   */
  async getMerchantWallet(merchantId: string): Promise<MerchantWalletData> {
    const wallet = await this.getOrCreateWallet(merchantId);

    const pendingParcels = await this.parcelRepo.find({
      where: { merchantId, status: ParcelStatus.CASH_PENDING },
      select: ["id", "codAmount", "deliveryFee"],
    });

    const pendingMinor = pendingParcels.reduce(
      (sum, p) => sum + netPayableMinor(toMinor(p.codAmount), toMinor(p.deliveryFee)),
      0,
    );

    return {
      id: wallet.id,
      merchantId: wallet.merchantId,
      balance: Number(wallet.balance),
      pendingBalance: toMajor(pendingMinor),
      withdrawnTotal: Number(wallet.withdrawnTotal),
      currency: wallet.currency,
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  /**
   * Merchant statement: paginated, newest first, optionally filtered by type.
   */
  async getWalletTransactions(
    walletId: string,
    options: { page?: number; limit?: number; type?: WalletTransactionType } = {},
  ): Promise<WalletTransactionItem[]> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    const txs = await this.transactionRepo.find({
      where: {
        walletId,
        ...(options.type ? { type: options.type } : {}),
      },
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return txs.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      balanceAfter: Number(tx.balanceAfter),
      referenceType: tx.referenceType || undefined,
      referenceId: tx.referenceId || undefined,
      description: tx.description,
      createdAt: tx.createdAt.toISOString(),
    }));
  }

  /* ================================================================== */
  /* Payouts                                                            */
  /* ================================================================== */

  /**
   * Merchant submits payout withdrawal request.
   *
   * Atomically: lock wallet -> validate funds -> reserve via
   * PAYOUT_RESERVATION (DEBIT MERCHANT_AVAILABLE / CREDIT
   * MERCHANT_PAYOUT_IN_TRANSIT) -> materialize balance -> statement ->
   * payout row. Idempotent per key: repeats replay the recorded request.
   */
  async requestPayout(
    merchantId: string,
    dto: RequestPayoutDto,
    actorId: string,
    idempotencyKey?: string,
  ): Promise<PayoutRequestItem> {
    const scope = `payout-request:${merchantId}`;

    if (idempotencyKey) {
      const existing = await this.payoutRepo.findOne({
        where: { merchantId, idempotencyKey },
      });
      if (existing) {
        this.idempotency.logReplay(scope, idempotencyKey);
        return toPayoutItem(existing);
      }
    }

    return this.dataSource
      .transaction(async (manager) => {
        const wallet = await this.lockWallet(manager, merchantId);

        const requestedMinor = toMinor(dto.amount);
        if (requestedMinor <= 0) {
          throw new BadRequestException({
            message: "Requested amount must be greater than 0",
            error: "VALIDATION_ERROR",
          });
        }

        const availableMinor = toMinor(wallet.balance);
        if (availableMinor < requestedMinor) {
          throw new BadRequestException({
            message: `Insufficient available balance. Available: ৳${toMajor(availableMinor)}, Requested: ৳${toMajor(requestedMinor)}`,
            error: "INSUFFICIENT_BALANCE",
          });
        }

        const payoutCode = await this.nextPayoutCode(manager);

        const payout = await manager.getRepository(PayoutRequest).save(
          manager.getRepository(PayoutRequest).create({
            payoutCode,
            idempotencyKey: idempotencyKey ?? null,
            merchantId,
            walletId: wallet.id,
            amount: toMajor(requestedMinor),
            payoutMethod: dto.payoutMethod,
            accountDetails: dto.accountDetails,
            status: PayoutStatus.REQUESTED,
            notes: dto.notes?.trim() || null,
          }),
        );

        // Reserve the funds: they leave AVAILABLE but are not yet disbursed.
        await this.ledger.post(manager, {
          type: FinancialTransactionType.PAYOUT_RESERVATION,
          referenceType: "PAYOUT",
          referenceId: payout.id,
          description: `Payout reservation ${payoutCode}`,
          entries: [
            {
              account: FinancialAccount.MERCHANT_AVAILABLE,
              direction: EntryDirection.DEBIT,
              amountMinor: requestedMinor,
              merchantId,
            },
            {
              account: FinancialAccount.MERCHANT_PAYOUT_IN_TRANSIT,
              direction: EntryDirection.CREDIT,
              amountMinor: requestedMinor,
              merchantId,
            },
          ],
          createdBy: actorId,
        });

        wallet.balance = toMajor(availableMinor - requestedMinor);
        wallet.withdrawnTotal = toMajor(toMinor(wallet.withdrawnTotal) + requestedMinor);
        await manager.getRepository(Wallet).save(wallet);

        await this.writeStatement(manager, {
          walletId: wallet.id,
          type: WalletTransactionType.PAYOUT_DEBIT,
          amountMinor: requestedMinor,
          balanceAfterMinor: availableMinor - requestedMinor,
          referenceType: "PAYOUT",
          referenceId: payout.id,
          description: `Payout withdrawal request ${payoutCode} via ${dto.payoutMethod}`,
        });

        this.logger.log(
          `Merchant ${merchantId} requested payout ${payoutCode} of ৳${toMajor(requestedMinor)} via ${dto.payoutMethod}`,
        );

        if (this.eventPublisher) {
          await this.eventPublisher.publish(
            manager,
            new PayoutRequestedEvent(
              { aggregateId: payout.id, merchantId },
              {
                payoutId: payout.id,
                amountPaisa: requestedMinor,
                paymentMethod: dto.payoutMethod,
              },
            ),
          );
        } else {
          await this.outbox.append(manager, {
            eventType: DomainEventType.PAYOUT_REQUESTED,
            aggregateType: "payout",
            aggregateId: payout.id,
            actorId,
            payload: {
              payoutId: payout.id,
              payoutCode,
              merchantId,
              amountMinor: requestedMinor,
              method: dto.payoutMethod,
            },
          });
        }

        return toPayoutItem(payout);
      })
      .catch(async (error) => {
        if (
          idempotencyKey &&
          error instanceof QueryFailedError &&
          (error.driverError as { code?: string })?.code === "23505"
        ) {
          const existing = await this.payoutRepo.findOne({
            where: { merchantId, idempotencyKey },
          });
          if (existing) {
            this.idempotency.logReplay(scope, idempotencyKey);
            return toPayoutItem(existing);
          }
        }
        throw error;
      });
  }

  /** Merchant payout history, newest first. */
  async getMerchantPayouts(merchantId: string): Promise<PayoutRequestItem[]> {
    const payouts = await this.payoutRepo.find({
      where: { merchantId },
      order: { createdAt: "DESC" },
      take: 200,
    });
    return payouts.map(toPayoutItem);
  }

  /** Single payout owned by the merchant. */
  async getMerchantPayout(merchantId: string, payoutId: string): Promise<PayoutRequestItem> {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId, merchantId } });
    if (!payout) {
      throw new NotFoundException({
        message: "Payout request not found",
        error: "PAYOUT_NOT_FOUND",
      });
    }
    return toPayoutItem(payout);
  }

  /** Merchant cancels their own pending request; reserved funds are released. */
  async cancelPayout(merchantId: string, payoutId: string): Promise<PayoutRequestItem> {
    return this.dataSource.transaction(async (manager) => {
      const payout = await manager.getRepository(PayoutRequest).findOne({
        where: { id: payoutId, merchantId },
        lock: { mode: "pessimistic_write" },
      });
      if (!payout) {
        throw new NotFoundException({
          message: "Payout request not found",
          error: "PAYOUT_NOT_FOUND",
        });
      }
      if (payout.status !== PayoutStatus.REQUESTED) {
        throw new BadRequestException({
          message: `Only REQUESTED payouts can be cancelled (currently ${payout.status})`,
          error: "PAYOUT_INVALID_STATE",
        });
      }
      payout.status = PayoutStatus.CANCELLED;
      await manager.getRepository(PayoutRequest).save(payout);
      await this.releaseReservation(manager, payout, merchantId, "Payout cancelled by merchant");
      return toPayoutItem(payout);
    });
  }

  /** Admin approves a requested payout for processing. */
  async approvePayout(
    payoutId: string,
    adminId: string,
    dto: ApprovePayoutDto,
  ): Promise<PayoutRequestItem> {
    return this.dataSource.transaction(async (manager) => {
      const payout = await manager.getRepository(PayoutRequest).findOne({
        where: { id: payoutId },
        lock: { mode: "pessimistic_write" },
      });
      if (!payout) {
        throw new NotFoundException({
          message: "Payout request not found",
          error: "PAYOUT_NOT_FOUND",
        });
      }
      if (payout.status !== PayoutStatus.REQUESTED) {
        throw new BadRequestException({
          message: `Only REQUESTED payouts can be approved (currently ${payout.status})`,
          error: "PAYOUT_INVALID_STATE",
        });
      }
      payout.status = PayoutStatus.APPROVED;
      payout.approvedBy = adminId;
      payout.approvedAt = new Date();
      if (dto.notes?.trim()) payout.notes = dto.notes.trim();
      await manager.getRepository(PayoutRequest).save(payout);

      if (this.eventPublisher) {
        await this.eventPublisher.publish(
          manager,
          new PayoutApprovedEvent(
            { aggregateId: payout.id, merchantId: payout.merchantId },
            {
              payoutId: payout.id,
              amountPaisa: toMinor(payout.amount),
            },
          ),
        );
      } else {
        await this.outbox.append(manager, {
          eventType: DomainEventType.PAYOUT_APPROVED,
          aggregateType: "payout",
          aggregateId: payout.id,
          actorId: adminId,
          payload: {
            payoutId: payout.id,
            payoutCode: payout.payoutCode,
            merchantId: payout.merchantId,
            amountMinor: toMinor(payout.amount),
            method: payout.payoutMethod,
          },
        });
      }

      return toPayoutItem(payout);
    });
  }

  /**
   * Admin executes a payout decision. COMPLETED disburses the reserved funds;
   * REJECTED/FAILED release them back through reversal postings — never by
   * mutating balances alone.
   */
  async processPayout(
    payoutId: string,
    dto: ProcessPayoutDto,
    adminId: string,
  ): Promise<PayoutRequestItem> {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) {
      throw new NotFoundException({
        message: "Payout request not found",
        error: "PAYOUT_NOT_FOUND",
      });
    }

    if (dto.status === PayoutStatus.COMPLETED) {
      return this.dataSource.transaction(async (manager) => {
        const locked = await manager.getRepository(PayoutRequest).findOne({
          where: { id: payoutId },
          lock: { mode: "pessimistic_write" },
        });
        if (!locked) {
          throw new NotFoundException({
            message: "Payout request not found",
            error: "PAYOUT_NOT_FOUND",
          });
        }
        if (locked.status !== PayoutStatus.APPROVED && locked.status !== PayoutStatus.PROCESSING) {
          throw new BadRequestException({
            message: `Only APPROVED payouts can be completed (currently ${locked.status})`,
            error: "PAYOUT_INVALID_STATE",
          });
        }
        const amountMinor = toMinor(locked.amount);
        locked.status = PayoutStatus.COMPLETED;
        locked.processedBy = adminId;
        locked.processedAt = new Date();
        locked.transactionReference = dto.transactionReference?.trim() || null;
        await manager.getRepository(PayoutRequest).save(locked);

        await this.ledger.post(manager, {
          type: FinancialTransactionType.PAYOUT_COMPLETION,
          referenceType: "PAYOUT",
          referenceId: locked.id,
          description: `Payout ${locked.payoutCode} disbursed via ${locked.payoutMethod}`,
          entries: [
            {
              account: FinancialAccount.MERCHANT_PAYOUT_IN_TRANSIT,
              direction: EntryDirection.DEBIT,
              amountMinor,
              merchantId: locked.merchantId,
            },
            {
              account: FinancialAccount.PLATFORM_CASH,
              direction: EntryDirection.CREDIT,
              amountMinor,
            },
          ],
          createdBy: adminId,
        });

        this.logger.log(
          `Payout ${locked.id} (৳${toMajor(amountMinor)}) marked as COMPLETED. Ref: ${dto.transactionReference}`,
        );

        if (this.eventPublisher) {
          await this.eventPublisher.publish(
            manager,
            new PayoutCompletedEvent(
              { aggregateId: locked.id, merchantId: locked.merchantId },
              {
                payoutId: locked.id,
                amountPaisa: amountMinor,
                transactionRef: locked.transactionReference ?? undefined,
              },
            ),
          );
        } else {
          await this.outbox.append(manager, {
            eventType: DomainEventType.PAYOUT_COMPLETED,
            aggregateType: "payout",
            aggregateId: locked.id,
            actorId: adminId,
            payload: {
              payoutId: locked.id,
              payoutCode: locked.payoutCode,
              merchantId: locked.merchantId,
              amountMinor,
              method: locked.payoutMethod,
              transactionReference: locked.transactionReference,
            },
          });
        }

        return toPayoutItem(locked);
      });
    }

    if (dto.status === PayoutStatus.REJECTED || dto.status === PayoutStatus.FAILED) {
      return this.dataSource.transaction(async (manager) => {
        const locked = await manager.getRepository(PayoutRequest).findOne({
          where: { id: payoutId },
          lock: { mode: "pessimistic_write" },
        });
        if (!locked) {
          throw new NotFoundException({
            message: "Payout request not found",
            error: "PAYOUT_NOT_FOUND",
          });
        }
        const releasable: readonly PayoutStatus[] = [
          PayoutStatus.REQUESTED,
          PayoutStatus.APPROVED,
          PayoutStatus.PROCESSING,
        ];
        if (!releasable.includes(locked.status)) {
          throw new BadRequestException({
            message: `Payout in status ${locked.status} cannot be ${dto.status}`,
            error: "PAYOUT_INVALID_STATE",
          });
        }
        locked.status = dto.status;
        locked.processedBy = adminId;
        locked.processedAt = new Date();
        if (dto.status === PayoutStatus.REJECTED) {
          locked.rejectionReason = dto.rejectionReason?.trim() || "Rejected by administrator";
        } else {
          locked.failureReason = dto.failureReason?.trim() || "External payout failed";
        }
        await manager.getRepository(PayoutRequest).save(locked);
        await this.releaseReservation(
          manager,
          locked,
          locked.merchantId,
          dto.status === PayoutStatus.REJECTED
            ? `Refund for rejected payout: ${locked.rejectionReason}`
            : `Funds released for failed payout: ${locked.failureReason}`,
        );

        // A rejected or failed payout is a payout failure, never a
        // completion — the old code mis-emitted PAYOUT_COMPLETED here.
        if (this.eventPublisher) {
          await this.eventPublisher.publish(
            manager,
            new PayoutFailedEvent(
              { aggregateId: locked.id, merchantId: locked.merchantId },
              {
                payoutId: locked.id,
                reason: dto.status === PayoutStatus.REJECTED ? (locked.rejectionReason ?? "Rejected") : (locked.failureReason ?? "Failed"),
              },
            ),
          );
        } else {
          await this.outbox.append(manager, {
            eventType: DomainEventType.PAYOUT_FAILED,
            aggregateType: "payout",
            aggregateId: locked.id,
            actorId: adminId,
            payload: {
              payoutId: locked.id,
              payoutCode: locked.payoutCode,
              merchantId: locked.merchantId,
              amountMinor: toMinor(locked.amount),
              method: locked.payoutMethod,
              reason:
                dto.status === PayoutStatus.REJECTED ? locked.rejectionReason : locked.failureReason,
            },
          });
        }

        return toPayoutItem(locked);
      });
    }

    throw new BadRequestException({
      message: `Unsupported payout decision "${dto.status}"`,
      error: "PAYOUT_INVALID_STATE",
    });
  }

  /* ================================================================== */
  /* Cash reconciliation (hub)                                          */
  /* ================================================================== */

  /**
   * Lists cash collections awaiting hub verification. Hub managers only see
   * their own hubs; admins see everything.
   */
  async getPendingReconciliations(actor: {
    id: string;
    role: string;
  }): Promise<PendingReconciliationItem[]> {
    const hubIds = await this.visibleHubIds(actor);
    const query = this.cashLedgerRepo
      .createQueryBuilder("ledger")
      .leftJoinAndSelect("ledger.parcel", "parcel")
      .leftJoinAndSelect("parcel.merchant", "merchant")
      .leftJoinAndSelect("ledger.rider", "rider")
      .leftJoinAndSelect("rider.user", "riderUser")
      .leftJoinAndSelect("ledger.hub", "hub")
      .where("ledger.handInStatus IN (:...statuses)", {
        statuses: [
          CashHandInStatus.HANDED_IN,
          CashHandInStatus.PENDING,
          CashHandInStatus.DISCREPANCY,
        ],
      })
      .orderBy("ledger.collectedAt", "DESC")
      .take(200);
    if (hubIds !== null) {
      query.andWhere("ledger.hubId IN (:...hubIds)", { hubIds });
    }
    const ledgers = await query.getMany();

    return ledgers.map((l) => {
      const amountMinor = toMinor(l.amount);
      const feeMinor = toMinor(l.parcel?.deliveryFee || 0);
      return {
        id: l.id,
        parcelId: l.parcelId,
        trackingCode: l.parcel?.trackingCode || "N/A",
        recipientName: l.parcel?.recipientName || "N/A",
        merchantName: l.parcel?.merchant?.businessName || "Merchant",
        riderName: l.rider?.user?.name || "Rider",
        hubName: l.hub?.name || "Sorting Hub",
        amount: toMajor(amountMinor),
        deliveryFee: toMajor(feeMinor),
        netPayable: toMajor(netPayableMinor(amountMinor, feeMinor)),
        collectedAt: l.collectedAt.toISOString(),
        handInStatus: l.handInStatus,
      };
    });
  }

  /**
   * Hub verifies cash received from a rider and settles COD to the merchant
   * wallet — the core Phase 4 money movement.
   *
   * - locks the ledger row (double verification races serialize);
   * - preserves the collected amount and records the hub-counted amount
   *   separately (variance stays auditable);
   * - on mismatch opens a discrepancy instead of silently absorbing it;
   * - posts a balanced COD_SETTLEMENT (custody + merchant + fee legs);
   * - creates the parcel Settlement row (fee snapshot preserved);
   * - credits the materialized wallet in the same transaction.
   */
  async verifyCashHandIn(
    dto: VerifyCashLedgerDto,
    verifier: { id: string; role: string },
  ): Promise<{
    cashLedger: { id: string; handInStatus: string; verifiedAmount: number | null };
    settlementCode: string;
    netSettled: number;
    newWalletBalance: number;
    discrepancyId: string | null;
    message: string;
  }> {
    const hubIds = await this.visibleHubIds(verifier);

    return this.dataSource.transaction(async (manager) => {
      // Lock first without joins (Postgres forbids FOR UPDATE across the
      // nullable side of an outer join), then load relations separately.
      const locked = await manager
        .getRepository(CashLedger)
        .createQueryBuilder("ledger")
        .setLock("pessimistic_write")
        .where("ledger.id = :id", { id: dto.cashLedgerId })
        .getOne();
      if (!locked) {
        throw new NotFoundException({
          message: "Cash ledger record not found",
          error: "CASH_LEDGER_NOT_FOUND",
        });
      }
      const ledger = await manager.getRepository(CashLedger).findOne({
        where: { id: locked.id },
        relations: ["parcel", "parcel.merchant"],
      });
      if (!ledger) {
        throw new NotFoundException({
          message: "Cash ledger record not found",
          error: "CASH_LEDGER_NOT_FOUND",
        });
      }
      if (hubIds !== null && (!ledger.hubId || !hubIds.includes(ledger.hubId))) {
        throw new ForbiddenException({
          message: "Access denied: cash belongs to another hub",
          error: "HUB_FORBIDDEN",
        });
      }
      if (ledger.handInStatus === CashHandInStatus.VERIFIED) {
        throw new BadRequestException({
          message: "This cash ledger entry is already verified",
          error: "CASH_ALREADY_VERIFIED",
        });
      }

      const existingSettlement = await manager.getRepository(Settlement).findOne({
        where: { cashLedgerId: ledger.id },
      });
      if (existingSettlement) {
        throw new ConflictException({
          message: "Cash was already settled for this collection",
          error: "CASH_ALREADY_VERIFIED",
        });
      }

      const parcel = ledger.parcel;
      if (!parcel) {
        throw new NotFoundException({
          message: "Linked parcel record not found",
          error: "PARCEL_NOT_FOUND",
        });
      }
      const merchant = parcel.merchant;
      if (!merchant) {
        throw new NotFoundException({
          message: "Linked merchant account not found",
          error: "MERCHANT_NOT_FOUND",
        });
      }

      const expectedMinor = toMinor(ledger.amount);
      const actualMinor =
        dto.actualAmount !== undefined ? toMinor(dto.actualAmount) : expectedMinor;
      if (actualMinor < 0) {
        throw new BadRequestException({
          message: "Verified amount cannot be negative",
          error: "VALIDATION_ERROR",
        });
      }
      const feeMinor = toMinor(parcel.deliveryFee);
      const feeLegMinor = Math.min(feeMinor, actualMinor);
      const netMinor = actualMinor - feeLegMinor;
      const mismatchMinor = actualMinor - expectedMinor;

      ledger.handInStatus =
        mismatchMinor === 0 ? CashHandInStatus.VERIFIED : CashHandInStatus.DISCREPANCY;
      ledger.verifiedBy = verifier.id;
      ledger.verifiedAt = new Date();
      ledger.verifiedAmount = toMajor(actualMinor);
      await manager.getRepository(CashLedger).save(ledger);

      let discrepancyId: string | null = null;
      if (mismatchMinor !== 0) {
        const discrepancy = await manager.getRepository(CashDiscrepancy).save(
          manager.getRepository(CashDiscrepancy).create({
            cashLedgerId: ledger.id,
            handInId: await this.handInIdForLedger(manager, ledger.id),
            type: mismatchMinor < 0 ? DiscrepancyType.SHORT : DiscrepancyType.OVER,
            status: DiscrepancyStatus.OPEN,
            expectedMinor,
            actualMinor,
            differenceMinor: mismatchMinor,
            currency: CURRENCY_BDT,
            reason: null,
            notes: dto.notes?.trim() || null,
            reportedBy: verifier.id,
          }),
        );
        discrepancyId = discrepancy.id;
        // True-up hub custody for the counted difference.
        await this.ledger.post(manager, {
          type: FinancialTransactionType.ADJUSTMENT,
          referenceType: "CASH_DISCREPANCY",
          referenceId: discrepancy.id,
          description: `Cash variance on ${parcel.trackingCode}: counted ${toMajor(actualMinor)} vs expected ${toMajor(expectedMinor)}`,
          entries:
            mismatchMinor < 0
              ? [
                  {
                    account: FinancialAccount.ADJUSTMENT,
                    direction: EntryDirection.DEBIT,
                    amountMinor: -mismatchMinor,
                  },
                  {
                    account: FinancialAccount.HUB_CASH,
                    direction: EntryDirection.CREDIT,
                    amountMinor: -mismatchMinor,
                  },
                ]
              : [
                  {
                    account: FinancialAccount.HUB_CASH,
                    direction: EntryDirection.DEBIT,
                    amountMinor: mismatchMinor,
                  },
                  {
                    account: FinancialAccount.ADJUSTMENT,
                    direction: EntryDirection.CREDIT,
                    amountMinor: mismatchMinor,
                  },
                ],
          createdBy: verifier.id,
        });
      }

      const posting = await this.ledger.post(manager, {
        type: FinancialTransactionType.COD_SETTLEMENT,
        referenceType: "CASH_LEDGER",
        referenceId: ledger.id,
        description: `COD settlement for parcel ${parcel.trackingCode}`,
        entries: [
          {
            account: FinancialAccount.COD_RECEIVABLE,
            direction: EntryDirection.DEBIT,
            amountMinor: actualMinor,
          },
          {
            account: FinancialAccount.MERCHANT_AVAILABLE,
            direction: EntryDirection.CREDIT,
            amountMinor: netMinor,
            merchantId: merchant.id,
          },
          ...(feeLegMinor > 0
            ? [
                {
                  account: FinancialAccount.FEE_REVENUE,
                  direction: EntryDirection.CREDIT,
                  amountMinor: feeLegMinor,
                  merchantId: merchant.id,
                },
              ]
            : []),
        ],
        createdBy: verifier.id,
      });

      const settlement = await manager.getRepository(Settlement).save(
        manager.getRepository(Settlement).create({
          settlementCode: await this.nextSettlementCode(manager),
          merchantId: merchant.id,
          parcelId: parcel.id,
          cashLedgerId: ledger.id,
          grossMinor: actualMinor,
          feeMinor: feeLegMinor,
          netMinor,
          currency: CURRENCY_BDT,
          status: SettlementStatus.SETTLED,
          transactionId: posting.id,
        }),
      );

      const wallet = await this.lockWallet(manager, merchant.id);
      const prevMinor = toMinor(wallet.balance);
      const newMinor = prevMinor + netMinor;
      wallet.balance = toMajor(newMinor);
      await manager.getRepository(Wallet).save(wallet);

      await this.writeStatement(manager, {
        walletId: wallet.id,
        type: WalletTransactionType.COD_CREDIT,
        amountMinor: actualMinor,
        balanceAfterMinor: prevMinor + actualMinor,
        referenceType: "PARCEL",
        referenceId: parcel.trackingCode,
        description: `COD collection verified for parcel ${parcel.trackingCode}`,
      });
      if (feeLegMinor > 0) {
        await this.writeStatement(manager, {
          walletId: wallet.id,
          type: WalletTransactionType.DELIVERY_FEE,
          amountMinor: feeLegMinor,
          balanceAfterMinor: newMinor,
          referenceType: "PARCEL",
          referenceId: parcel.trackingCode,
          description: `Delivery charge deducted for parcel ${parcel.trackingCode}`,
        });
      }

      const fromStatus = parcel.status;
      parcel.status = ParcelStatus.CASH_VERIFIED;
      await manager.getRepository(Parcel).save(parcel);

      await manager.getRepository(ParcelStatusHistory).save(
        manager.getRepository(ParcelStatusHistory).create({
          parcelId: parcel.id,
          fromStatus,
          toStatus: ParcelStatus.CASH_VERIFIED,
          eventType: "CASH_VERIFIED",
          actorId: verifier.id,
          actorRole: "HUB_MANAGER",
          description: `Cash verified (৳${toMajor(actualMinor)}). Settled ৳${toMajor(netMinor)} to merchant wallet.`,
          metadata: {
            cashLedgerId: ledger.id,
            settlementCode: settlement.settlementCode,
            verifiedAmount: toMajor(actualMinor),
            deliveryFee: toMajor(feeLegMinor),
            netSettled: toMajor(netMinor),
            discrepancyId,
          },
        }),
      );

      await this.recomputeHandIn(manager, ledger.id, verifier.id);

      // Transactional fan-out triggers: the relay notifies the merchant
      // (in-app + email), publishes webhooks and opens hub/rider alerts.
      // Direct fire-and-forget dispatch is gone — slow providers can delay
      // communication but never the settlement itself.
      if (this.eventPublisher) {
        await this.eventPublisher.publish(
          manager,
          new CashVerifiedEvent(
            { aggregateId: ledger.id, merchantId: merchant.id },
            {
              handInId: ledger.id,
              hubId: ledger.hubId,
              verifiedAmount: netMinor,
            },
          ),
        );
        await this.eventPublisher.publish(
          manager,
          new SettlementCreatedEvent(
            { aggregateId: settlement.id, merchantId: merchant.id },
            {
              settlementId: settlement.id,
              totalAmountPaisa: netMinor,
            },
          ),
        );
        if (discrepancyId) {
          await this.eventPublisher.publish(
            manager,
            new DiscrepancyOpenedEvent(
              { aggregateId: discrepancyId, merchantId: merchant.id },
              {
                discrepancyId,
                reason: `Mismatch: difference of ৳${toMajor(mismatchMinor)}`,
                amountPaisa: mismatchMinor,
              },
            ),
          );
        }
      } else {
        await this.outbox.append(manager, {
          eventType: DomainEventType.CASH_VERIFIED,
          aggregateType: "cash_ledger",
          aggregateId: ledger.id,
          actorId: verifier.id,
          payload: {
            cashLedgerId: ledger.id,
            parcelId: parcel.id,
            trackingCode: parcel.trackingCode,
            merchantId: merchant.id,
            netMinor,
            settlementCode: settlement.settlementCode,
          },
        });
        await this.outbox.append(manager, {
          eventType: DomainEventType.SETTLEMENT_CREATED,
          aggregateType: "settlement",
          aggregateId: settlement.id,
          actorId: verifier.id,
          payload: {
            settlementId: settlement.id,
            settlementCode: settlement.settlementCode,
            parcelId: parcel.id,
            trackingCode: parcel.trackingCode,
            merchantId: merchant.id,
            netMinor,
          },
        });
        if (discrepancyId) {
          const riderId = ledger.riderId;
          await this.outbox.append(manager, {
            eventType: DomainEventType.DISCREPANCY_OPENED,
            aggregateType: "cash_discrepancy",
            aggregateId: discrepancyId,
            actorId: verifier.id,
            payload: {
              discrepancyId,
              cashLedgerId: ledger.id,
              trackingCode: parcel.trackingCode,
              merchantId: merchant.id,
              riderId,
              hubId: ledger.hubId,
              differenceMinor: mismatchMinor,
            },
          });
        }
      }

      this.logger.log(
        `Reconciled cash for parcel ${parcel.trackingCode}: COD ৳${toMajor(actualMinor)}, fee ৳${toMajor(feeLegMinor)}, settled ৳${toMajor(netMinor)} to ${merchant.businessName}`,
      );

      return {
        cashLedger: {
          id: ledger.id,
          handInStatus: ledger.handInStatus,
          verifiedAmount: toMajor(actualMinor),
        },
        settlementCode: settlement.settlementCode,
        netSettled: toMajor(netMinor),
        newWalletBalance: toMajor(newMinor),
        discrepancyId,
        message:
          mismatchMinor === 0
            ? `Cash verified. ৳${toMajor(netMinor)} settled to ${merchant.businessName} wallet.`
            : `Cash settled on counted amount with a recorded variance of ৳${toMajor(mismatchMinor)}.`,
      };
    });
  }

  /* ================================================================== */
  /* Settlements                                                        */
  /* ================================================================== */

  async getMerchantSettlements(
    merchantId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    const [rows, total] = await this.settlementRepo.findAndCount({
      where: { merchantId },
      order: { settledAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
    const parcels = rows.length
      ? await this.parcelRepo.find({
          where: { id: In(rows.map((r) => r.parcelId)) },
          select: ["id", "trackingCode"],
        })
      : [];
    const trackingByParcel = new Map(parcels.map((p) => [p.id, p.trackingCode]));
    return {
      items: rows.map((s) => this.toSettlementItem(s, trackingByParcel.get(s.parcelId) ?? "")),
      total,
      page,
      limit,
    };
  }

  async getMerchantSettlement(merchantId: string, settlementId: string): Promise<SettlementItem> {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId, merchantId },
    });
    if (!settlement) {
      throw new NotFoundException({
        message: "Settlement not found",
        error: "SETTLEMENT_NOT_FOUND",
      });
    }
    const parcel = await this.parcelRepo.findOne({
      where: { id: settlement.parcelId },
      select: ["id", "trackingCode"],
    });
    return this.toSettlementItem(settlement, parcel?.trackingCode ?? "");
  }

  async listSettlements(options: {
    merchantId?: string;
    status?: SettlementStatus;
    page?: number;
    limit?: number;
  }): Promise<{ items: SettlementItem[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    const [rows, total] = await this.settlementRepo.findAndCount({
      where: {
        ...(options.merchantId ? { merchantId: options.merchantId } : {}),
        ...(options.status ? { status: options.status } : {}),
      },
      order: { settledAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
    const parcels = rows.length
      ? await this.parcelRepo.find({
          where: { id: In(rows.map((r) => r.parcelId)) },
          select: ["id", "trackingCode"],
        })
      : [];
    const trackingByParcel = new Map(parcels.map((p) => [p.id, p.trackingCode]));
    return {
      items: rows.map((s) => this.toSettlementItem(s, trackingByParcel.get(s.parcelId) ?? "")),
      total,
      page,
      limit,
    };
  }

  async createSettlementBatch(
    adminId: string,
    dto: CreateSettlementBatchDto,
  ): Promise<SettlementBatchItem> {
    return this.dataSource.transaction(async (manager) => {
      const settlements = await manager.getRepository(Settlement).find({
        where: { id: In(dto.settlementIds), merchantId: dto.merchantId },
        lock: { mode: "pessimistic_write" },
      });
      if (settlements.length !== dto.settlementIds.length) {
        throw new NotFoundException({
          message: "One or more settlements were not found for this merchant",
          error: "SETTLEMENT_NOT_FOUND",
        });
      }
      const invalid = settlements.find(
        (s) => s.status !== SettlementStatus.SETTLED || s.batchId !== null,
      );
      if (invalid) {
        throw new BadRequestException({
          message: `Settlement ${invalid.settlementCode} is not available for batching`,
          error: "SETTLEMENT_INVALID_STATE",
        });
      }
      const gross = settlements.reduce((sum, s) => sum + Number(s.grossMinor), 0);
      const fee = settlements.reduce((sum, s) => sum + Number(s.feeMinor), 0);
      const net = settlements.reduce((sum, s) => sum + Number(s.netMinor), 0);

      const batch = await manager.getRepository(SettlementBatch).save(
        manager.getRepository(SettlementBatch).create({
          settlementCode: await this.nextBatchCode(manager),
          merchantId: dto.merchantId,
          status: SettlementBatchStatus.PENDING,
          grossMinor: gross,
          feeMinor: fee,
          netMinor: net,
          settlementCount: settlements.length,
          notes: dto.notes?.trim() || null,
          createdBy: adminId,
        }),
      );
      for (const settlement of settlements) {
        settlement.batchId = batch.id;
        await manager.getRepository(Settlement).save(settlement);
      }
      return this.toBatchItem(batch);
    });
  }

  async completeSettlementBatch(batchId: string): Promise<SettlementBatchItem> {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundException({
        message: "Settlement batch not found",
        error: "SETTLEMENT_NOT_FOUND",
      });
    }
    if (batch.status !== SettlementBatchStatus.PENDING) {
      throw new BadRequestException({
        message: `Batch is already ${batch.status}`,
        error: "SETTLEMENT_INVALID_STATE",
      });
    }
    batch.status = SettlementBatchStatus.COMPLETED;
    batch.completedAt = new Date();
    await this.batchRepo.save(batch);
    return this.toBatchItem(batch);
  }

  async cancelSettlementBatch(batchId: string): Promise<SettlementBatchItem> {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundException({
        message: "Settlement batch not found",
        error: "SETTLEMENT_NOT_FOUND",
      });
    }
    if (batch.status !== SettlementBatchStatus.PENDING) {
      throw new BadRequestException({
        message: `Batch is already ${batch.status}`,
        error: "SETTLEMENT_INVALID_STATE",
      });
    }
    batch.status = SettlementBatchStatus.CANCELLED;
    await this.batchRepo.save(batch);
    return this.toBatchItem(batch);
  }

  async listSettlementBatches(options: {
    merchantId?: string;
    status?: SettlementBatchStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    const [rows, total] = await this.batchRepo.findAndCount({
      where: {
        ...(options.merchantId ? { merchantId: options.merchantId } : {}),
        ...(options.status ? { status: options.status } : {}),
      },
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { items: rows.map((b) => this.toBatchItem(b)), total, page, limit };
  }

  /* ================================================================== */
  /* Hand-in batches (hub)                                              */
  /* ================================================================== */

  async getHubHandIns(
    actor: { id: string; role: string },
    options: { status?: string } = {},
  ): Promise<CashHandInBatchItem[]> {
    const hubIds = await this.visibleHubIds(actor);
    const query = this.handInRepo
      .createQueryBuilder("handin")
      .leftJoinAndSelect("handin.rider", "rider")
      .leftJoinAndSelect("rider.user", "riderUser")
      .leftJoinAndSelect("handin.hub", "hub")
      .orderBy("handin.submittedAt", "DESC")
      .take(200);
    if (options.status) query.andWhere("handin.status = :status", { status: options.status });
    if (hubIds !== null) {
      query.andWhere("handin.hubId IN (:...hubIds)", { hubIds });
    }
    const batches = await query.getMany();
    const riderNames = new Map<string, string>();
    for (const batch of batches) {
      const riderUser = (
        batch as unknown as {
          rider?: { user?: { name?: string } | null } | null;
        }
      ).rider?.user;
      if (riderUser?.name) riderNames.set(batch.riderId, riderUser.name);
    }
    const counts = await this.countHandInItems(batches.map((b) => b.id));
    return batches.map((batch) => ({
      id: batch.id,
      handinCode: batch.handinCode,
      riderId: batch.riderId,
      riderName: riderNames.get(batch.riderId) ?? null,
      hubId: batch.hubId,
      hubCode: batch.hub?.code ?? null,
      hubName: batch.hub?.name ?? null,
      status: batch.status,
      expectedMinor: Number(batch.expectedMinor),
      verifiedMinor: Number(batch.verifiedMinor),
      itemCount: counts.get(batch.id) ?? 0,
      submittedAt: batch.submittedAt.toISOString(),
      verifiedAt: batch.verifiedAt?.toISOString() ?? null,
    }));
  }

  /* ================================================================== */
  /* Discrepancies                                                      */
  /* ================================================================== */

  async listDiscrepancies(actor: { id: string; role: string }, options: { status?: string } = {}) {
    const hubIds = await this.visibleHubIds(actor);
    let ledgerIds: string[] | null = null;
    if (hubIds !== null) {
      const ledgers = await this.cashLedgerRepo.find({
        where: { hubId: In(hubIds) },
        select: ["id"],
      });
      ledgerIds = ledgers.map((l) => l.id);
      if (ledgerIds.length === 0) return [];
    }
    const rows = await this.discrepancyRepo.find({
      where: {
        ...(options.status ? { status: options.status as DiscrepancyStatus } : {}),
        ...(ledgerIds !== null ? { cashLedgerId: In(ledgerIds) } : {}),
      },
      order: { createdAt: "DESC" },
      take: 200,
    });
    const parcels = rows.length
      ? await this.cashLedgerRepo.find({
          where: { id: In(rows.map((r) => r.cashLedgerId)) },
          relations: ["parcel"],
        })
      : [];
    const trackingByLedger = new Map(parcels.map((l) => [l.id, l.parcel?.trackingCode ?? null]));
    return rows.map((d) => ({
      id: d.id,
      cashLedgerId: d.cashLedgerId,
      trackingCode: trackingByLedger.get(d.cashLedgerId) ?? null,
      handinId: d.handInId,
      type: d.type,
      status: d.status,
      expectedMinor: Number(d.expectedMinor),
      actualMinor: Number(d.actualMinor),
      differenceMinor: Number(d.differenceMinor),
      reason: d.reason,
      notes: d.notes,
      reportedBy: d.reportedBy,
      resolvedBy: d.resolvedBy,
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  /**
   * Resolves a cash discrepancy. An optional recovery amount posted back to
   * the merchant wallet keeps every taka traceable; the discrepancy itself
   * is never edited into silence.
   */
  async resolveDiscrepancy(discrepancyId: string, adminId: string, dto: ResolveDiscrepancyDto) {
    return this.dataSource.transaction(async (manager) => {
      const discrepancy = await manager.getRepository(CashDiscrepancy).findOne({
        where: { id: discrepancyId },
        lock: { mode: "pessimistic_write" },
      });
      if (!discrepancy) {
        throw new NotFoundException({
          message: "Discrepancy not found",
          error: "DISCREPANCY_NOT_FOUND",
        });
      }
      if (discrepancy.status !== DiscrepancyStatus.OPEN) {
        throw new BadRequestException({
          message: "Discrepancy is already resolved",
          error: "DISCREPANCY_ALREADY_RESOLVED",
        });
      }

      const recoveredMinor = toMinor(dto.recoveredAmount ?? 0);
      if (recoveredMinor > 0) {
        const ledger = await manager.getRepository(CashLedger).findOne({
          where: { id: discrepancy.cashLedgerId },
          relations: ["parcel"],
        });
        const merchantId = ledger?.parcel?.merchantId;
        if (!merchantId) {
          throw new BadRequestException({
            message: "Cannot recover against a parcel without a merchant",
            error: "ADJUSTMENT_INVALID",
          });
        }
        await this.ledger.post(manager, {
          type: FinancialTransactionType.ADJUSTMENT,
          referenceType: "CASH_DISCREPANCY",
          referenceId: discrepancy.id,
          description: `Discrepancy recovery: ${dto.reason}`,
          entries: [
            {
              account: FinancialAccount.ADJUSTMENT,
              direction: EntryDirection.DEBIT,
              amountMinor: recoveredMinor,
            },
            {
              account: FinancialAccount.MERCHANT_AVAILABLE,
              direction: EntryDirection.CREDIT,
              amountMinor: recoveredMinor,
              merchantId,
            },
          ],
          createdBy: adminId,
        });
        const wallet = await this.lockWallet(manager, merchantId);
        wallet.balance = toMajor(toMinor(wallet.balance) + recoveredMinor);
        await manager.getRepository(Wallet).save(wallet);
        await this.writeStatement(manager, {
          walletId: wallet.id,
          type: WalletTransactionType.ADJUSTMENT_CREDIT,
          amountMinor: recoveredMinor,
          balanceAfterMinor: toMinor(wallet.balance),
          referenceType: "CASH_DISCREPANCY",
          referenceId: discrepancy.id,
          description: `Discrepancy recovery: ${dto.reason}`,
        });
      }

      discrepancy.status = DiscrepancyStatus.RESOLVED;
      discrepancy.reason = dto.reason.trim();
      discrepancy.resolvedBy = adminId;
      discrepancy.resolvedAt = new Date();
      await manager.getRepository(CashDiscrepancy).save(discrepancy);

      const ledger = await manager.getRepository(CashLedger).findOne({
        where: { id: discrepancy.cashLedgerId },
      });
      if (ledger) {
        ledger.handInStatus = CashHandInStatus.VERIFIED;
        await manager.getRepository(CashLedger).save(ledger);
        await this.recomputeHandIn(manager, ledger.id, adminId);
      }

      return { id: discrepancy.id, status: discrepancy.status };
    });
  }

  /* ================================================================== */
  /* Adjustments + reversals (admin)                                    */
  /* ================================================================== */

  /**
   * Manual adjustment with mandatory reason. CREDIT adds to the merchant
   * wallet, DEBIT removes (with a funds check) — both fully journaled.
   */
  async createAdjustment(
    adminId: string,
    dto: CreateAdjustmentDto,
    idempotencyKey?: string,
  ): Promise<FinancialTransactionItem> {
    const scope = `finance-adjustment:${dto.merchantId}`;
    const amountMinor = toMinor(dto.amount);

    return this.dataSource.transaction(async (manager) => {
      if (idempotencyKey) {
        const requestHash = IdempotencyService.fingerprint({
          merchantId: dto.merchantId,
          direction: dto.direction,
          amountMinor,
          reason: dto.reason,
        });
        const resolution = await this.idempotency.resolve(idempotencyKey, scope, requestHash);
        if (resolution.kind === "replay") {
          const transactionId = (resolution.response as { transactionId?: string }).transactionId;
          const existing = transactionId
            ? await this.findTransaction(manager, transactionId)
            : null;
          if (existing) return existing;
        }
        if (resolution.kind === "conflict") {
          throw new ConflictException({
            message: "Idempotency key was already used with a different payload",
            error: IdempotencyService.CONFLICT_CODE,
          });
        }
        try {
          await this.idempotency.claim(manager, {
            key: idempotencyKey,
            scope,
            userId: adminId,
            requestHash,
          });
        } catch (error) {
          if (error instanceof IdempotencyClaimConflict) {
            throw new ConflictException({
              message: "Adjustment is already in progress for this key",
              error: IdempotencyService.IN_PROGRESS_CODE,
            });
          }
          throw error;
        }
      }

      const wallet = await this.lockWallet(manager, dto.merchantId);
      const prevMinor = toMinor(wallet.balance);
      const nextMinor =
        dto.direction === "CREDIT" ? prevMinor + amountMinor : prevMinor - amountMinor;
      if (nextMinor < 0) {
        throw new BadRequestException({
          message: "Adjustment would overdraw the merchant wallet",
          error: "INSUFFICIENT_BALANCE",
        });
      }

      const posting = await this.ledger.post(manager, {
        type: FinancialTransactionType.ADJUSTMENT,
        referenceType: dto.referenceType?.trim() || "ADJUSTMENT",
        referenceId: dto.referenceId?.trim() || null,
        description: `Manual adjustment (${dto.direction}): ${dto.reason}`,
        entries:
          dto.direction === "CREDIT"
            ? [
                {
                  account: FinancialAccount.ADJUSTMENT,
                  direction: EntryDirection.DEBIT,
                  amountMinor,
                },
                {
                  account: FinancialAccount.MERCHANT_AVAILABLE,
                  direction: EntryDirection.CREDIT,
                  amountMinor,
                  merchantId: dto.merchantId,
                },
              ]
            : [
                {
                  account: FinancialAccount.MERCHANT_AVAILABLE,
                  direction: EntryDirection.DEBIT,
                  amountMinor,
                  merchantId: dto.merchantId,
                },
                {
                  account: FinancialAccount.ADJUSTMENT,
                  direction: EntryDirection.CREDIT,
                  amountMinor,
                },
              ],
        createdBy: adminId,
      });

      wallet.balance = toMajor(nextMinor);
      await manager.getRepository(Wallet).save(wallet);
      await this.writeStatement(manager, {
        walletId: wallet.id,
        type:
          dto.direction === "CREDIT"
            ? WalletTransactionType.ADJUSTMENT_CREDIT
            : WalletTransactionType.ADJUSTMENT_DEBIT,
        amountMinor,
        balanceAfterMinor: nextMinor,
        referenceType: "ADJUSTMENT",
        referenceId: posting.id,
        description: `Manual adjustment: ${dto.reason}`,
      });

      if (idempotencyKey) {
        await this.idempotency.complete(manager, {
          key: idempotencyKey,
          scope,
          statusCode: HttpStatus.OK,
          response: { transactionId: posting.id },
          userId: adminId,
        });
      }

      const item = await this.findTransaction(manager, posting.id);
      if (!item) {
        throw new NotFoundException({
          message: "Adjustment posting not found",
          error: "LEDGER_ALREADY_POSTED",
        });
      }
      return item;
    });
  }

  /**
   * Reverses a posted transaction with mirror entries. The original is marked
   * REVERSED and linked — never edited. Merchant wallet effects are unwound
   * in the same transaction.
   */
  async reverseTransaction(
    adminId: string,
    transactionId: string,
    dto: ReverseTransactionDto,
  ): Promise<FinancialTransactionItem> {
    return this.dataSource.transaction(async (manager) => {
      // Lock first without joins (Postgres forbids FOR UPDATE across the
      // nullable side of an outer join), then load entries separately.
      const locked = await manager
        .getRepository(FinancialTransaction)
        .createQueryBuilder("transaction")
        .setLock("pessimistic_write")
        .where("transaction.id = :id", { id: transactionId })
        .getOne();
      if (!locked) {
        throw new NotFoundException({
          message: "Financial transaction not found",
          error: "LEDGER_ALREADY_POSTED",
        });
      }
      const original = await manager.findOne(FinancialTransaction, {
        where: { id: locked.id },
        relations: ["entries"],
      });
      if (!original) {
        throw new NotFoundException({
          message: "Financial transaction not found",
          error: "LEDGER_ALREADY_POSTED",
        });
      }
      if (original.status === FinancialTransactionStatus.REVERSED) {
        throw new BadRequestException({
          message: "Transaction is already reversed",
          error: "REVERSAL_INVALID",
        });
      }
      if (
        original.type !== FinancialTransactionType.COD_SETTLEMENT &&
        original.type !== FinancialTransactionType.ADJUSTMENT &&
        original.type !== FinancialTransactionType.PAYOUT_RELEASE
      ) {
        throw new BadRequestException({
          message: `Transactions of type ${original.type} cannot be reversed directly`,
          error: "REVERSAL_INVALID",
        });
      }

      const mirror = original.entries.map((entry) => ({
        account: entry.account,
        direction:
          entry.direction === EntryDirection.DEBIT ? EntryDirection.CREDIT : EntryDirection.DEBIT,
        amountMinor: Number(entry.amountMinor),
        merchantId: entry.merchantId,
        memo: `Reversal of ${original.transactionCode}`,
      }));

      const reversal = await this.ledger.post(manager, {
        type: FinancialTransactionType.REVERSAL,
        referenceType: original.referenceType,
        referenceId: original.referenceId,
        description: `Reversal of ${original.transactionCode}: ${dto.reason}`,
        entries: mirror,
        createdBy: adminId,
      });

      original.status = FinancialTransactionStatus.REVERSED;
      original.reversedById = reversal.id;
      await manager.getRepository(FinancialTransaction).save(original);
      reversal.reversalOfId = original.id;
      await manager.getRepository(FinancialTransaction).save(reversal);

      // Unwind merchant wallet effects of the original posting.
      const merchantDeltas = new Map<string, number>();
      for (const entry of original.entries) {
        if (!entry.merchantId) continue;
        if (entry.account !== FinancialAccount.MERCHANT_AVAILABLE) continue;
        const signed =
          entry.direction === EntryDirection.CREDIT
            ? Number(entry.amountMinor)
            : -Number(entry.amountMinor);
        merchantDeltas.set(entry.merchantId, (merchantDeltas.get(entry.merchantId) ?? 0) - signed);
      }
      for (const [merchantId, deltaMinor] of merchantDeltas) {
        const wallet = await this.lockWallet(manager, merchantId);
        const nextMinor = toMinor(wallet.balance) + deltaMinor;
        if (nextMinor < 0) {
          throw new BadRequestException({
            message: "Reversal would overdraw the merchant wallet",
            error: "INSUFFICIENT_BALANCE",
          });
        }
        wallet.balance = toMajor(nextMinor);
        await manager.getRepository(Wallet).save(wallet);
        await this.writeStatement(manager, {
          walletId: wallet.id,
          type:
            deltaMinor >= 0
              ? WalletTransactionType.ADJUSTMENT_CREDIT
              : WalletTransactionType.ADJUSTMENT_DEBIT,
          amountMinor: Math.abs(deltaMinor),
          balanceAfterMinor: nextMinor,
          referenceType: "REVERSAL",
          referenceId: reversal.id,
          description: `Reversal of ${original.transactionCode}: ${dto.reason}`,
        });
        if (original.type === FinancialTransactionType.COD_SETTLEMENT && original.referenceId) {
          await manager.update(
            Settlement,
            { transactionId: original.id },
            { status: SettlementStatus.REVERSED },
          );
        }
      }

      const item = await this.findTransaction(manager, reversal.id);
      if (!item) {
        throw new NotFoundException({
          message: "Reversal posting not found",
          error: "LEDGER_ALREADY_POSTED",
        });
      }
      return item;
    });
  }

  /* ================================================================== */
  /* Ledger explorer + reports (admin)                                  */
  /* ================================================================== */

  async listFinancialTransactions(options: {
    type?: FinancialTransactionType;
    status?: FinancialTransactionStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    const [rows, total] = await this.financialTxRepo.findAndCount({
      where: {
        ...(options.type ? { type: options.type } : {}),
        ...(options.status ? { status: options.status } : {}),
      },
      relations: ["entries"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
    return {
      items: rows.map((t) => this.toTransactionItem(t)),
      total,
      page,
      limit,
    };
  }

  async getFinancialTransaction(transactionId: string): Promise<FinancialTransactionItem> {
    const item = await this.findTransaction(this.dataSource.manager, transactionId);
    if (!item) {
      throw new NotFoundException({
        message: "Financial transaction not found",
        error: "LEDGER_ALREADY_POSTED",
      });
    }
    return item;
  }

  /** COD collection report: every verified collection with fee + net. */
  async codReport(options: {
    from?: string;
    to?: string;
    merchantId?: string;
    hubId?: string;
    riderId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    const query = this.settlementRepo
      .createQueryBuilder("settlement")
      .leftJoinAndSelect("settlement.parcel", "parcel")
      .orderBy("settlement.settledAt", "DESC")
      .take(limit)
      .skip((page - 1) * limit);
    if (options.merchantId)
      query.andWhere("settlement.merchantId = :merchantId", { merchantId: options.merchantId });
    if (options.from)
      query.andWhere("settlement.settledAt >= :from", { from: new Date(options.from) });
    if (options.to) query.andWhere("settlement.settledAt <= :to", { to: new Date(options.to) });
    if (options.hubId || options.riderId) {
      query.leftJoin("settlement.cashLedger", "ledger");
      if (options.hubId) query.andWhere("ledger.hubId = :hubId", { hubId: options.hubId });
      if (options.riderId)
        query.andWhere("ledger.riderId = :riderId", { riderId: options.riderId });
    }
    const [rows, total] = await query.getManyAndCount();
    return {
      items: rows.map((s) => ({
        settlementCode: s.settlementCode,
        trackingCode: s.parcel?.trackingCode ?? "",
        merchantId: s.merchantId,
        grossMinor: Number(s.grossMinor),
        feeMinor: Number(s.feeMinor),
        netMinor: Number(s.netMinor),
        status: s.status,
        settledAt: s.settledAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /** Payout report with status/merchant filters. */
  async payoutReport(options: {
    merchantId?: string;
    status?: PayoutStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    const [rows, total] = await this.payoutRepo.findAndCount({
      where: {
        ...(options.merchantId ? { merchantId: options.merchantId } : {}),
        ...(options.status ? { status: options.status } : {}),
      },
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { items: rows.map(toPayoutItem), total, page, limit };
  }

  /** Fee revenue report aggregated per day from journal fee legs. */
  async feeReport(options: { from?: string; to?: string }) {
    const query = this.dataSource
      .createQueryBuilder()
      .select("DATE(entry.createdAt)", "day")
      .addSelect("SUM(entry.amount_minor)", "totalMinor")
      .addSelect("COUNT(DISTINCT entry.transaction_id)", "postings")
      .from("financial_entries", "entry")
      .where("entry.account = :account", { account: FinancialAccount.FEE_REVENUE })
      .andWhere("entry.direction = :direction", { direction: EntryDirection.CREDIT })
      .groupBy("day")
      .orderBy("day", "DESC")
      .limit(92);
    if (options.from) query.andWhere("entry.createdAt >= :from", { from: new Date(options.from) });
    if (options.to) query.andWhere("entry.createdAt <= :to", { to: new Date(options.to) });
    const rows = await query.getRawMany<{ day: string; totalMinor: string; postings: string }>();
    return {
      items: rows.map((row) => ({
        day: row.day,
        totalMinor: Number(row.totalMinor),
        postings: Number(row.postings),
      })),
    };
  }

  /**
   * System-wide reconciliation metrics. Full-table scans are acceptable at
   * MVP volumes; indexes on (merchant,account) and statuses keep the
   * per-merchant check below cheap.
   */
  async getReconciliationSummary() {
    const wallets = await this.walletRepo.find();
    const totalMerchantBalanceMinor = wallets.reduce((sum, w) => sum + toMinor(w.balance), 0);

    const allLedgers = await this.cashLedgerRepo.find({ select: ["id", "amount", "handInStatus"] });
    const verifiedLedgers = allLedgers.filter((l) => l.handInStatus === CashHandInStatus.VERIFIED);
    const pendingLedgers = allLedgers.filter(
      (l) =>
        l.handInStatus === CashHandInStatus.PENDING ||
        l.handInStatus === CashHandInStatus.HANDED_IN,
    );

    const totalVerifiedMinor = verifiedLedgers.reduce((sum, l) => sum + toMinor(l.amount), 0);
    const totalPendingMinor = pendingLedgers.reduce((sum, l) => sum + toMinor(l.amount), 0);

    const payouts = await this.payoutRepo.find({ where: { status: PayoutStatus.COMPLETED } });
    const totalDisbursedMinor = payouts.reduce((sum, p) => sum + toMinor(p.amount), 0);
    const openDiscrepancies = await this.discrepancyRepo.count({
      where: { status: DiscrepancyStatus.OPEN },
    });

    return {
      totalWallets: wallets.length,
      totalMerchantBalance: toMajor(totalMerchantBalanceMinor),
      totalVerifiedCod: toMajor(totalVerifiedMinor),
      totalPendingCod: toMajor(totalPendingMinor),
      totalDisbursedPayouts: toMajor(totalDisbursedMinor),
      pendingReconciliationsCount: pendingLedgers.length,
      verifiedReconciliationsCount: verifiedLedgers.length,
      openDiscrepanciesCount: openDiscrepancies,
    };
  }

  /**
   * Automated verification capability (§136): ledger-derived vs materialized
   * wallet per merchant, rider cash position, settlement math, and journal
   * balance per transaction. Reports mismatches — never repairs them.
   */
  async reconciliationCheck(merchantId?: string): Promise<ReconciliationCheckResult> {
    const wallets = merchantId
      ? await this.walletRepo.find({ where: { merchantId } })
      : await this.walletRepo.find({ take: 500 });

    const merchants = [];
    for (const wallet of wallets) {
      const derivedMinor = await this.ledger.merchantAccountBalance(
        this.dataSource.manager,
        wallet.merchantId,
        FinancialAccount.MERCHANT_AVAILABLE,
      );
      const materializedMinor = toMinor(wallet.balance);
      merchants.push({
        merchantId: wallet.merchantId,
        walletBalanceMinor: materializedMinor,
        ledgerDerivedMinor: derivedMinor,
        balanced: derivedMinor === materializedMinor,
      });
    }

    const riderIds = await this.cashLedgerRepo
      .createQueryBuilder("ledger")
      .select("DISTINCT ledger.riderId", "riderId")
      .getRawMany<{ riderId: string }>();
    const riders = [];
    for (const { riderId } of riderIds.slice(0, 500)) {
      const ledgers = await this.cashLedgerRepo.find({
        where: { riderId },
        select: ["id", "amount", "verifiedAmount", "handInStatus"],
      });
      let expectedMinor = 0;
      let handedInMinor = 0;
      let verifiedMinor = 0;
      for (const ledger of ledgers) {
        const amountMinor = toMinor(ledger.amount);
        expectedMinor += amountMinor;
        if (
          ledger.handInStatus === CashHandInStatus.HANDED_IN ||
          ledger.handInStatus === CashHandInStatus.VERIFIED ||
          ledger.handInStatus === CashHandInStatus.DISCREPANCY
        ) {
          handedInMinor += amountMinor;
        }
        if (
          ledger.handInStatus === CashHandInStatus.VERIFIED ||
          ledger.handInStatus === CashHandInStatus.DISCREPANCY
        ) {
          verifiedMinor += toMinor(ledger.verifiedAmount ?? ledger.amount);
        }
      }
      riders.push({
        riderId,
        expectedMinor,
        handedInMinor,
        verifiedMinor,
        outstandingMinor: expectedMinor - handedInMinor,
      });
    }

    const settlements = await this.settlementRepo.find({ take: 1000 });
    const settlementChecks = settlements.map((s) => {
      const gross = Number(s.grossMinor);
      const fee = Number(s.feeMinor);
      const net = Number(s.netMinor);
      const balanced = gross - fee === net && net >= 0 && fee >= 0;
      return {
        settlementId: s.id,
        balanced,
        detail: balanced ? "gross - fee = net" : `gross ${gross} - fee ${fee} != net ${net}`,
      };
    });

    const transactions = await this.financialTxRepo.find({
      relations: ["entries"],
      order: { createdAt: "DESC" },
      take: 1000,
    });
    const transactionChecks = transactions.map((t) => {
      let debit = 0;
      let credit = 0;
      for (const entry of t.entries ?? []) {
        const amount = Number(entry.amountMinor);
        if (entry.direction === EntryDirection.DEBIT) debit += amount;
        else credit += amount;
      }
      return { transactionId: t.id, balanced: debit === credit && (t.entries ?? []).length > 0 };
    });

    const ok =
      merchants.every((m) => m.balanced) &&
      settlementChecks.every((s) => s.balanced) &&
      transactionChecks.every((t) => t.balanced);

    return {
      checkedAt: new Date().toISOString(),
      merchants,
      riders,
      settlements: settlementChecks,
      transactions: transactionChecks,
      ok,
    };
  }

  /* ================================================================== */
  /* Helpers                                                            */
  /* ================================================================== */

  /** Hub ids visible to the actor; null means every hub (admin). */
  private async visibleHubIds(actor: { id: string; role: string }): Promise<string[] | null> {
    if (actor.role === UserRole.ADMIN) return null;
    const assignments = await this.hubAssignmentRepo.find({
      where: { userId: actor.id, isActive: true },
      select: ["hubId"],
    });
    return assignments.map((a) => a.hubId);
  }

  private async lockWallet(manager: EntityManager, merchantId: string): Promise<Wallet> {
    let wallet = await manager
      .createQueryBuilder(Wallet, "wallet")
      .setLock("pessimistic_write")
      .where("wallet.merchant_id = :merchantId", { merchantId })
      .getOne();
    if (!wallet) {
      wallet = manager.create(Wallet, {
        merchantId,
        balance: 0,
        pendingBalance: 0,
        withdrawnTotal: 0,
        currency: CURRENCY_BDT,
        status: "ACTIVE",
      });
      await manager.save(wallet);
    }
    return wallet;
  }

  private async writeStatement(
    manager: EntityManager,
    entry: {
      walletId: string;
      type: WalletTransactionType;
      amountMinor: number;
      balanceAfterMinor: number;
      referenceType?: string;
      referenceId?: string;
      description?: string;
    },
  ): Promise<void> {
    await manager.getRepository(WalletTransaction).save(
      manager.getRepository(WalletTransaction).create({
        walletId: entry.walletId,
        type: entry.type,
        amount: toMajor(entry.amountMinor),
        balanceAfter: toMajor(entry.balanceAfterMinor),
        referenceType: entry.referenceType ?? null,
        referenceId: entry.referenceId ?? null,
        description: entry.description ?? "",
      }),
    );
  }

  /**
   * Releases a payout reservation back to available funds through reversal
   * postings — funds are never restored by mutating balances alone.
   */
  private async releaseReservation(
    manager: EntityManager,
    payout: PayoutRequest,
    merchantId: string,
    description: string,
  ): Promise<void> {
    const amountMinor = toMinor(payout.amount);
    await this.ledger.post(manager, {
      type: FinancialTransactionType.PAYOUT_RELEASE,
      referenceType: "PAYOUT",
      referenceId: payout.id,
      description,
      entries: [
        {
          account: FinancialAccount.MERCHANT_PAYOUT_IN_TRANSIT,
          direction: EntryDirection.DEBIT,
          amountMinor,
          merchantId,
        },
        {
          account: FinancialAccount.MERCHANT_AVAILABLE,
          direction: EntryDirection.CREDIT,
          amountMinor,
          merchantId,
        },
      ],
      createdBy: payout.processedBy,
    });

    const wallet = await this.lockWallet(manager, merchantId);
    wallet.balance = toMajor(toMinor(wallet.balance) + amountMinor);
    wallet.withdrawnTotal = toMajor(Math.max(0, toMinor(wallet.withdrawnTotal) - amountMinor));
    await manager.getRepository(Wallet).save(wallet);

    await this.writeStatement(manager, {
      walletId: wallet.id,
      type: WalletTransactionType.ADJUSTMENT_CREDIT,
      amountMinor,
      balanceAfterMinor: toMinor(wallet.balance),
      referenceType: "PAYOUT_REFUND",
      referenceId: payout.id,
      description,
    });
  }

  private async handInIdForLedger(
    manager: EntityManager,
    cashLedgerId: string,
  ): Promise<string | null> {
    const item = await manager.getRepository(CashHandInItem).findOne({
      where: { cashLedgerId },
    });
    return item?.handInId ?? null;
  }

  /**
   * Recomputes batch status after each verification: all items VERIFIED ->
   * VERIFIED, any mismatch -> DISCREPANCY with counted totals.
   */
  private async recomputeHandIn(
    manager: EntityManager,
    cashLedgerId: string,
    actorId: string,
  ): Promise<void> {
    const item = await manager.getRepository(CashHandInItem).findOne({
      where: { cashLedgerId },
    });
    if (!item?.handInId) return;

    const items = await manager.getRepository(CashHandInItem).find({
      where: { handInId: item.handInId },
    });
    const ledgerIds = items.map((i) => i.cashLedgerId);
    if (ledgerIds.length === 0) return;
    const ledgers = await manager.getRepository(CashLedger).find({
      where: { id: In(ledgerIds) },
    });

    const verified = ledgers.filter((l) => l.handInStatus === CashHandInStatus.VERIFIED);
    const mismatched = ledgers.filter((l) => l.handInStatus === CashHandInStatus.DISCREPANCY);
    const verifiedMinor = verified.reduce(
      (sum, l) => sum + toMinor(l.verifiedAmount ?? l.amount),
      0,
    );

    const batch = await manager.getRepository(CashHandIn).findOne({
      where: { id: item.handInId },
    });
    if (!batch) return;
    if (mismatched.length > 0) {
      batch.status = BatchStatus.DISCREPANCY;
    } else if (verified.length === ledgers.length) {
      batch.status = BatchStatus.VERIFIED;
      batch.verifiedAt = new Date();
      batch.verifiedBy = actorId;
    }
    batch.verifiedMinor = verifiedMinor;
    await manager.getRepository(CashHandIn).save(batch);
  }

  private async countHandInItems(handInIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (handInIds.length === 0) return counts;
    const rows = await this.handInItemRepo
      .createQueryBuilder("item")
      .select("item.handInId", "handInId")
      .addSelect("COUNT(item.id)", "count")
      .where("item.handInId IN (:...handInIds)", { handInIds })
      .groupBy("item.handInId")
      .getRawMany<{ handInId: string; count: string }>();
    for (const row of rows) counts.set(row.handInId, Number(row.count));
    return counts;
  }

  private async nextPayoutCode(manager: EntityManager): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `PAY-${Math.floor(100000 + Math.random() * 900000)}`;
      const existing = await manager.findOne(PayoutRequest, { where: { payoutCode: code } });
      if (!existing) return code;
    }
    return `PAY-${Date.now().toString().slice(-6)}`;
  }

  private async nextSettlementCode(manager: EntityManager): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `SET-${Math.floor(100000 + Math.random() * 900000)}`;
      const existing = await manager.findOne(Settlement, { where: { settlementCode: code } });
      if (!existing) return code;
    }
    return `SET-${Date.now().toString().slice(-6)}`;
  }

  private async nextBatchCode(manager: EntityManager): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `SET-${Math.floor(100000 + Math.random() * 900000)}`;
      const existing = await manager.findOne(SettlementBatch, { where: { settlementCode: code } });
      if (!existing) return code;
    }
    return `SET-${Date.now().toString().slice(-6)}`;
  }

  private toSettlementItem(settlement: Settlement, trackingCode: string): SettlementItem {
    return {
      id: settlement.id,
      settlementCode: settlement.settlementCode,
      merchantId: settlement.merchantId,
      parcelId: settlement.parcelId,
      trackingCode,
      cashLedgerId: settlement.cashLedgerId,
      grossMinor: Number(settlement.grossMinor),
      feeMinor: Number(settlement.feeMinor),
      netMinor: Number(settlement.netMinor),
      currency: settlement.currency,
      status: settlement.status,
      transactionId: settlement.transactionId,
      batchId: settlement.batchId,
      settledAt: settlement.settledAt.toISOString(),
    };
  }

  private toBatchItem(batch: SettlementBatch): SettlementBatchItem {
    return {
      id: batch.id,
      settlementCode: batch.settlementCode,
      merchantId: batch.merchantId,
      status: batch.status,
      grossMinor: Number(batch.grossMinor),
      feeMinor: Number(batch.feeMinor),
      netMinor: Number(batch.netMinor),
      settlementCount: batch.settlementCount,
      createdAt: batch.createdAt.toISOString(),
      completedAt: batch.completedAt?.toISOString() ?? null,
    };
  }

  private async findTransaction(
    manager: EntityManager,
    transactionId: string,
  ): Promise<FinancialTransactionItem | null> {
    const transaction = await manager.findOne(FinancialTransaction, {
      where: { id: transactionId },
      relations: ["entries"],
    });
    if (!transaction) return null;
    return this.toTransactionItem(transaction);
  }

  private toTransactionItem(transaction: FinancialTransaction): FinancialTransactionItem {
    return {
      id: transaction.id,
      transactionCode: transaction.transactionCode,
      type: transaction.type,
      status: transaction.status,
      referenceType: transaction.referenceType,
      referenceId: transaction.referenceId,
      description: transaction.description,
      reversalOfId: transaction.reversalOfId,
      reversedById: transaction.reversedById,
      createdBy: transaction.createdBy,
      createdAt: transaction.createdAt.toISOString(),
      entries: (transaction.entries ?? []).map((entry) => ({
        account: entry.account,
        direction: entry.direction,
        amountMinor: Number(entry.amountMinor),
        currency: entry.currency,
      })),
    };
  }

  // Payout and settlement fan-out now flows exclusively through the
  // transactional outbox (appended inside the money-moving transactions
  // above). The relay notifies merchants and publishes webhooks
  // asynchronously; provider outages can delay communication but never the
  // financial fact.
}
