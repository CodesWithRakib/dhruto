import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  CashLedger,
  WalletTransaction,
  PayoutRequest,
  Notification,
  WebhookSubscription,
  Parcel,
} from "../entities/index.js";
import {
  SEED_CASH_LEDGERS,
  SEED_WALLET_TRANSACTIONS,
  SEED_PAYOUT_REQUESTS,
} from "./seed-finance.data.js";
import { SEED_NOTIFICATIONS } from "./seed-notifications.data.js";
import { SEED_WEBHOOK_SUBSCRIPTIONS } from "./seed-webhooks.data.js";
import type { CoreSeedContext } from "./seed.types.js";

@Injectable()
export class SeedFinanceService {
  private readonly logger = new Logger(SeedFinanceService.name);

  constructor(
    @InjectRepository(CashLedger)
    private readonly cashLedgerRepo: Repository<CashLedger>,
    @InjectRepository(WalletTransaction)
    private readonly walletTxRepo: Repository<WalletTransaction>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRequestRepo: Repository<PayoutRequest>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(WebhookSubscription)
    private readonly webhookSubscriptionRepo: Repository<WebhookSubscription>,
  ) {}

  async seedFinance(
    ctx: CoreSeedContext,
    parcelMap: Map<string, Parcel>,
  ): Promise<Record<string, number>> {
    const now = Date.now();
    const stats: Record<string, number> = {};

    // 1. Cash Ledgers
    let cashLedgerCount = 0;
    for (const cData of SEED_CASH_LEDGERS) {
      const parcel = parcelMap.get(cData.trackingCode);
      const rider = ctx.riderMap.get(cData.riderEmail);
      const hub = ctx.hubMap.get(cData.hubCode);
      if (!parcel || !rider || !hub) continue;

      let ledger = await this.cashLedgerRepo.findOne({ where: { parcelId: parcel.id } });
      if (!ledger) {
        ledger = this.cashLedgerRepo.create({
          parcelId: parcel.id,
          riderId: rider.id,
          hubId: hub.id,
          amount: cData.amount,
          collectedAt: new Date(now - cData.hoursAgo * 3600 * 1000),
          handInStatus: cData.handInStatus,
          verifiedBy: hub.id,
          verifiedAt:
            cData.handInStatus === "VERIFIED"
              ? new Date(now - (cData.hoursAgo - 1) * 3600 * 1000)
              : null,
        });
        await this.cashLedgerRepo.save(ledger);
        cashLedgerCount++;
      }
    }
    stats.cashLedgers = cashLedgerCount;
    this.logger.log(`✓ Seeded ${cashLedgerCount} cash reconciliation ledgers`);

    // 2. Wallet Transactions
    let txCount = 0;
    for (const txData of SEED_WALLET_TRANSACTIONS) {
      const wallet = ctx.walletMap.get(txData.merchantEmail);
      if (!wallet) continue;

      const tx = this.walletTxRepo.create({
        walletId: wallet.id,
        type: txData.type,
        amount: txData.amount,
        balanceAfter: txData.balanceAfter,
        referenceType: txData.referenceType,
        referenceId: txData.referenceId,
        description: txData.description,
      });
      tx.createdAt = new Date(now - txData.hoursAgo * 3600 * 1000);
      await this.walletTxRepo.save(tx);
      txCount++;
    }
    stats.walletTransactions = txCount;
    this.logger.log(`✓ Seeded ${txCount} wallet transactions`);

    // 3. Payout Requests
    let payoutCount = 0;
    for (const pReq of SEED_PAYOUT_REQUESTS) {
      const merchant = ctx.merchantMap.get(pReq.merchantEmail);
      const wallet = ctx.walletMap.get(pReq.merchantEmail);
      if (!merchant || !wallet) continue;

      const payout = this.payoutRequestRepo.create({
        merchantId: merchant.id,
        walletId: wallet.id,
        amount: pReq.amount,
        payoutMethod: pReq.payoutMethod,
        accountDetails: pReq.accountDetails,
        status: pReq.status,
      });
      payout.createdAt = new Date(now - pReq.hoursAgo * 3600 * 1000);
      await this.payoutRequestRepo.save(payout);
      payoutCount++;
    }
    stats.payoutRequests = payoutCount;
    this.logger.log(`✓ Seeded ${payoutCount} payout requests`);

    // 4. Notifications
    let notifCount = 0;
    for (const nData of SEED_NOTIFICATIONS) {
      const merchant = ctx.merchantMap.get(nData.merchantEmail);
      if (!merchant) continue;

      const notif = this.notificationRepo.create({
        merchantId: merchant.id,
        channel: nData.channel,
        type: nData.type,
        title: nData.title,
        message: nData.message,
        readAt: nData.isRead ? new Date(now - nData.hoursAgo * 3600 * 1000) : null,
      });
      notif.createdAt = new Date(now - nData.hoursAgo * 3600 * 1000);
      await this.notificationRepo.save(notif);
      notifCount++;
    }
    stats.notifications = notifCount;
    this.logger.log(`✓ Seeded ${notifCount} in-app notifications`);

    // 5. Webhook Subscriptions
    let webhookCount = 0;
    for (const wData of SEED_WEBHOOK_SUBSCRIPTIONS) {
      const merchant = ctx.merchantMap.get(wData.merchantEmail);
      if (!merchant) continue;

      const existing = await this.webhookSubscriptionRepo.findOne({
        where: { merchantId: merchant.id, url: wData.url },
      });
      if (!existing) {
        const sub = this.webhookSubscriptionRepo.create({
          merchantId: merchant.id,
          url: wData.url,
          events: wData.events,
          secret: "dhr_whsec_seed00000000000000000000000000000000",
          description: wData.description,
          status: wData.status,
          failureCount: 0,
        });
        await this.webhookSubscriptionRepo.save(sub);
        webhookCount++;
      }
    }
    stats.webhookSubscriptions = webhookCount;
    this.logger.log(`✓ Seeded ${webhookCount} webhook subscriptions`);

    return stats;
  }
}
