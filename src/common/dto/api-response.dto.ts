import { ApiProperty } from '@nestjs/swagger';

/**
 * Generic API Success Response Wrapper
 * Used to wrap all successful API responses with consistent structure
 */
export class ApiSuccessResponseDto<T = any> {
  @ApiProperty({
    description: 'Success status indicator',
    example: true,
    type: Boolean,
  })
  success: true;

  @ApiProperty({
    description: 'Success message',
    example: 'Operation completed successfully',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Response data payload',
  })
  data: T;

  @ApiProperty({
    description: 'Response metadata (timestamp, count, etc.)',
    required: false,
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata?: {
    timestamp: string;
    count?: number;
    [key: string]: any;
  };
}

/**
 * Generic API Error Response
 * Used for all error responses with consistent structure
 */
export class ApiErrorResponseDto {
  @ApiProperty({
    description: 'Error status indicator',
    example: false,
    type: Boolean,
  })
  success: false;

  @ApiProperty({
    description: 'Error message',
    example: 'Operation failed',
  })
  message: string;

  @ApiProperty({
    description: 'Error details',
    required: false,
    example: 'Invalid input parameters',
  })
  error?: string | object;

  @ApiProperty({
    description: 'HTTP status code',
    required: false,
    example: 400,
  })
  statusCode?: number;
}

/**
 * Generic API Paginated Response
 * Used for list endpoints with pagination
 */
export class ApiPaginatedResponseDto<T = any> {
  @ApiProperty({
    description: 'Success status indicator',
    example: true,
    type: Boolean,
  })
  success: true;

  @ApiProperty({
    description: 'Success message',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Array of data items',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 100,
      count: 10,
      page: 1,
      limit: 10,
      hasNext: true,
      hasPrevious: false,
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    total: number;
    count: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
    timestamp: string;
    [key: string]: any;
  };
}
