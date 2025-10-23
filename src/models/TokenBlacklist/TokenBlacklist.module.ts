import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlacklistService } from './TokenBlacklist.service';
import { TokenBlacklist } from './TokenBlacklist.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TokenBlacklist])],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class TokenBlacklistModule {}
