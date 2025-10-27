import {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiResponseMetadata,
  ApiPaginationMetadata,
} from './interfaces';

/**
 * Response Formatter Utility
 * Provides consistent response formatting across all API endpoints
 *
 * Usage:
 * ```typescript
 * // Success response
 * return ResponseFormatter.success(data);
 * return ResponseFormatter.success(data, 'Operation successful');
 *
 * // Paginated response
 * return ResponseFormatter.paginated(items, { total: 100, page: 1, limit: 10 });
 *
 * // Error response
 * return ResponseFormatter.error('Something went wrong', errorDetails);
 * ```
 */
export class ResponseFormatter {
  /**
   * Format a successful API response
   * @param data - The data to return
   * @param message - Optional success message
   * @param metadata - Optional metadata (timestamp, count, etc.)
   */
  static success<T>(
    data: T,
    message?: string,
    metadata?: ApiResponseMetadata,
  ): ApiSuccessResponse<T> {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
    };

    if (message) {
      response.message = message;
    }

    if (metadata) {
      response.metadata = metadata;
    } else {
      // Add timestamp by default
      response.metadata = {
        timestamp: new Date().toISOString(),
      };
    }

    return response;
  }

  /**
   * Format a paginated API response
   * @param data - Array of items
   * @param pagination - Pagination metadata
   * @param message - Optional message
   */
  static paginated<T>(
    data: T[],
    pagination: Omit<ApiPaginationMetadata, 'timestamp' | 'count'>,
    message?: string,
  ): ApiPaginatedResponse<T> {
    const metadata: ApiPaginationMetadata = {
      total: pagination.total,
      count: data.length,
      timestamp: new Date().toISOString(),
      page: pagination.page,
      limit: pagination.limit,
    };

    // Calculate hasNext and hasPrevious if page and limit are provided
    if (pagination.page !== undefined && pagination.limit !== undefined) {
      metadata.hasNext = pagination.page * pagination.limit < pagination.total;
      metadata.hasPrevious = pagination.page > 1;
    }

    const response: ApiPaginatedResponse<T> = {
      success: true,
      data,
      metadata,
    };

    if (message) {
      response.message = message;
    }

    return response;
  }

  /**
   * Format an error API response
   * @param message - Error message
   * @param error - Optional error details (string or object)
   * @param statusCode - Optional HTTP status code
   */
  static error(
    message: string,
    error?: string | object,
    statusCode?: number,
  ): ApiErrorResponse {
    const response: ApiErrorResponse = {
      success: false,
      message,
    };

    if (error) {
      response.error = error;
    }

    if (statusCode) {
      response.statusCode = statusCode;
    }

    return response;
  }

  /**
   * Format success response with metadata
   * Helper method for responses that need additional metadata
   */
  static successWithMetadata<T>(
    data: T,
    metadata: ApiResponseMetadata,
    message?: string,
  ): ApiSuccessResponse<T> {
    return this.success(data, message, {
      ...metadata,
      timestamp: metadata.timestamp || new Date().toISOString(),
    });
  }

  /**
   * Format success response with count metadata
   * Useful for list endpoints that aren't paginated but need count
   */
  static successWithCount<T>(
    data: T[],
    message?: string,
  ): ApiSuccessResponse<T[]> {
    return this.success(data, message, {
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  }
}
