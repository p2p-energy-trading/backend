import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsService } from './Wallets.service';
import { Wallets } from './Wallets.entity';
// Removed: BlockchainApprovals (not used)
import { IdrsConversions } from '../idrsConversion/IdrsConversions.entity';
import { IdrsConversionsModule } from '../idrsConversion/IdrsConversions.module';
import { MarketTrades } from '../marketTrade/MarketTrades.entity';
import { MarketTradesModule } from '../marketTrade/MarketTrades.module';
import { TradeOrdersCache } from '../TradeOrdersCache/TradeOrdersCache.entity';
import { TradeOrdersCacheModule } from '../TradeOrdersCache/TradeOrdersCache.module';
import { Prosumers } from '../prosumer/Prosumers.entity';
import { ProsumersModule } from '../prosumer/Prosumers.module';

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
