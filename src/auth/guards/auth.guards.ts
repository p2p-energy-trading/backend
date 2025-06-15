import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Allow both authenticated and unauthenticated requests
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // Return user if exists, null if not (don't throw error)
    return user || null;
  }
}
