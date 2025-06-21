import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
// import {
//   HttpExceptionFilter,
//   AllExceptionsFilter,
// } from './filters/exception.filter';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { CustomThrottlerGuard } from './guards/throttler.guard';

@Module({
  providers: [
    CryptoService,
    // HttpExceptionFilter,
    // AllExceptionsFilter,
    LoggingMiddleware,
    CustomThrottlerGuard,
  ],
  exports: [
    CryptoService,
    // HttpExceptionFilter,
    // AllExceptionsFilter,
    LoggingMiddleware,
    CustomThrottlerGuard,
  ],
})
export class CommonModule {}
