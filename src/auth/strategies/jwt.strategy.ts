import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../models/user/user.service';
import { BlacklistService } from '../../models/tokenBlacklist/tokenBlacklist.service';
import { Request } from 'express';

interface JwtPayload {
  userId: string;
  email: string;
  sub: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT Authentication Strategy
 *
 * Validates JWT tokens on protected endpoints.
 * This strategy is activated by JwtAuthGuard.
 *
 * @remarks
 * - Extracts JWT from Authorization header (Bearer token)
 * - Verifies token signature with JWT_SECRET
 * - Checks token and user blacklist status
 * - Validates user still exists and is active
 * - Injects user object to req.user
 *
 * @see {@link JwtAuthGuard} Guard that activates this strategy
 * @see {@link AuthService.generateTokens} Creates tokens validated here
 * @see {@link BlacklistService} Token revocation checking
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private blacklistService: BlacklistService,
  ) {
    super({
      // Extract JWT from Authorization header: "Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Reject expired tokens automatically
      ignoreExpiration: false,

      // Secret key for verifying token signature
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'default-secret-key',

      // Enable access to request object in validate()
      passReqToCallback: true,
    });
  }

  /**
   * Validate JWT Token and Payload
   *
   * Called after Passport verifies token signature and expiration.
   * Performs additional validation including blacklist checks.
   *
   * @param request - Express request object (access to headers)
   * @param payload - Decoded JWT payload from token
   * @returns User object that will be injected to req.user
   * @throws {UnauthorizedException} If token/user is blacklisted or invalid
   *
   * @workflow
   * 1. Client sends: Authorization: Bearer <token>
   * 2. Passport extracts token from header
   * 3. Passport verifies token signature with JWT_SECRET
   * 4. Passport checks token expiration
   * 5. Passport decodes payload
   * 6. Calls validate() with request and decoded payload
   * 7. Check if user is blacklisted (logout-all scenario)
   * 8. Check if specific token is blacklisted (logout scenario)
   * 9. Verify user still exists in database
   * 10. Return user object
   * 11. Passport injects user to req.user
   *
   * @security
   * - Blacklist check prevents revoked tokens from being accepted
   * - Database check ensures user still exists and is active
   * - Checks both user-level and token-level blacklists
   *
   * @example
   * // Request:
   * GET /dashboard/stats
   * Headers: {
   *   Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   * }
   *
   * // If valid, req.user will contain:
   * {
   *   userId: "user_123",
   *   email: "user@enerlink.com",
   *   name: "John Doe"
   * }
   */
  async validate(request: Request, payload: JwtPayload) {
    try {
      // Extract token from request for blacklist checking
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

      // Check if user is blacklisted first (faster check)
      // This catches logout-all scenarios
      if (await this.blacklistService.isUserBlacklisted(payload.userId)) {
        throw new UnauthorizedException('User session has been terminated');
      }

      // Check if specific token is blacklisted
      // This catches single logout scenarios
      if (token && (await this.blacklistService.isTokenBlacklisted(token))) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Validate user exists and is active in database
      const user = await this.usersService.findOne(payload.userId);

      // Return user object - will be available as req.user in controller
      return {
        userId: user.userId,
        email: user.email,
        name: user.name,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token or user not found');
    }
  }
}
