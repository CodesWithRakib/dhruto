import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import {
  User,
  Merchant,
  Hub,
  Rider,
  Parcel,
  ParcelStatusHistory,
  CashLedger,
  Wallet,
  WalletTransaction,
  PayoutRequest,
  Notification,
  HubUserAssignment,
} from '../entities/index.js';

import { SEED_HUB_ASSIGNMENTS, SEED_HUBS } from './seed-hubs.data.js';
import { SEED_USERS } from './seed-users.data.js';
import { SEED_MERCHANTS } from './seed-merchants.data.js';
import { SEED_RIDERS } from './seed-riders.data.js';
import { SEED_WALLETS } from './seed-wallets.data.js';
import { SEED_PARCELS } from './seed-parcels.data.js';
import {
  SEED_CASH_LEDGERS,
  SEED_WALLET_TRANSACTIONS,
  SEED_PAYOUT_REQUESTS,
} from './seed-finance.data.js';
import { SEED_NOTIFICATIONS } from './seed-notifications.data.js';
import { ParcelStatus } from '@dhruto/contracts';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Hub)
    private readonly hubRepo: Repository<Hub>,
    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(ParcelStatusHistory)
    private readonly statusHistoryRepo: Repository<ParcelStatusHistory>,
    @InjectRepository(CashLedger)
    private readonly cashLedgerRepo: Repository<CashLedger>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly walletTxRepo: Repository<WalletTransaction>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRequestRepo: Repository<PayoutRequest>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(HubUserAssignment)
    private readonly hubAssignmentRepo: Repository<HubUserAssignment>,
  ) {}

  async seed() {
    this.logger.log('Starting deterministic production database seeding...');
    const stats: Record<string, number> = {};

    const defaultPasswordHash = await bcrypt.hash('dhruto123', 10);

    // 1. Seed Hubs
    const hubMap = new Map<string, Hub>();
    for (const hubData of SEED_HUBS) {
      let hub = await this.hubRepo.findOne({ where: { code: hubData.code } });
      if (!hub) {
        hub = this.hubRepo.create(hubData);
      } else {
        hub.name = hubData.name;
        hub.address = hubData.address;
        hub.status = hubData.status;
        hub.type = hubData.type;
        hub.district = hubData.district;
        hub.thana = hubData.thana;
      }
      await this.hubRepo.save(hub);
      hubMap.set(hub.code, hub);
    }
    stats.hubs = hubMap.size;
    this.logger.log(`✓ Seeded ${stats.hubs} logistics hubs`);

    // 2. Seed Users
    const userMap = new Map<string, User>();
    for (const userData of SEED_USERS) {
      let user = await this.userRepo.findOne({ where: { email: userData.email } });
      if (!user) {
        user = this.userRepo.create({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          passwordHash: defaultPasswordHash,
          role: userData.role,
          status: userData.status,
        });
      } else {
        user.name = userData.name;
        user.phone = userData.phone;
        user.passwordHash = defaultPasswordHash;
        user.role = userData.role;
        user.status = userData.status;
      }
      await this.userRepo.save(user);
      userMap.set(user.email, user);
    }
    stats.users = userMap.size;
    this.logger.log(`✓ Seeded ${stats.users} role-based user accounts`);

    // 3. Seed Merchants
    const merchantMap = new Map<string, Merchant>();
    for (const mData of SEED_MERCHANTS) {
      const user = userMap.get(mData.userEmail);
      if (!user) continue;

      let merchant = await this.merchantRepo.findOne({ where: { userId: user.id } });
      if (!merchant) {
        merchant = this.merchantRepo.create({
          userId: user.id,
          businessName: mData.businessName,
          contactPhone: mData.contactPhone,
          pickupAddress: mData.pickupAddress,
          status: mData.status,
        });
      } else {
        merchant.businessName = mData.businessName;
        merchant.contactPhone = mData.contactPhone;
        merchant.pickupAddress = mData.pickupAddress;
        merchant.status = mData.status;
      }
      await this.merchantRepo.save(merchant);
      merchantMap.set(mData.userEmail, merchant);
    }
    stats.merchants = merchantMap.size;
    this.logger.log(`✓ Seeded ${stats.merchants} merchant profiles`);

    // 4. Seed Wallets
    let walletCount = 0;
    const walletMap = new Map<string, Wallet>();
    for (const wData of SEED_WALLETS) {
      const merchant = merchantMap.get(wData.merchantEmail);
      if (!merchant) continue;

      let wallet = await this.walletRepo.findOne({ where: { merchantId: merchant.id } });
      if (!wallet) {
        wallet = this.walletRepo.create({
          merchantId: merchant.id,
          balance: wData.balance,
          pendingBalance: wData.pendingBalance,
          withdrawnTotal: wData.withdrawnTotal,
          currency: wData.currency,
          status: wData.status,
        });
      } else {
        wallet.balance = wData.balance;
        wallet.pendingBalance = wData.pendingBalance;
        wallet.withdrawnTotal = wData.withdrawnTotal;
      }
      await this.walletRepo.save(wallet);
      walletMap.set(wData.merchantEmail, wallet);
      walletCount++;
    }
    stats.wallets = walletCount;
    this.logger.log(`✓ Seeded ${stats.wallets} merchant wallets`);

    // 5. Seed Riders
    const riderMap = new Map<string, Rider>();
    for (const rData of SEED_RIDERS) {
      const user = userMap.get(rData.userEmail);
      const hub = hubMap.get(rData.hubCode);
      if (!user || !hub) continue;

      let rider = await this.riderRepo.findOne({ where: { userId: user.id } });
      if (!rider) {
        rider = this.riderRepo.create({
          userId: user.id,
          hubId: hub.id,
          status: rData.status,
          riderCode: rData.riderCode,
        });
      } else {
        rider.hubId = hub.id;
        rider.status = rData.status;
        if (!rider.riderCode) rider.riderCode = rData.riderCode;
      }
      await this.riderRepo.save(rider);
      riderMap.set(rData.userEmail, rider);
    }
    stats.riders = riderMap.size;
    this.logger.log(`✓ Seeded ${stats.riders} delivery fleet riders`);

    // 5b. Seed hub user assignments (hub authorization).
    let assignmentCount = 0;
    for (const assignmentData of SEED_HUB_ASSIGNMENTS) {
      const user = userMap.get(assignmentData.userEmail);
      const hub = hubMap.get(assignmentData.hubCode);
      if (!user || !hub) continue;

      let assignment = await this.hubAssignmentRepo.findOne({
        where: { userId: user.id, hubId: hub.id },
      });
      if (!assignment) {
        assignment = this.hubAssignmentRepo.create({
          userId: user.id,
          hubId: hub.id,
          permissions: assignmentData.permissions,
          isActive: true,
        });
      } else {
        assignment.permissions = assignmentData.permissions;
        assignment.isActive = true;
      }
      await this.hubAssignmentRepo.save(assignment);
      assignmentCount++;
    }
    stats.hubAssignments = assignmentCount;
    this.logger.log(`✓ Seeded ${stats.hubAssignments} hub user assignments`);

    // 6. Seed Parcels & Status Histories
    let parcelCount = 0;
    let historyCount = 0;
    const parcelMap = new Map<string, Parcel>();
    const now = Date.now();

    for (const pData of SEED_PARCELS) {
      const merchant = merchantMap.get(pData.merchantEmail);
      if (!merchant) continue;

      const rider = pData.riderEmail ? riderMap.get(pData.riderEmail) : null;
      const hub = pData.hubCode ? hubMap.get(pData.hubCode) : null;

      const createdAt = new Date(now - pData.createdAtOffsetHours * 3600 * 1000);

      let parcel = await this.parcelRepo.findOne({ where: { trackingCode: pData.trackingCode } });
      if (!parcel) {
        parcel = this.parcelRepo.create({
          trackingCode: pData.trackingCode,
          merchantId: merchant.id,
          currentRiderId: rider ? rider.id : null,
          currentHubId: hub ? hub.id : null,
          recipientName: pData.recipientName,
          recipientPhone: pData.recipientPhone,
          rawAddress: pData.rawAddress,
          district: pData.district,
          thana: pData.thana,
          normalizedAddress: {
            district: pData.district,
            thana: pData.thana,
            division: 'Dhaka',
            formattedAddress: pData.rawAddress,
          },
          weight: pData.weight,
          codAmount: pData.codAmount,
          deliveryFee: pData.deliveryFee,
          status: pData.status,
        });
      } else {
        parcel.merchantId = merchant.id;
        parcel.currentRiderId = rider ? rider.id : null;
        parcel.currentHubId = hub ? hub.id : null;
        parcel.recipientName = pData.recipientName;
        parcel.recipientPhone = pData.recipientPhone;
        parcel.rawAddress = pData.rawAddress;
        parcel.district = pData.district;
        parcel.thana = pData.thana;
        parcel.weight = pData.weight;
        parcel.codAmount = pData.codAmount;
        parcel.deliveryFee = pData.deliveryFee;
        parcel.status = pData.status;
      }
      parcel.createdAt = createdAt;
      await this.parcelRepo.save(parcel);
      parcelMap.set(parcel.trackingCode, parcel);
      parcelCount++;

      // Ensure chronological history events
      const existingHistory = await this.statusHistoryRepo.find({ where: { parcelId: parcel.id } });
      if (existingHistory.length === 0) {
        const historySteps: { toStatus: ParcelStatus; fromStatus: ParcelStatus | null; role: string; reason: string; hoursAgo: number }[] = [];

        // Always started with CREATED
        historySteps.push({
          toStatus: ParcelStatus.CREATED,
          fromStatus: null,
          role: 'MERCHANT',
          reason: 'Shipment booked via merchant portal',
          hoursAgo: pData.createdAtOffsetHours,
        });

        if (pData.status !== ParcelStatus.CREATED && pData.status !== ParcelStatus.CANCELLED) {
          historySteps.push({
            toStatus: ParcelStatus.ASSIGNED_TO_RIDER,
            fromStatus: ParcelStatus.CREATED,
            role: 'HUB_MANAGER',
            reason: 'Pickup rider assigned for collection',
            hoursAgo: Math.max(1, pData.createdAtOffsetHours - 1),
          });
          historySteps.push({
            toStatus: ParcelStatus.PICKED_UP,
            fromStatus: ParcelStatus.ASSIGNED_TO_RIDER,
            role: 'RIDER',
            reason: 'Parcel collected from merchant warehouse',
            hoursAgo: Math.max(1, pData.createdAtOffsetHours - 2),
          });
          historySteps.push({
            toStatus: ParcelStatus.ORIGIN_HUB_RECEIVED,
            fromStatus: ParcelStatus.PICKED_UP,
            role: 'HUB_MANAGER',
            reason: 'Inbound scanning completed at sorting hub',
            hoursAgo: Math.max(1, pData.createdAtOffsetHours - 3),
          });
        }

        if (pData.status === ParcelStatus.IN_TRANSIT || pData.status === ParcelStatus.DESTINATION_HUB_RECEIVED || pData.status === ParcelStatus.OUT_FOR_DELIVERY || pData.status === ParcelStatus.DELIVERED) {
          historySteps.push({
            toStatus: ParcelStatus.IN_TRANSIT,
            fromStatus: ParcelStatus.ORIGIN_HUB_RECEIVED,
            role: 'HUB_MANAGER',
            reason: 'Consolidated into manifest dispatch vehicle',
            hoursAgo: Math.max(1, pData.createdAtOffsetHours - 5),
          });
          historySteps.push({
            toStatus: ParcelStatus.DESTINATION_HUB_RECEIVED,
            fromStatus: ParcelStatus.IN_TRANSIT,
            role: 'HUB_MANAGER',
            reason: 'Received and verified at local destination hub',
            hoursAgo: Math.max(1, pData.createdAtOffsetHours - 7),
          });
        }

        if (pData.status === ParcelStatus.OUT_FOR_DELIVERY || pData.status === ParcelStatus.DELIVERED) {
          historySteps.push({
            toStatus: ParcelStatus.OUT_FOR_DELIVERY,
            fromStatus: ParcelStatus.DESTINATION_HUB_RECEIVED,
            role: 'RIDER',
            reason: 'Assigned to delivery run with OTP verification',
            hoursAgo: Math.max(1, pData.createdAtOffsetHours - 9),
          });
        }

        if (pData.status === ParcelStatus.DELIVERED) {
          historySteps.push({
            toStatus: ParcelStatus.DELIVERED,
            fromStatus: ParcelStatus.OUT_FOR_DELIVERY,
            role: 'RIDER',
            reason: 'Delivered to recipient. Cash collected.',
            hoursAgo: Math.max(0.5, pData.createdAtOffsetHours - 10),
          });
        }

        for (const step of historySteps) {
          const h = this.statusHistoryRepo.create({
            parcelId: parcel.id,
            fromStatus: step.fromStatus,
            toStatus: step.toStatus,
            eventType: step.fromStatus === null ? 'PARCEL_CREATED' : 'STATUS_CHANGED',
            actorId: merchant.userId,
            actorRole: step.role,
            description: step.reason,
            metadata: {},
          });
          h.createdAt = new Date(now - step.hoursAgo * 3600 * 1000);
          await this.statusHistoryRepo.save(h);
          historyCount++;
        }
      }
    }
    stats.parcels = parcelCount;
    stats.statusHistories = historyCount;
    this.logger.log(`✓ Seeded ${stats.parcels} parcels and ${stats.statusHistories} chronological history records`);

    // 7. Seed Cash Ledgers
    let cashLedgerCount = 0;
    for (const cData of SEED_CASH_LEDGERS) {
      const parcel = parcelMap.get(cData.trackingCode);
      const rider = riderMap.get(cData.riderEmail);
      const hub = hubMap.get(cData.hubCode);
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
          verifiedAt: cData.handInStatus === 'VERIFIED' ? new Date(now - (cData.hoursAgo - 1) * 3600 * 1000) : null,
        });
        await this.cashLedgerRepo.save(ledger);
        cashLedgerCount++;
      }
    }
    stats.cashLedgers = cashLedgerCount;
    this.logger.log(`✓ Seeded ${stats.cashLedgers} cash reconciliation ledgers`);

    // 8. Seed Wallet Transactions
    let txCount = 0;
    for (const txData of SEED_WALLET_TRANSACTIONS) {
      const wallet = walletMap.get(txData.merchantEmail);
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
    this.logger.log(`✓ Seeded ${stats.walletTransactions} wallet transactions`);

    // 9. Seed Payout Requests
    let payoutCount = 0;
    for (const pReq of SEED_PAYOUT_REQUESTS) {
      const merchant = merchantMap.get(pReq.merchantEmail);
      const wallet = walletMap.get(pReq.merchantEmail);
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
    this.logger.log(`✓ Seeded ${stats.payoutRequests} payout requests`);

    // 10. Seed Notifications
    let notifCount = 0;
    for (const nData of SEED_NOTIFICATIONS) {
      const merchant = merchantMap.get(nData.merchantEmail);
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
    this.logger.log(`✓ Seeded ${stats.notifications} in-app notifications`);

    return {
      success: true,
      stats,
    };
  }
}
