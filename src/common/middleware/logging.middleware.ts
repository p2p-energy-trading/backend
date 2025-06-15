import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, body, query, params } = request;
    const userAgent = request.get('User-Agent') || '';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`Incoming Request: ${method} ${originalUrl}`, {
      method,
      url: originalUrl,
      userAgent,
      body: method !== 'GET' ? this.sanitizeBody(body) : undefined,
      query,
      params,
      ip: request.ip,
      user: (request as any).user?.prosumerId,
    });

    response.on('finish', () => {
      const { statusCode } = response;
      const duration = Date.now() - startTime;

      this.logger.log(
        `Request Completed: ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
        {
          method,
          url: originalUrl,
          statusCode,
          duration,
          user: (request as any).user?.prosumerId,
        },
      );
    });

    next();
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'privateKey', 'mnemonic', 'secretKey'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
