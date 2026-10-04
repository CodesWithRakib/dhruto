import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
} from "@nestjs/swagger";
import { HubsService } from "./hubs.service.js";
import {
  CreateBagDto,
  SealBagDto,
  CreateManifestDto,
  HubScanDto,
} from "./dto/hub.dto.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";

@ApiTags("Hubs")
@Controller()
export class HubsController {
  constructor(private readonly hubsService: HubsService) {}

  // ==================== HUBS ====================

  @Get("hubs")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List all active hubs" })
  async getAllHubs(@Req() req: RequestWithId) {
    const hubs = await this.hubsService.getAllHubs();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Hubs retrieved successfully",
      data: hubs,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  @Get("hubs/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get hub details" })
  async getHubById(@Param("id") id: string, @Req() req: RequestWithId) {
    const hub = await this.hubsService.getHubById(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Hub retrieved successfully",
      data: hub,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  @Get("hubs/:id/inventory")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get hub parcel inventory and live counts" })
  async getHubInventory(@Param("id") id: string, @Req() req: RequestWithId) {
    const inventory = await this.hubsService.getHubInventory(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Hub inventory retrieved successfully",
      data: inventory,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  @Post("hubs/:id/scans")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Process barcode scan at hub",
    description: "Supports RECEIVE_INBOUND, SORT, BAG_PARCEL, and RECEIVE_TRANSFER.",
  })
  async scanBarcode(
    @Param("id") hubId: string,
    @Body() dto: HubScanDto,
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
  ) {
    const result = await this.hubsService.scanBarcode(
      hubId,
      dto,
      user?.id || "00000000-0000-0000-0000-000000000000",
      user?.role || "HUB_MANAGER",
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  // ==================== BAGS ====================

  @Post("bags")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new transit bag" })
  async createBag(
    @Query("originHubId") originHubId: string,
    @Body() dto: CreateBagDto,
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
  ) {
    const bag = await this.hubsService.createBag(
      originHubId,
      dto,
      user?.id,
    );
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: "Transit bag created successfully",
      data: bag,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  @Get("bags")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List transit bags" })
  async getBags(
    @Query("hubId") hubId: string | undefined,
    @Req() req: RequestWithId,
  ) {
    const bags = await this.hubsService.getBags({ hubId });
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Bags retrieved successfully",
      data: bags,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  @Get("bags/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get bag details with enclosed parcels" })
  async getBagById(@Param("id") id: string, @Req() req: RequestWithId) {
    const bag = await this.hubsService.getBagById(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Bag retrieved successfully",
      data: bag,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  @Post("bags/:id/parcels")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Add parcel into open transit bag" })
  async addParcelToBag(
    @Param("id") bagId: string,
    @Body("parcelTrackingCode") trackingCode: string,
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
  ) {
    const result = await this.hubsService.addParcelToBag(
      bagId,
      trackingCode,
      user?.id || "00000000-0000-0000-0000-000000000000",
      user?.role || "HUB_MANAGER",
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  @Post("bags/:id/seal")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Seal bag with tamper-evident seal tag" })
  async sealBag(
    @Param("id") bagId: string,
    @Body() dto: SealBagDto,
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
  ) {
    const result = await this.hubsService.sealBag(bagId, dto, user?.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result.bag,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  @Post("bags/:id/dispatch")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Dispatch sealed bag into transit" })
  async dispatchBag(
    @Param("id") bagId: string,
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
  ) {
    const result = await this.hubsService.dispatchBag(
      bagId,
      user?.id || "00000000-0000-0000-0000-000000000000",
      user?.role || "HUB_MANAGER",
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result.bag,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  @Post("bags/:id/receive")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive bag at destination hub and unpack parcels" })
  async receiveBag(
    @Param("id") bagId: string,
    @Body("destinationHubId") destinationHubId: string,
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
  ) {
    const result = await this.hubsService.receiveBag(
      bagId,
      destinationHubId,
      user?.id || "00000000-0000-0000-0000-000000000000",
      user?.role || "HUB_MANAGER",
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result.bag,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  // ==================== MANIFESTS ====================

  @Post("manifests")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create vehicle transit manifest" })
  async createManifest(
    @Query("originHubId") originHubId: string,
    @Body() dto: CreateManifestDto,
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
  ) {
    const manifest = await this.hubsService.createManifest(
      originHubId,
      dto,
      user?.id,
    );
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: "Manifest created successfully",
      data: manifest,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  @Get("manifests")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List transit manifests" })
  async getManifests(
    @Query("hubId") hubId: string | undefined,
    @Req() req: RequestWithId,
  ) {
    const manifests = await this.hubsService.getManifests({ hubId });
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Manifests retrieved successfully",
      data: manifests,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }

  @Post("manifests/:id/dispatch")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Dispatch manifest and all linked bags" })
  async dispatchManifest(
    @Param("id") manifestId: string,
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: RequestWithId,
  ) {
    const result = await this.hubsService.dispatchManifest(
      manifestId,
      user?.id || "00000000-0000-0000-0000-000000000000",
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result.manifest,
      meta: { requestId: req.requestId || "unknown", timestamp: new Date().toISOString() },
    };
  }
}
