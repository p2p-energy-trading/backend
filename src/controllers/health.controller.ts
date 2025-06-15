import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService } from '../services/health-check.service';
import { Public } from '../common/decorators/custom.decorators';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(private healthCheckService: HealthCheckService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health information' })
  async getHealth() {
    const health = await this.healthCheckService.getSystemHealth();

    return {
      success: true,
      data: health,
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe for containers' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async getReadiness() {
    const health = await this.healthCheckService.getSystemHealth();

    if (health.status === 'unhealthy') {
      throw new Error('Service not ready');
    }

    return { ready: true };
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe for containers' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  getLiveness() {
    return { alive: true };
  }
}
