import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BagStatus, ExceptionStatus, HubScanType, ScanOutcome } from '@dhruto/contracts';
import { HubsService } from './hubs.service.js';
import {
  CreateBagDto,
  CreateManifestDto,
  HubScanDto,
  ReceiveManifestDto,
  ResolveExceptionDto,
  SealBagDto,
} from './dto/hub.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { type AuthenticatedUser } from '../auth/jwt/jwt.interface.js';
import { HUB_OPERATION_ROLES } from '../common/permissions/hub-permissions.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';

/**
 * Hub operations API.
 *
 * Every route requires an authenticated actor holding a hub operations role
 * (ADMIN or HUB_MANAGER) **and** an explicit `HubUserAssignment` for the hub in
 * the path. The hub id in the URL is never treated as proof of authorization —
 * see `HubAuthorizationService`, which resolves and validates it on every call.
 */
@ApiTags('Hubs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(...HUB_OPERATION_ROLES)
@Controller()
export class HubsController {
  constructor(private readonly hubsService: HubsService) {}

  /** The JWT guard guarantees a user; this keeps the types honest. */
  private actor(user: AuthenticatedUser | null): AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }

  /* ==================== HUBS ==================== */

  @Get('hubs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List hubs the authenticated operator may access',
    description:
      'ADMIN sees every hub. A hub operator sees only hubs they hold an active assignment for. This list drives the hub selector.',
  })
  @ApiResponse({ status: 200, description: 'Authorized hubs.' })
  async listHubs(@CurrentUser() user: AuthenticatedUser | null) {
    const hubs = await this.hubsService.listHubs(this.actor(user));
    return { success: true, statusCode: HttpStatus.OK, message: 'Hubs retrieved successfully', data: hubs };
  }

  @Get('hubs/destinations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List every ACTIVE hub as a possible destination',
    description:
      'Used to populate the destination selector when creating a bag or manifest. Returns routing metadata only; the chosen destination is re-validated server-side. Declared before `hubs/:id` so it is not captured as a hub id.',
  })
  async listDestinationHubs() {
    const hubs = await this.hubsService.listDestinationHubs();
    return { success: true, statusCode: HttpStatus.OK, message: 'Destination hubs retrieved successfully', data: hubs };
  }

  @Get('hubs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get one authorized hub by id or code' })
  @ApiParam({ name: 'id', description: 'Hub UUID or hub code, e.g. HUB-DHK-01' })
  async getHub(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const hub = await this.hubsService.getHub(this.actor(user), id);
    return { success: true, statusCode: HttpStatus.OK, message: 'Hub retrieved successfully', data: hub };
  }

  @Get('hubs/:id/dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hub operational dashboard metrics',
    description:
      'All metrics are live aggregates over scans, bags, manifests and exceptions for this hub. No placeholder values are returned.',
  })
  async getDashboard(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const dashboard = await this.hubsService.getDashboard(this.actor(user), id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Hub dashboard retrieved successfully',
      data: dashboard,
    };
  }

  @Get('hubs/:id/inventory')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parcels physically at this hub with live counts' })
  async getHubInventory(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const inventory = await this.hubsService.getHubInventory(this.actor(user), id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Hub inventory retrieved successfully',
      data: inventory,
    };
  }

  /* ==================== SCANS ==================== */

  @Post('hubs/:id/scans')
  @RateLimit({ limit: 600, windowSeconds: 60, scope: 'hub-scan' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process one scan at a hub',
    description:
      'Accepts a parcel tracking code or a bag code. Every attempt is written to the append-only scan log, including rejected and duplicate attempts. Send the same `idempotencyKey` on a retry to have the stored outcome replayed instead of the operation being applied twice.',
  })
  @ApiResponse({ status: 200, description: 'Scan processed (applied, duplicate or rejected).' })
  @ApiResponse({ status: 403, description: 'Operator is not authorized for this hub or lacks hub.scan.' })
  @ApiResponse({ status: 404, description: 'Parcel or bag not found.' })
  async scanBarcode(
    @Param('id') id: string,
    @Body() dto: HubScanDto,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const result = await this.hubsService.scanBarcode(this.actor(user), id, dto);
    return { success: true, statusCode: HttpStatus.OK, message: result.message, data: result };
  }

  @Get('hubs/:id/scans')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recent scan history for a hub' })
  @ApiQuery({ name: 'scanType', required: false, enum: HubScanType })
  @ApiQuery({ name: 'outcome', required: false, enum: ScanOutcome })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listScans(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | null,
    @Query('scanType') scanType?: HubScanType,
    @Query('outcome') outcome?: ScanOutcome,
    @Query('limit') limit?: string,
  ) {
    const scans = await this.hubsService.listScans(this.actor(user), id, {
      scanType,
      outcome,
      limit: limit ? Number(limit) : undefined,
    });
    return { success: true, statusCode: HttpStatus.OK, message: 'Scans retrieved successfully', data: scans };
  }

  @Get('hubs/:id/parcels/:trackingCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Look up a parcel by tracking code from a hub',
    description:
      'Returns only operational fields. Merchant pricing, COD and customer contact details are never exposed to hub operators.',
  })
  async lookupParcel(
    @Param('id') id: string,
    @Param('trackingCode') trackingCode: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const parcel = await this.hubsService.lookupParcel(
      this.actor(user),
      id,
      trackingCode,
    );
    return { success: true, statusCode: HttpStatus.OK, message: 'Parcel retrieved successfully', data: parcel };
  }

  /* ==================== BAGS ==================== */

  @Post('hubs/:id/bags')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an OPEN transit bag at a hub',
    description: 'The origin hub comes from the path and is authorized server-side.',
  })
  async createBag(
    @Param('id') id: string,
    @Body() dto: CreateBagDto,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const bag = await this.hubsService.createBag(this.actor(user), id, dto);
    return { success: true, statusCode: HttpStatus.CREATED, message: 'Transit bag created successfully', data: bag };
  }

  @Get('bags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List bags visible to the authenticated operator',
    description: 'Without `hubId`, lists bags across every hub the operator is assigned to.',
  })
  @ApiQuery({ name: 'hubId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: BagStatus })
  async listBags(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query('hubId') hubId?: string,
    @Query('status') status?: BagStatus,
  ) {
    const bags = await this.hubsService.listBags(this.actor(user), hubId, status);
    return { success: true, statusCode: HttpStatus.OK, message: 'Bags retrieved successfully', data: bags };
  }

  @Get('bags/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bag details with its enclosed parcels' })
  async getBag(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const bag = await this.hubsService.getBag(this.actor(user), id);
    return { success: true, statusCode: HttpStatus.OK, message: 'Bag retrieved successfully', data: bag };
  }

  @Post('bags/:id/parcels')
  @RateLimit({ limit: 300, windowSeconds: 60, scope: 'hub-bag-add' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add a parcel to an OPEN bag',
    description:
      'Fails with 409 when the parcel is already in another active bag, and 400 when the bag is not OPEN or belongs to another hub.',
  })
  async addParcelToBag(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('parcelTrackingCode') trackingCode: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const result = await this.hubsService.addParcelToBag(
      this.actor(user),
      id,
      trackingCode,
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Parcel added to bag',
      data: result.bag,
    };
  }

  @Post('bags/:id/seal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Seal a bag (irreversible membership freeze)',
    description:
      'Requires at least one parcel. After sealing no parcels can be added or removed.',
  })
  async sealBag(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: SealBagDto,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const bag = await this.hubsService.sealBag(this.actor(user), id, dto);
    return { success: true, statusCode: HttpStatus.OK, message: 'Bag sealed successfully', data: bag };
  }

  /* ==================== MANIFESTS ==================== */

  @Post('hubs/:id/manifests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a dispatch manifest from sealed bags',
    description:
      'Every selected bag must be SEALED, belong to the origin hub, target the manifest destination and not already be on another active manifest.',
  })
  async createManifest(
    @Param('id') id: string,
    @Body() dto: CreateManifestDto,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const manifest = await this.hubsService.createManifest(
      this.actor(user),
      id,
      dto,
    );
    return { success: true, statusCode: HttpStatus.CREATED, message: 'Manifest created successfully', data: manifest };
  }

  @Get('hubs/:id/manifests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manifests originating from or destined for a hub' })
  async listManifests(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const manifests = await this.hubsService.listManifests(this.actor(user), id);
    return { success: true, statusCode: HttpStatus.OK, message: 'Manifests retrieved successfully', data: manifests };
  }

  @Get('manifests/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manifest details with bags and receiving reconciliation',
  })
  async getManifest(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const manifest = await this.hubsService.getManifest(this.actor(user), id);
    return { success: true, statusCode: HttpStatus.OK, message: 'Manifest retrieved successfully', data: manifest };
  }

  @Post('manifests/:id/dispatch')
  @RateLimit({ limit: 60, windowSeconds: 60, scope: 'hub-dispatch' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dispatch a manifest and all of its bags',
    description:
      'Transitions the manifest and every enclosed parcel to IN_TRANSIT. Concurrent dispatches: only one wins, the other receives 409.',
  })
  async dispatchManifest(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const manifest = await this.hubsService.dispatchManifest(
      this.actor(user),
      id,
    );
    return { success: true, statusCode: HttpStatus.OK, message: 'Manifest dispatched successfully', data: manifest };
  }

  @Post('manifests/:id/receive')
  @RateLimit({ limit: 120, windowSeconds: 60, scope: 'hub-receive' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive a dispatched manifest at its destination hub',
    description:
      'Reconciles the scanned bag codes against the manifest. Unexpected bags are rejected and raise an exception; missing bags raise exceptions and block completion unless `allowPartial` is set.',
  })
  async receiveManifest(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ReceiveManifestDto,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const result = await this.hubsService.receiveManifest(
      this.actor(user),
      id,
      dto,
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: result.reconciliation.isComplete
        ? 'Manifest received successfully'
        : 'Manifest received with reconciliation exceptions',
      data: result.manifest,
      reconciliation: result.reconciliation,
    };
  }

  /* ==================== EXCEPTIONS ==================== */

  @Get('exceptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Operational exceptions visible to the operator' })
  @ApiQuery({ name: 'hubId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ExceptionStatus })
  async listExceptions(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query('hubId') hubId?: string,
    @Query('status') status?: ExceptionStatus,
  ) {
    const exceptions = await this.hubsService.listExceptions(
      this.actor(user),
      hubId,
      status,
    );
    return { success: true, statusCode: HttpStatus.OK, message: 'Exceptions retrieved successfully', data: exceptions };
  }

  @Post('exceptions/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an operational exception' })
  async resolveException(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ResolveExceptionDto,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const exception = await this.hubsService.resolveException(
      this.actor(user),
      id,
      dto,
    );
    return { success: true, statusCode: HttpStatus.OK, message: 'Exception resolved', data: exception };
  }
}
