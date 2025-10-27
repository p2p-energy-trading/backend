import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BlacklistService } from '../../models/tokenBlacklist/tokenBlacklist.service';
import { Request } from 'express';

interface UserPayload {
  prosumerId: string;
  email: string;
  name: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private blacklistService: BlacklistService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, validate JWT signature using parent guard
    const isValidJWT = await super.canActivate(context);
    if (!isValidJWT) {
      return false;
    }

    // Extract token and user from request
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: UserPayload }>();
    const token = this.extractTokenFromHeader(request);
    const user = request.user;

    if (!token || !user?.prosumerId) {
      throw new UnauthorizedException('Invalid token or user data');
    }

    // Check if token or user is blacklisted
    const isBlacklisted = await this.blacklistService.isBlacklisted(
      token,
      user.prosumerId,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException(
        'Token has been revoked or user session terminated',
      );
    }

    return true;
  }

  handleRequest<TUser = UserPayload>(err: any, user: TUser): TUser {
    if (err) {
      throw err instanceof Error
        ? err
        : new UnauthorizedException('Authentication failed');
    }
    if (!user) {
      throw new UnauthorizedException('Authentication failed');
    }
    return user;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Allow both authenticated and unauthenticated requests
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any): any {
    // Return user if exists, null if not (don't throw error)
    return user || null;
  }
}
