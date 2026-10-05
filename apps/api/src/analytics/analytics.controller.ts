import {
  Controller,
  Get,
  Query,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsQueryDto } from './dto/analytics.dto.js';
import { CustomJwtService } from '../auth/jwt/custom-jwt.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { type AuthenticatedUser } from '../auth/jwt/jwt.interface.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from '../database/entities/Merchant.entity.js';
import {
  type ApiResponse,
  type MerchantAnalyticsSummary,
  type OperationalAnalyticsSummary,
  type HubThroughputMetric,
  type TopRiderMetric,
  type RtoAnalytics,
  type CodFlowAnalytics,
} from '@dhruto/contracts';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly jwtService: CustomJwtService,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  private async resolveMerchantId(
    user: AuthenticatedUser | null,
    req: any,
    queryMerchantId?: string,
  ): Promise<string> {
    if (queryMerchantId) return queryMerchantId;

    let userId = user?.id;
    if (!userId) {
      const authHeader = req?.headers?.authorization;
      if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payload = this.jwtService.verifyAccessToken(token);
          userId = payload.sub;
        } catch {
          // ignore error
        }
      }
    }

    if (userId) {
      const merchant = await this.merchantRepo.findOne({
        where: { user: { id: userId } },
      });
      if (merchant) return merchant.id;
    }

    // Default to first merchant in DB for fallback
    const firstMerchant = await this.merchantRepo.findOne({ where: {} });
    return firstMerchant ? firstMerchant.id : 'd2c58e83-5991-4469-8bf8-34a200236cf8';
  }

  @Get('merchant/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get merchant analytics KPIs and financial summary',
    description: 'Returns orders, delivery success rate, RTO percentage, COD totals, and daily trends.',
  })
  async getMerchantSummary(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: any,
  ): Promise<ApiResponse<MerchantAnalyticsSummary>> {
    const merchantId = await this.resolveMerchantId(user, req, query.merchantId);
    const data = await this.analyticsService.getMerchantSummary(merchantId, query);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Merchant analytics retrieved successfully',
      data,
      meta: {
        requestId: req?.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('operations/overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get system-wide operational analytics overview',
    description: 'Returns network delivery rate, active hubs throughput, top riders, RTO breakdown, and COD flow.',
  })
  async getOperationalOverview(
    @Query() query: AnalyticsQueryDto,
    @Req() req: any,
  ): Promise<ApiResponse<OperationalAnalyticsSummary>> {
    const data = await this.analyticsService.getOperationalSummary(query);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Operational overview retrieved successfully',
      data,
      meta: {
        requestId: req?.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('hubs/throughput')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get hub throughput analytics',
    description: 'Returns sorting, dispatching, and inventory throughput by hub.',
  })
  async getHubThroughput(
    @Query() query: AnalyticsQueryDto,
    @Req() req: any,
  ): Promise<ApiResponse<HubThroughputMetric[]>> {
    const data = await this.analyticsService.getHubThroughputAnalytics(query);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Hub throughput metrics retrieved successfully',
      data,
      meta: {
        requestId: req?.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('riders/performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get rider fleet performance rankings',
    description: 'Returns deliveries completed, completion rates, and cash collections by rider.',
  })
  async getRiderPerformance(
    @Query() query: AnalyticsQueryDto,
    @Req() req: any,
  ): Promise<ApiResponse<TopRiderMetric[]>> {
    const data = await this.analyticsService.getRiderPerformanceAnalytics(query);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Rider performance rankings retrieved successfully',
      data,
      meta: {
        requestId: req?.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('rto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Return-to-Origin (RTO) analytics and risk correlation',
    description: 'Returns RTO rates by zone, top reasons, and intelligence risk tier correlation.',
  })
  async getRtoAnalytics(
    @Query() query: AnalyticsQueryDto,
    @Req() req: any,
  ): Promise<ApiResponse<RtoAnalytics>> {
    const data = await this.analyticsService.getRtoAnalytics(query);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'RTO analytics retrieved successfully',
      data,
      meta: {
        requestId: req?.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('cod')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get COD financial flow and reconciliation analytics',
    description: 'Returns booked, in-transit, collected, and settled COD funds.',
  })
  async getCodAnalytics(
    @Query() query: AnalyticsQueryDto,
    @Req() req: any,
  ): Promise<ApiResponse<CodFlowAnalytics>> {
    const data = await this.analyticsService.getCodAnalytics(query);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'COD analytics retrieved successfully',
      data,
      meta: {
        requestId: req?.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
