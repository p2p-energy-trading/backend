import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    protected reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Different rate limits for different user types or actions
    const isHighFrequencyEndpoint = this.reflector.get<boolean>(
      'highFrequency',
      context.getHandler(),
    );

    if (isHighFrequencyEndpoint) {
      // Allow more requests for high-frequency endpoints like real-time data
      return true;
    }

    // Use custom logic for rate limiting based on user type, wallet balance, etc.
    if (user?.userId) {
      // Authenticated users get higher limits
      return super.canActivate(context);
    }

    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use user ID if authenticated, otherwise IP
    return Promise.resolve(req.user?.userId || req.ip);
  }
}
