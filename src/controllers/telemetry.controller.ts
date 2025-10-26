import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { RedisTelemetryService } from '../services/redis-telemetry.service';
import { TelemetryAggregationService } from '../services/telemetry-aggregation.service';
import { TelemetryArchivalService } from '../services/telemetry-archival.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { TelemetryAggregate } from '../models/TelemetryAggregate/TelemetryAggregate.entity';

@ApiTags('Telemetry')
@Controller('telemetry')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TelemetryController {
  constructor(
    private redisTelemetryService: RedisTelemetryService,
    private telemetryAggregationService: TelemetryAggregationService,
    private telemetryArchivalService: TelemetryArchivalService,
    @InjectRepository(TelemetryAggregate)
    private telemetryAggregateRepository: Repository<TelemetryAggregate>,
  ) {}

  @Get('latest/data/:meterId')
  @ApiOperation({
    summary: 'Get latest meter data from Redis (device info, connectivity)',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest meter data retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Meter data not found' })
  async getLatestData(@Param('meterId') meterId: string) {
    const data = await this.redisTelemetryService.getLatestData(meterId);

    if (!data) {
      throw new HttpException('Meter data not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      data,
    };
  }

  @Get('latest/status/:meterId')
  @ApiOperation({
    summary: 'Get latest meter status from Redis (energy measurements)',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest meter status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Meter status not found' })
  async getLatestStatus(@Param('meterId') meterId: string) {
    const status = await this.redisTelemetryService.getLatestStatus(meterId);

    if (!status) {
      throw new HttpException('Meter status not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      data: status,
    };
  }

  @Get('latest/all')
  @ApiOperation({
    summary: 'Get latest data and status for all meters from Redis',
  })
  @ApiResponse({
    status: 200,
    description: 'All latest data retrieved successfully',
  })
  async getAllLatest() {
    const [dataMap, statusMap] = await Promise.all([
      this.redisTelemetryService.getAllLatestData(),
      this.redisTelemetryService.getAllLatestStatus(),
    ]);

    // Combine data and status by meterId
    const combined: Record<string, any> = {};

    for (const meterId of new Set([
      ...Object.keys(dataMap),
      ...Object.keys(statusMap),
    ])) {
      combined[meterId] = {
        meterId,
        data: dataMap[meterId] || null,
        status: statusMap[meterId] || null,
      };
    }

    return {
      success: true,
      data: Object.values(combined),
    };
  }

  @Get('history/:meterId')
  @ApiOperation({
    summary: 'Get historical hourly aggregated data from PostgreSQL',
  })
  @ApiQuery({
    name: 'start',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit number of records (default: 168 = 1 week)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historical data retrieved successfully',
  })
  async getHistory(
    @Param('meterId') meterId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 168; // Default 1 week (24h * 7d)

    let whereClause: any = { meterId };

    if (start && end) {
      whereClause.hourStart = Between(new Date(start), new Date(end));
    } else if (start) {
      whereClause.hourStart = MoreThanOrEqual(new Date(start));
    } else if (end) {
      whereClause.hourStart = LessThanOrEqual(new Date(end));
    }

    const history = await this.telemetryAggregateRepository.find({
      where: whereClause,
      order: { hourStart: 'DESC' },
      take: limitNum,
    });

    return {
      success: true,
      data: history.reverse(), // Return in chronological order
      count: history.length,
    };
  }

  @Get('history/all')
  @ApiOperation({ summary: 'Get historical data for all meters' })
  @ApiQuery({
    name: 'start',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit per meter (default: 24 = last day)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historical data for all meters retrieved successfully',
  })
  async getAllHistory(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 24; // Default last 24 hours

    let whereClause: any = {};

    if (start && end) {
      whereClause.hourStart = Between(new Date(start), new Date(end));
    } else if (start) {
      whereClause.hourStart = MoreThanOrEqual(new Date(start));
    } else if (end) {
      whereClause.hourStart = LessThanOrEqual(new Date(end));
    }

    // Get unique meter IDs
    const meters = await this.telemetryAggregateRepository
      .createQueryBuilder('t')
      .select('DISTINCT t.meterId', 'meterId')
      .getRawMany();

    // Get history for each meter
    const allHistory = await Promise.all(
      meters.map(async ({ meterId }) => {
        const history = await this.telemetryAggregateRepository.find({
          where: { ...whereClause, meterId },
          order: { hourStart: 'DESC' },
          take: limitNum,
        });

        return {
          meterId,
          data: history.reverse(),
        };
      }),
    );

    return {
      success: true,
      data: allHistory,
    };
  }

  @Get('stats/archive')
  @ApiOperation({ summary: 'Get archival statistics' })
  @ApiResponse({
    status: 200,
    description: 'Archive stats retrieved successfully',
  })
  async getArchiveStats() {
    const stats = await this.telemetryArchivalService.getArchiveStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check telemetry system health' })
  @ApiResponse({ status: 200, description: 'System health check' })
  async healthCheck() {
    const redisHealthy = await this.redisTelemetryService.ping();

    return {
      success: true,
      data: {
        redis: redisHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('debug/redis-keys')
  @ApiOperation({ summary: 'Debug: List all Redis keys' })
  @ApiResponse({ status: 200, description: 'All Redis keys' })
  async debugRedisKeys() {
    const client = this.redisTelemetryService.getClient();
    const keys = await client.keys('*');

    const keysInfo = await Promise.all(
      keys.map(async (key) => {
        const type = await client.type(key);
        const ttl = await client.ttl(key);
        let count = 0;

        if (type === 'zset') {
          count = await client.zcard(key);
        } else if (type === 'hash') {
          count = (await client.hkeys(key)).length;
        }

        return { key, type, ttl, count };
      }),
    );

    return {
      success: true,
      data: {
        totalKeys: keys.length,
        keys: keysInfo,
      },
    };
  }

  @Get('debug/redis-data/:meterId')
  @ApiOperation({ summary: 'Debug: Get all Redis data for a meter' })
  @ApiResponse({ status: 200, description: 'All Redis data for meter' })
  async debugRedisDataForMeter(@Param('meterId') meterId: string) {
    const [latestData, latestStatus] = await Promise.all([
      this.redisTelemetryService.getLatestData(meterId),
      this.redisTelemetryService.getLatestStatus(meterId),
    ]);

    // Get time-series count
    const client = this.redisTelemetryService.getClient();
    const timeseriesKey = `telemetry:timeseries:${meterId}`;
    const timeseriesCount = await client.zcard(timeseriesKey);
    const timeseriesTtl = await client.ttl(timeseriesKey);

    // Get latest 5 time-series snapshots
    const latestSnapshots = await client.zrevrange(timeseriesKey, 0, 4);
    const parsedSnapshots = latestSnapshots.map((s) => JSON.parse(s));

    return {
      success: true,
      data: {
        meterId,
        latestData,
        latestStatus,
        timeSeries: {
          count: timeseriesCount,
          ttl: timeseriesTtl,
          latestSnapshots: parsedSnapshots.map((s) => ({
            timestamp: new Date(s.timestamp).toISOString(),
            hasData: !!s.meterData,
            hasStatus: !!s.statusData,
          })),
        },
      },
    };
  }
}
