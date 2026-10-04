import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  User,
  UserRole,
  UserStatus,
  Merchant,
  MerchantStatus,
  Rider,
  RiderStatus,
  Hub,
  HubStatus,
} from "../../database/entities/index.js";
import { CustomJwtService } from "../jwt/custom-jwt.service.js";
import { PasswordService } from "./password.service.js";
import { RegisterDto, LoginDto } from "../dto/auth.dto.js";

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,
    @InjectRepository(Hub)
    private readonly hubRepo: Repository<Hub>,
    private readonly jwtService: CustomJwtService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Seed default demo users for development and testing.
   */
  async onModuleInit() {
    try {
      await this.seedDemoData();
    } catch (err: any) {
      this.logger.warn(`Demo data seed warning: ${err.message}`);
    }
  }

  private async seedDemoData() {
    this.logger.log("Checking default demo users for Dhruto OS...");

    // 1. Create a Default Hub
    let hub = await this.hubRepo.findOne({ where: { code: "HUB-DHK-01" } });
    if (!hub) {
      hub = this.hubRepo.create({
        code: "HUB-DHK-01",
        name: "Dhaka Central Sorting Hub",
        districtId: undefined,
        thanaId: undefined,
        address: "Tejgaon Industrial Area, Dhaka",
        status: HubStatus.ACTIVE,
      });
      await this.hubRepo.save(hub);
    }

    const defaultPassword = await this.passwordService.hash("dhruto123");

    // 2. Admin User
    let adminUser = await this.userRepo.findOne({
      where: { email: "admin@dhruto.com" },
    });
    if (!adminUser) {
      adminUser = this.userRepo.create({
        name: "Dhruto Admin",
        email: "admin@dhruto.com",
        phone: "01700000001",
        passwordHash: defaultPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });
      await this.userRepo.save(adminUser);
    }

    // 3. Merchant User
    let merchantUser = await this.userRepo.findOne({
      where: { email: "merchant@dhruto.com" },
    });
    if (!merchantUser) {
      merchantUser = this.userRepo.create({
        name: "Rahim Enterprise",
        email: "merchant@dhruto.com",
        phone: "01700000002",
        passwordHash: defaultPassword,
        role: UserRole.MERCHANT,
        status: UserStatus.ACTIVE,
      });
      await this.userRepo.save(merchantUser);

      const merchant = this.merchantRepo.create({
        userId: merchantUser.id,
        businessName: "Rahim Enterprise BD",
        contactPhone: "01700000002",
        pickupAddress: "House 45, Road 7, Dhanmondi, Dhaka",
        status: MerchantStatus.ACTIVE,
      });
      await this.merchantRepo.save(merchant);
    }

    // 4. Rider User
    let riderUser = await this.userRepo.findOne({
      where: { email: "rider@dhruto.com" },
    });
    if (!riderUser) {
      riderUser = this.userRepo.create({
        name: "Karim Rider",
        email: "rider@dhruto.com",
        phone: "01700000003",
        passwordHash: defaultPassword,
        role: UserRole.RIDER,
        status: UserStatus.ACTIVE,
      });
      await this.userRepo.save(riderUser);

      const rider = this.riderRepo.create({
        userId: riderUser.id,
        hubId: hub.id,
        status: RiderStatus.ACTIVE,
      });
      await this.riderRepo.save(rider);
    }

    // 5. Chittagong Regional Hub
    let ctgHub = await this.hubRepo.findOne({ where: { code: "HUB-CTG-01" } });
    if (!ctgHub) {
      ctgHub = this.hubRepo.create({
        code: "HUB-CTG-01",
        name: "Chittagong Regional Hub",
        districtId: undefined,
        thanaId: undefined,
        address: "GEC Circle, Nasirabad, Chittagong",
        status: HubStatus.ACTIVE,
      });
      await this.hubRepo.save(ctgHub);
    }

    // 6. Hub Manager User
    let hubManager = await this.userRepo.findOne({
      where: { email: "hubmanager@dhruto.com" },
    });
    if (!hubManager) {
      hubManager = this.userRepo.create({
        name: "Tareq Hub Manager",
        email: "hubmanager@dhruto.com",
        phone: "01700000004",
        passwordHash: defaultPassword,
        role: UserRole.HUB_MANAGER,
        status: UserStatus.ACTIVE,
      });
      await this.userRepo.save(hubManager);
    }

    this.logger.log("✅ Default Admin, Merchant, Rider, and Hub Manager ready (Password: dhruto123)");
  }

  /**
   * Registers a new user.
   */
  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });

    if (existing) {
      if (existing.email === dto.email) {
        throw new ConflictException("Email is already registered");
      }
      throw new ConflictException("Phone number is already registered");
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const role = dto.role || UserRole.MERCHANT;

    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
    });
    await this.userRepo.save(user);

    let merchantId: string | null = null;
    let riderId: string | null = null;
    let hubId: string | null = null;

    if (role === UserRole.MERCHANT) {
      const merchant = this.merchantRepo.create({
        userId: user.id,
        businessName: dto.businessName || `${dto.name}'s Shop`,
        contactPhone: dto.phone,
        pickupAddress: dto.pickupAddress || "Dhaka, Bangladesh",
        status: MerchantStatus.ACTIVE,
      });
      await this.merchantRepo.save(merchant);
      merchantId = merchant.id;
    } else if (role === UserRole.RIDER) {
      // Find or assign to hub
      let targetHub = dto.hubId ? await this.hubRepo.findOne({ where: { id: dto.hubId } }) : null;
      if (!targetHub) {
        targetHub = await this.hubRepo.findOne({ where: {} });
      }
      if (!targetHub) {
        targetHub = this.hubRepo.create({
          code: "HUB-DHK-01",
          name: "Dhaka Central Sorting Hub",
          address: "Tejgaon Industrial Area, Dhaka",
          status: HubStatus.ACTIVE,
        });
        await this.hubRepo.save(targetHub);
      }

      const rider = this.riderRepo.create({
        userId: user.id,
        hubId: targetHub.id,
        status: RiderStatus.ACTIVE,
      });
      await this.riderRepo.save(rider);
      riderId = rider.id;
      hubId = targetHub.id;
    }

    const tokens = this.jwtService.generateAuthTokens({
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      merchantId,
      riderId,
      hubId,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        merchantId,
        riderId,
        hubId,
      },
      tokens,
    };
  }

  /**
   * Logs in a user with email or phone + password.
   */
  async login(dto: LoginDto) {
    const identifier = dto.emailOrPhone.trim();
    const user = await this.userRepo.findOne({
      where: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      throw new UnauthorizedException("Invalid email/phone or password");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    const isMatch = await this.passwordService.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isMatch) {
      throw new UnauthorizedException("Invalid email/phone or password");
    }

    let merchantId: string | null = null;
    let riderId: string | null = null;
    let hubId: string | null = null;

    if (user.role === UserRole.MERCHANT) {
      const merchant = await this.merchantRepo.findOne({
        where: { userId: user.id },
      });
      merchantId = merchant?.id || null;
    } else if (user.role === UserRole.RIDER) {
      const rider = await this.riderRepo.findOne({
        where: { userId: user.id },
      });
      riderId = rider?.id || null;
      hubId = rider?.hubId || null;
    }

    const tokens = this.jwtService.generateAuthTokens({
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      merchantId,
      riderId,
      hubId,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        merchantId,
        riderId,
        hubId,
      },
      tokens,
    };
  }

  /**
   * Refreshes access token using valid refresh token.
   */
  async refresh(refreshToken: string) {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("User account is inactive or not found");
    }

    let merchantId: string | null = null;
    let riderId: string | null = null;
    let hubId: string | null = null;

    if (user.role === UserRole.MERCHANT) {
      const merchant = await this.merchantRepo.findOne({
        where: { userId: user.id },
      });
      merchantId = merchant?.id || null;
    } else if (user.role === UserRole.RIDER) {
      const rider = await this.riderRepo.findOne({
        where: { userId: user.id },
      });
      riderId = rider?.id || null;
      hubId = rider?.hubId || null;
    }

    const tokens = this.jwtService.generateAuthTokens({
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      merchantId,
      riderId,
      hubId,
    });

    return tokens;
  }

  /**
   * Retrieves profile of current user.
   */
  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    let merchant = null;
    let rider = null;

    if (user.role === UserRole.MERCHANT) {
      merchant = await this.merchantRepo.findOne({ where: { userId: user.id } });
    } else if (user.role === UserRole.RIDER) {
      rider = await this.riderRepo.findOne({
        where: { userId: user.id },
        relations: ["hub"],
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      merchant,
      rider,
      createdAt: user.createdAt,
    };
  }
}
