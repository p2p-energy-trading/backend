import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsService } from './wallet.service';
import { Wallets } from './wallet.entity';
// Removed: BlockchainApprovals (not used)
import { IdrsConversions } from '../idrsConversion/idrsConversion.entity';
import { IdrsConversionsModule } from '../idrsConversion/idrsConversion.module';
import { MarketTrades } from '../marketTrade/marketTrade.entity';
import { MarketTradesModule } from '../marketTrade/marketTrade.module';
import { TradeOrdersCache } from '../tradeOrderCache/tradeOrderCache.entity';
import { TradeOrdersCacheModule } from '../tradeOrderCache/tradeOrderCache.module';
import { Prosumers } from '../user/user.entity';
import { ProsumersModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallets,
      IdrsConversions,
      MarketTrades,
      TradeOrdersCache,
      Prosumers,
    ]),
    forwardRef(() => IdrsConversionsModule),
    forwardRef(() => MarketTradesModule),
    forwardRef(() => TradeOrdersCacheModule),
    forwardRef(() => ProsumersModule),
  ],
  providers: [WalletsService],
  exports: [WalletsService, TypeOrmModule],
})
export class WalletsModule {}
