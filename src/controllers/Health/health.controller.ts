import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService } from '../../services/Health/health-check.service';
import { Public } from '../../common/decorators/custom.decorators';
import {
  HealthResponseDto,
  ReadinessResponseDto,
  LivenessResponseDto,
} from '../../common/dto/health.dto';
import { ApiSuccessResponse } from '../../common/interfaces';
import { ResponseFormatter } from '../../common/response-formatter';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(private healthCheckService: HealthCheckService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get system health status',
    description:
      'Check overall system health including database, blockchain, and MQTT connections. Used for monitoring and diagnostics.',
  })
  @ApiResponse({
    status: 200,
    description: 'System health information retrieved successfully',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - health check failed',
  })
  async getHealth() {
    const health = await this.healthCheckService.getSystemHealth();

    return ResponseFormatter.success(
      health,
      'System health status retrieved successfully',
    );
  }

  @Get('ready')
  @Public()
  @ApiOperation({
    summary: 'Readiness probe for Kubernetes/Docker',
    description:
      'Kubernetes readiness probe endpoint. Returns 200 if service is ready to accept traffic, throws error if not ready.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to accept traffic',
    type: ReadinessResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Service not ready - unhealthy status detected',
  })
  async getReadiness() {
    const health = await this.healthCheckService.getSystemHealth();

    if (health.status === 'unhealthy') {
      throw new Error('Service not ready');
    }

    return ResponseFormatter.success(
      { ready: true },
      'Service is ready to accept traffic',
    );
  }

  @Get('live')
  @Public()
  @ApiOperation({
    summary: 'Liveness probe for Kubernetes/Docker',
    description:
      'Kubernetes liveness probe endpoint. Always returns 200 to indicate the service process is alive and running.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive and running',
    type: LivenessResponseDto,
  })
  getLiveness() {
    return ResponseFormatter.success(
      { alive: true },
      'Service is alive and running',
    );
  }
}
