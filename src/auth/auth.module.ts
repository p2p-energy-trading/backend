import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/auth.guards';
import { ProsumersModule } from '../models/prosumer/user.module';
import { WalletsModule } from '../models/wallet/Wallets.module';
import { TransactionLogsModule } from '../models/transactionLog/TransactionLogs.module';
import { TokenBlacklistModule } from '../models/tokenBlacklist/TokenBlacklist.module';
import { CommonModule } from '../common/common.module';
import { SmartMetersModule } from 'src/models/smartMeter/SmartMeters.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
        },
      }),
      inject: [ConfigService],
    }),
    ProsumersModule,
    WalletsModule,
    TransactionLogsModule,
    TokenBlacklistModule,
    CommonModule,
    SmartMetersModule,
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy, JwtAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
