import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  User,
  Merchant,
  Hub,
  Rider,
  Wallet,
  HubUserAssignment,
  FinancialTransaction,
  FinancialEntry,
} from "../entities/index.js";
import {
  FinancialTransactionType,
  FinancialTransactionStatus,
  FinancialAccount,
  EntryDirection,
} from "@dhruto/contracts";
import { SEED_HUBS, SEED_HUB_ASSIGNMENTS } from "./seed-hubs.data.js";
import { SEED_USERS } from "./seed-users.data.js";
import { SEED_MERCHANTS } from "./seed-merchants.data.js";
import { SEED_WALLETS } from "./seed-wallets.data.js";
import { SEED_RIDERS } from "./seed-riders.data.js";
import type { CoreSeedContext } from "./seed.types.js";

@Injectable()
export class SeedCoreService {
  private readonly logger = new Logger(SeedCoreService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Hub)
    private readonly hubRepo: Repository<Hub>,
    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(HubUserAssignment)
    private readonly hubAssignmentRepo: Repository<HubUserAssignment>,
    @InjectRepository(FinancialTransaction)
    private readonly financialTxRepo: Repository<FinancialTransaction>,
    @InjectRepository(FinancialEntry)
    private readonly financialEntryRepo: Repository<FinancialEntry>,
  ) {}

  async seedCore(passwordHash: string): Promise<CoreSeedContext> {
    const stats: Record<string, number> = {};

    // 1. Hubs
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

    // 2. Users
    const userMap = new Map<string, User>();
    for (const userData of SEED_USERS) {
      let user = await this.userRepo.findOne({ where: { email: userData.email } });
      if (!user) {
        user = this.userRepo.create({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          passwordHash,
          role: userData.role,
          status: userData.status,
        });
      } else {
        user.name = userData.name;
        user.phone = userData.phone;
        user.passwordHash = passwordHash;
        user.role = userData.role;
        user.status = userData.status;
      }
      await this.userRepo.save(user);
      userMap.set(user.email, user);
    }
    stats.users = userMap.size;
    this.logger.log(`✓ Seeded ${stats.users} role-based user accounts`);

    // 3. Merchants
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

    // 4. Wallets
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
        await this.walletRepo.save(wallet);
      }
      await this.ensureSeedOpeningBalance(merchant.id, Number(wallet.balance));
      walletMap.set(wData.merchantEmail, wallet);
      walletCount++;
    }
    stats.wallets = walletCount;
    this.logger.log(`✓ Seeded ${stats.wallets} merchant wallets`);

    // 5. Riders
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

    // 6. Hub Assignments
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

    return { hubMap, userMap, merchantMap, riderMap, walletMap, stats };
  }

  private async ensureSeedOpeningBalance(merchantId: string, balance: number): Promise<void> {
    const existing = await this.financialTxRepo.findOne({
      where: { referenceType: "OPENING_BALANCE", referenceId: merchantId },
    });
    if (existing) return;

    const derived: Array<{ derived: string }> = await this.financialEntryRepo.query(
      `SELECT COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount_minor ELSE -amount_minor END), 0) AS derived
       FROM financial_entries WHERE merchant_id = $1 AND account = 'MERCHANT_AVAILABLE'`,
      [merchantId],
    );
    const gap = Math.round(balance * 100) - Number(derived[0]?.derived ?? 0);
    if (gap === 0) return;

    const code = `FIN-OP${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    const transaction = await this.financialTxRepo.save(
      this.financialTxRepo.create({
        transactionCode: code,
        type: FinancialTransactionType.ADJUSTMENT,
        status: FinancialTransactionStatus.POSTED,
        referenceType: "OPENING_BALANCE",
        referenceId: merchantId,
        description: "Seed opening balance adoption",
        createdBy: null,
      }),
    );
    const legs =
      gap > 0
        ? [
            {
              account: FinancialAccount.ADJUSTMENT,
              direction: EntryDirection.DEBIT,
              amountMinor: gap,
              merchantId: null,
            },
            {
              account: FinancialAccount.MERCHANT_AVAILABLE,
              direction: EntryDirection.CREDIT,
              amountMinor: gap,
              merchantId,
            },
          ]
        : [
            {
              account: FinancialAccount.MERCHANT_AVAILABLE,
              direction: EntryDirection.DEBIT,
              amountMinor: -gap,
              merchantId,
            },
            {
              account: FinancialAccount.ADJUSTMENT,
              direction: EntryDirection.CREDIT,
              amountMinor: -gap,
              merchantId: null,
            },
          ];
    await this.financialEntryRepo.save(
      legs.map((leg) =>
        this.financialEntryRepo.create({
          transactionId: transaction.id,
          account: leg.account,
          direction: leg.direction,
          amountMinor: leg.amountMinor,
          currency: "BDT",
          merchantId: leg.merchantId,
          memo: "Seed opening balance adoption",
        }),
      ),
    );
  }
}
