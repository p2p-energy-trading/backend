import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsService } from './wallet.service';
import { Wallet } from './wallet.entity';
// Removed: BlockchainApprovals (not used), TradeOrdersCache (replaced by Redis)
import { IdrsConversion } from '../idrsConversion/idrsConversion.entity';
import { IdrsConversionsModule } from '../idrsConversion/idrsConversion.module';
import { MarketTrade } from '../marketTrade/marketTrade.entity';
import { MarketTradesModule } from '../marketTrade/marketTrade.module';
import { User } from '../user/user.entity';
import { ProsumersModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, IdrsConversion, MarketTrade, User]),
    forwardRef(() => IdrsConversionsModule),
    forwardRef(() => MarketTradesModule),
    forwardRef(() => ProsumersModule),
  ],
  providers: [WalletsService],
  exports: [WalletsService, TypeOrmModule],
})
export class WalletsModule {}
