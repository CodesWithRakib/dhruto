import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  Wallet,
  WalletTransaction,
  PayoutRequest,
  CashLedger,
  CashHandInStatus,
  Parcel,
  ParcelStatus,
  ParcelStatusHistory,
} from "../database/entities/index.js";
import {
  WalletTransactionType,
  PayoutStatus,
  type RequestPayoutDto,
  type VerifyCashLedgerDto,
  type ProcessPayoutDto,
  type MerchantWalletData,
  type WalletTransactionItem,
  type PayoutRequestItem,
  type PendingReconciliationItem,
} from "@dhruto/contracts";

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
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Resolves or initializes merchant wallet.
   */
  async getOrCreateWallet(merchantId: string): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({
      where: { merchantId },
    });

    if (!wallet) {
      wallet = this.walletRepo.create({
        merchantId,
        balance: 0,
        pendingBalance: 0,
        withdrawnTotal: 0,
        currency: "BDT",
        status: "ACTIVE",
      });
      await this.walletRepo.save(wallet);
      this.logger.log(`Initialized new merchant wallet for merchant: ${merchantId}`);
    }

    return wallet;
  }

  /**
   * Retrieves merchant wallet summary data.
   */
  async getMerchantWallet(merchantId: string): Promise<MerchantWalletData> {
    const wallet = await this.getOrCreateWallet(merchantId);

    // Calculate pending balance from parcels currently CASH_PENDING
    const pendingParcels = await this.parcelRepo.find({
      where: {
        merchantId,
        status: ParcelStatus.CASH_PENDING,
      },
    });

    const pendingCodTotal = pendingParcels.reduce((sum, p) => {
      const net = Math.max(0, Number(p.codAmount) - Number(p.deliveryFee));
      return sum + net;
    }, 0);

    return {
      id: wallet.id,
      merchantId: wallet.merchantId,
      balance: Number(wallet.balance),
      pendingBalance: pendingCodTotal,
      withdrawnTotal: Number(wallet.withdrawnTotal),
      currency: wallet.currency,
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieves wallet transaction statement.
   */
  async getWalletTransactions(walletId: string, limit = 50): Promise<WalletTransactionItem[]> {
    const txs = await this.transactionRepo.find({
      where: { walletId },
      order: { createdAt: "DESC" },
      take: limit,
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

  /**
   * Merchant submits payout withdrawal request using pessimistic concurrency locking.
   */
  async requestPayout(merchantId: string, dto: RequestPayoutDto): Promise<PayoutRequest> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Pessimistic row locking on wallet
      let wallet = await queryRunner.manager
        .createQueryBuilder(Wallet, "wallet")
        .setLock("pessimistic_write")
        .where("wallet.merchant_id = :merchantId", { merchantId })
        .getOne();

      if (!wallet) {
        wallet = queryRunner.manager.create(Wallet, {
          merchantId,
          balance: 0,
          pendingBalance: 0,
          withdrawnTotal: 0,
          currency: "BDT",
          status: "ACTIVE",
        });
        await queryRunner.manager.save(wallet);
      }

      const availableBalance = Number(wallet.balance);
      const requestedAmount = Number(dto.amount);

      if (requestedAmount <= 0) {
        throw new BadRequestException("Requested amount must be greater than 0");
      }

      if (availableBalance < requestedAmount) {
        throw new BadRequestException(
          `Insufficient available balance. Available: ৳${availableBalance}, Requested: ৳${requestedAmount}`,
        );
      }

      // 2. Deduct balance and record withdrawal
      const balanceAfter = availableBalance - requestedAmount;
      wallet.balance = balanceAfter;
      wallet.withdrawnTotal = Number(wallet.withdrawnTotal) + requestedAmount;
      await queryRunner.manager.save(wallet);

      // 3. Insert immutable wallet transaction
      const transaction = queryRunner.manager.create(WalletTransaction, {
        walletId: wallet.id,
        type: WalletTransactionType.PAYOUT_DEBIT,
        amount: requestedAmount,
        balanceAfter,
        referenceType: "PAYOUT",
        description: `Payout withdrawal request via ${dto.payoutMethod} to ${dto.accountDetails.accountNumber}`,
      });
      await queryRunner.manager.save(transaction);

      // 4. Create payout request record
      const payout = queryRunner.manager.create(PayoutRequest, {
        merchantId,
        walletId: wallet.id,
        amount: requestedAmount,
        payoutMethod: dto.payoutMethod,
        accountDetails: dto.accountDetails,
        status: PayoutStatus.REQUESTED,
        notes: dto.notes || null,
      });
      await queryRunner.manager.save(payout);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Merchant ${merchantId} requested payout of ৳${requestedAmount} via ${dto.payoutMethod}`,
      );

      return payout;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retrieves merchant payout history.
   */
  async getMerchantPayouts(merchantId: string): Promise<PayoutRequestItem[]> {
    const payouts = await this.payoutRepo.find({
      where: { merchantId },
      order: { createdAt: "DESC" },
    });

    return payouts.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      payoutMethod: p.payoutMethod,
      accountDetails: p.accountDetails as any,
      status: p.status,
      transactionReference: p.transactionReference || undefined,
      rejectionReason: p.rejectionReason || undefined,
      createdAt: p.createdAt.toISOString(),
      processedAt: p.processedAt?.toISOString(),
    }));
  }

  /**
   * Lists all pending cash hand-ins waiting for Hub Manager reconciliation.
   */
  async getPendingReconciliations(): Promise<PendingReconciliationItem[]> {
    const ledgers = await this.cashLedgerRepo.find({
      where: [
        { handInStatus: CashHandInStatus.HANDED_IN },
        { handInStatus: CashHandInStatus.PENDING },
      ],
      relations: [
        "parcel",
        "parcel.merchant",
        "rider",
        "rider.user",
        "hub",
      ],
      order: { collectedAt: "DESC" },
    });

    return ledgers.map((l) => {
      const amount = Number(l.amount);
      const deliveryFee = Number(l.parcel?.deliveryFee || 0);
      const netPayable = Math.max(0, amount - deliveryFee);

      return {
        id: l.id,
        parcelId: l.parcelId,
        trackingCode: l.parcel?.trackingCode || "N/A",
        recipientName: l.parcel?.recipientName || "N/A",
        merchantName: l.parcel?.merchant?.businessName || "Merchant",
        riderName: l.rider?.user?.name || "Rider",
        hubName: l.hub?.name || "Sorting Hub",
        amount,
        deliveryFee,
        netPayable,
        collectedAt: l.collectedAt.toISOString(),
        handInStatus: l.handInStatus,
      };
    });
  }

  /**
   * Hub Manager verifies cash received from rider and settles COD to merchant wallet.
   */
  async verifyCashHandIn(
    dto: VerifyCashLedgerDto,
    userId: string,
  ): Promise<{
    cashLedger: CashLedger;
    netSettled: number;
    newWalletBalance: number;
    message: string;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ledger = await queryRunner.manager.findOne(CashLedger, {
        where: { id: dto.cashLedgerId },
        relations: ["parcel", "parcel.merchant"],
      });

      if (!ledger) {
        throw new NotFoundException("Cash ledger record not found");
      }

      if (ledger.handInStatus === CashHandInStatus.VERIFIED) {
        throw new BadRequestException("This cash ledger entry is already verified");
      }

      const parcel = ledger.parcel;
      if (!parcel) {
        throw new NotFoundException("Linked parcel record not found");
      }

      const merchant = parcel.merchant;
      if (!merchant) {
        throw new NotFoundException("Linked merchant account not found");
      }

      const verifiedCodAmount = dto.actualAmount !== undefined
        ? Number(dto.actualAmount)
        : Number(ledger.amount);

      const deliveryFee = Number(parcel.deliveryFee);
      const netSettled = Math.max(0, verifiedCodAmount - deliveryFee);

      // 1. Mark cash ledger as VERIFIED
      ledger.handInStatus = CashHandInStatus.VERIFIED;
      ledger.verifiedBy = userId;
      ledger.verifiedAt = new Date();
      ledger.amount = verifiedCodAmount;
      await queryRunner.manager.save(ledger);

      // 2. Lock & Settle to Merchant Wallet
      let wallet = await queryRunner.manager
        .createQueryBuilder(Wallet, "wallet")
        .setLock("pessimistic_write")
        .where("wallet.merchant_id = :merchantId", { merchantId: merchant.id })
        .getOne();

      if (!wallet) {
        wallet = queryRunner.manager.create(Wallet, {
          merchantId: merchant.id,
          balance: 0,
          pendingBalance: 0,
          withdrawnTotal: 0,
          currency: "BDT",
          status: "ACTIVE",
        });
        await queryRunner.manager.save(wallet);
      }

      const prevBalance = Number(wallet.balance);
      const newBalance = prevBalance + netSettled;
      wallet.balance = newBalance;
      await queryRunner.manager.save(wallet);

      // 3. Record Double-Entry Transactions
      // 3a. COD Credit
      const creditTx = queryRunner.manager.create(WalletTransaction, {
        walletId: wallet.id,
        type: WalletTransactionType.COD_CREDIT,
        amount: verifiedCodAmount,
        balanceAfter: prevBalance + verifiedCodAmount,
        referenceType: "PARCEL",
        referenceId: parcel.trackingCode,
        description: `COD collection verified for parcel ${parcel.trackingCode}`,
      });
      await queryRunner.manager.save(creditTx);

      // 3b. Delivery Fee Debit
      if (deliveryFee > 0) {
        const feeTx = queryRunner.manager.create(WalletTransaction, {
          walletId: wallet.id,
          type: WalletTransactionType.DELIVERY_FEE,
          amount: deliveryFee,
          balanceAfter: newBalance,
          referenceType: "PARCEL",
          referenceId: parcel.trackingCode,
          description: `Delivery charge deducted for parcel ${parcel.trackingCode}`,
        });
        await queryRunner.manager.save(feeTx);
      }

      // 4. Update Parcel status to CASH_VERIFIED
      const fromStatus = parcel.status;
      parcel.status = ParcelStatus.CASH_VERIFIED;
      await queryRunner.manager.save(parcel);

      // 5. Record status history
      const history = queryRunner.manager.create(ParcelStatusHistory, {
        parcelId: parcel.id,
        fromStatus,
        toStatus: ParcelStatus.CASH_VERIFIED,
        changedBy: userId,
        changedByRole: "HUB_MANAGER",
        reason: `Cash verified (৳${verifiedCodAmount}). Settled ৳${netSettled} to merchant wallet.`,
        metadata: {
          cashLedgerId: ledger.id,
          verifiedAmount: verifiedCodAmount,
          deliveryFee,
          netSettled,
        },
      });
      await queryRunner.manager.save(history);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Reconciled cash for parcel ${parcel.trackingCode}: COD ৳${verifiedCodAmount}, fee ৳${deliveryFee}, settled ৳${netSettled} to ${merchant.businessName}`,
      );

      return {
        cashLedger: ledger,
        netSettled,
        newWalletBalance: newBalance,
        message: `Cash verified. ৳${netSettled} settled to ${merchant.businessName} wallet.`,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Admin processes or completes a payout withdrawal request.
   */
  async processPayout(
    payoutId: string,
    dto: ProcessPayoutDto,
    userId: string,
  ): Promise<PayoutRequest> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutId },
      relations: ["wallet"],
    });

    if (!payout) {
      throw new NotFoundException("Payout request not found");
    }

    if (payout.status !== PayoutStatus.REQUESTED && payout.status !== PayoutStatus.PROCESSING) {
      throw new BadRequestException(`Cannot process payout in status "${payout.status}"`);
    }

    if (dto.status === PayoutStatus.COMPLETED) {
      payout.status = PayoutStatus.COMPLETED;
      payout.processedBy = userId;
      payout.processedAt = new Date();
      payout.transactionReference = dto.transactionReference || null;
      await this.payoutRepo.save(payout);

      this.logger.log(
        `Payout ${payout.id} (৳${payout.amount}) marked as COMPLETED. Ref: ${dto.transactionReference}`,
      );
    } else if (dto.status === PayoutStatus.REJECTED) {
      // Refund the deducted amount back to the merchant wallet
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        payout.status = PayoutStatus.REJECTED;
        payout.processedBy = userId;
        payout.processedAt = new Date();
        payout.rejectionReason = dto.rejectionReason || "Rejected by administrator";
        await queryRunner.manager.save(payout);

        const wallet = await queryRunner.manager
          .createQueryBuilder(Wallet, "wallet")
          .setLock("pessimistic_write")
          .where("wallet.id = :walletId", { walletId: payout.walletId })
          .getOne();

        if (wallet) {
          const refundedAmount = Number(payout.amount);
          const newBalance = Number(wallet.balance) + refundedAmount;
          wallet.balance = newBalance;
          wallet.withdrawnTotal = Math.max(0, Number(wallet.withdrawnTotal) - refundedAmount);
          await queryRunner.manager.save(wallet);

          const refundTx = queryRunner.manager.create(WalletTransaction, {
            walletId: wallet.id,
            type: WalletTransactionType.ADJUSTMENT_CREDIT,
            amount: refundedAmount,
            balanceAfter: newBalance,
            referenceType: "PAYOUT_REFUND",
            referenceId: payout.id,
            description: `Refund for rejected payout: ${dto.rejectionReason || "Admin rejection"}`,
          });
          await queryRunner.manager.save(refundTx);
        }

        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    }

    return payout;
  }

  /**
   * System-wide reconciliation metrics.
   */
  async getReconciliationSummary() {
    const wallets = await this.walletRepo.find();
    const totalMerchantBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    const allLedgers = await this.cashLedgerRepo.find();
    const verifiedLedgers = allLedgers.filter(
      (l) => l.handInStatus === CashHandInStatus.VERIFIED,
    );
    const pendingLedgers = allLedgers.filter(
      (l) => l.handInStatus === CashHandInStatus.PENDING || l.handInStatus === CashHandInStatus.HANDED_IN,
    );

    const totalVerifiedCod = verifiedLedgers.reduce((sum, l) => sum + Number(l.amount), 0);
    const totalPendingCod = pendingLedgers.reduce((sum, l) => sum + Number(l.amount), 0);

    const payouts = await this.payoutRepo.find({
      where: { status: PayoutStatus.COMPLETED },
    });
    const totalDisbursedPayouts = payouts.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalWallets: wallets.length,
      totalMerchantBalance,
      totalVerifiedCod,
      totalPendingCod,
      totalDisbursedPayouts,
      pendingReconciliationsCount: pendingLedgers.length,
      verifiedReconciliationsCount: verifiedLedgers.length,
    };
  }
}
