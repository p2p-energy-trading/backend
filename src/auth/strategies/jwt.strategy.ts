import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ProsumersService } from '../../modules/Prosumers/Prosumers.service';
import { BlacklistService } from '../../modules/TokenBlacklist/TokenBlacklist.service';
import { Request } from 'express';

interface JwtPayload {
  prosumerId: string;
  email: string;
  sub: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prosumersService: ProsumersService,
    private blacklistService: BlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'default-secret-key',
      passReqToCallback: true, // Enable access to request object
    });
  }

  async validate(request: Request, payload: JwtPayload) {
    try {
      // Extract token from request
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

      // Check if user is blacklisted first (faster check)
      if (await this.blacklistService.isUserBlacklisted(payload.prosumerId)) {
        throw new UnauthorizedException('User session has been terminated');
      }

      // Check if specific token is blacklisted
      if (token && (await this.blacklistService.isTokenBlacklisted(token))) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Validate prosumer exists and is active
      const prosumer = await this.prosumersService.findOne(payload.prosumerId);

      return {
        prosumerId: prosumer.prosumerId,
        email: prosumer.email,
        name: prosumer.name,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token or user not found');
    }
  }
}
