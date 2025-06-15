import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ProsumersService } from '../../graphql/Prosumers/Prosumers.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prosumersService: ProsumersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'default-secret-key',
    });
  }

  async validate(payload: any) {
    try {
      const prosumer = await this.prosumersService.findOne(payload.prosumerId);
      return {
        prosumerId: prosumer.prosumerId,
        email: prosumer.email,
        name: prosumer.name,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
