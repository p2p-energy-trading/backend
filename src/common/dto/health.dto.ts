import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'System health data',
    example: {
      status: 'healthy',
      timestamp: '2025-10-23T10:30:00.000Z',
      uptime: 3600,
      database: {
        status: 'connected',
        responseTime: 5,
      },
      blockchain: {
        status: 'connected',
        network: 'localhost',
        blockNumber: 12345,
      },
      mqtt: {
        status: 'connected',
        broker: 'localhost:1883',
      },
    },
  })
  data: {
    status: string;
    timestamp: string;
    uptime: number;
    database: {
      status: string;
      responseTime: number;
    };
    blockchain: {
      status: string;
      network: string;
      blockNumber: number;
    };
    mqtt: {
      status: string;
      broker: string;
    };
  };
}

export class ReadinessResponseDto {
  @ApiProperty({
    description: 'Service readiness status',
    example: true,
  })
  ready: boolean;
}

export class LivenessResponseDto {
  @ApiProperty({
    description: 'Service liveness status',
    example: true,
  })
  alive: boolean;
}
