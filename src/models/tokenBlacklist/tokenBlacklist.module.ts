import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlacklistService } from './tokenBlacklist.service';
import { TokenBlacklist } from './tokenBlacklist.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TokenBlacklist])],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class TokenBlacklistModule {}
