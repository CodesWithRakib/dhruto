import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Merchant,
  MerchantStatus,
  Parcel,
  ParcelStatus,
  User,
} from "../database/entities/index.js";
import { UpdateMerchantDto } from "./dto/update-merchant.dto.js";

const PENDING_STATUSES = [
  ParcelStatus.CREATED,
  ParcelStatus.PICKUP_REQUESTED,
  ParcelStatus.PICKUP_ASSIGNED,
];

const IN_TRANSIT_STATUSES = [
  ParcelStatus.PICKED_UP,
  ParcelStatus.ORIGIN_HUB_RECEIVED,
  ParcelStatus.BAGGED,
  ParcelStatus.IN_TRANSIT,
  ParcelStatus.DESTINATION_HUB_RECEIVED,
  ParcelStatus.ASSIGNED_TO_RIDER,
  ParcelStatus.OUT_FOR_DELIVERY,
  ParcelStatus.DELIVERY_ATTEMPTED,
  ParcelStatus.RESCHEDULED,
];

const DELIVERED_STATUSES = [
  ParcelStatus.DELIVERED,
  ParcelStatus.CASH_PENDING,
  ParcelStatus.CASH_VERIFIED,
];

const RETURNED_STATUSES = [
  ParcelStatus.RTO_INITIATED,
  ParcelStatus.RETURN_IN_TRANSIT,
  ParcelStatus.RETURNED_TO_MERCHANT,
];

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);

  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Retrieves or automatically provisions a merchant profile for an authenticated user.
   */
  async getOrCreateMerchantForUser(userId: string): Promise<Merchant> {
    let merchant = await this.merchantRepo.findOne({
      where: { userId },
      relations: ["user"],
    });

    if (!merchant) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException("User not found");
      }

      merchant = this.merchantRepo.create({
        userId: user.id,
        businessName: `${user.name}'s Shop`,
        contactPhone: user.phone,
        status: MerchantStatus.ACTIVE,
        pickupAddress: "Dhaka Central Warehouse",
      });

      await this.merchantRepo.save(merchant);
      merchant.user = user;
      this.logger.log(`Created new merchant profile for user "${user.email}" (${user.id})`);
    }

    return merchant;
  }

  /**
   * Retrieves merchant profile by user ID.
   */
  async getProfile(userId: string): Promise<Merchant> {
    return this.getOrCreateMerchantForUser(userId);
  }

  /**
   * Finds an existing merchant profile by user ID without auto-creating.
   */
  async findByUserId(userId: string): Promise<Merchant | null> {
    return this.merchantRepo.findOne({
      where: { userId },
      relations: ["user"],
    });
  }

  /**
   * Retrieves the first/default merchant profile for demo fallback.
   */
  async getDefaultMerchant(): Promise<Merchant | null> {
    return this.merchantRepo.findOne({
      where: {},
      order: { createdAt: "ASC" },
      relations: ["user"],
    });
  }

  /**
   * Updates merchant business profile.
   */
  async updateProfile(userId: string, dto: UpdateMerchantDto): Promise<Merchant> {
    const merchant = await this.getOrCreateMerchantForUser(userId);

    if (dto.businessName !== undefined) {
      merchant.businessName = dto.businessName;
    }
    if (dto.contactPhone !== undefined) {
      merchant.contactPhone = dto.contactPhone;
    }
    if (dto.pickupAddress !== undefined) {
      merchant.pickupAddress = dto.pickupAddress;
    }

    return this.merchantRepo.save(merchant);
  }

  /**
   * Calculates comprehensive merchant dashboard metrics from PostgreSQL.
   */
  async getDashboardStats(userId: string) {
    const merchant = await this.getOrCreateMerchantForUser(userId);

    const [parcels, totalOrders] = await this.parcelRepo.findAndCount({
      where: { merchantId: merchant.id },
      order: { createdAt: "DESC" },
    });

    let pendingOrders = 0;
    let inTransitOrders = 0;
    let deliveredOrders = 0;
    let returnedOrders = 0;
    let totalCodAmount = 0;
    let collectedCodAmount = 0;
    let totalDeliveryFees = 0;

    for (const p of parcels) {
      const cod = Number(p.codAmount) || 0;
      const fee = Number(p.deliveryFee) || 0;

      totalCodAmount += cod;
      totalDeliveryFees += fee;

      if (PENDING_STATUSES.includes(p.status)) {
        pendingOrders++;
      } else if (IN_TRANSIT_STATUSES.includes(p.status)) {
        inTransitOrders++;
      } else if (DELIVERED_STATUSES.includes(p.status)) {
        deliveredOrders++;
        collectedCodAmount += cod;
      } else if (RETURNED_STATUSES.includes(p.status)) {
        returnedOrders++;
      }
    }

    const recentParcels = parcels.slice(0, 5).map(p => ({
      id: p.id,
      trackingCode: p.trackingCode,
      recipientName: p.recipientName,
      recipientPhone: p.recipientPhone,
      deliveryAddress: p.rawAddress,
      district: (p.normalizedAddress as any)?.district || "Dhaka",
      codAmount: Number(p.codAmount),
      deliveryFee: Number(p.deliveryFee),
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    }));

    return {
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        contactPhone: merchant.contactPhone,
        pickupAddress: merchant.pickupAddress,
        status: merchant.status,
      },
      stats: {
        totalOrders,
        pendingOrders,
        inTransitOrders,
        deliveredOrders,
        returnedOrders,
        totalCodAmount,
        collectedCodAmount,
        totalDeliveryFees,
      },
      recentParcels,
    };
  }
}
