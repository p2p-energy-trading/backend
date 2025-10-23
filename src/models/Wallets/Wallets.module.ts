import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsService } from './Wallets.service';
import { Wallets } from './Wallets.entity';
import { BlockchainApprovals } from '../BlockchainApprovals/BlockchainApprovals.entity';
import { BlockchainApprovalsModule } from '../BlockchainApprovals/BlockchainApprovals.module';
import { IdrsConversions } from '../IdrsConversions/IdrsConversions.entity';
import { IdrsConversionsModule } from '../IdrsConversions/IdrsConversions.module';
import { MarketTrades } from '../MarketTrades/MarketTrades.entity';
import { MarketTradesModule } from '../MarketTrades/MarketTrades.module';
import { TradeOrdersCache } from '../TradeOrdersCache/TradeOrdersCache.entity';
import { TradeOrdersCacheModule } from '../TradeOrdersCache/TradeOrdersCache.module';
import { Prosumers } from '../Prosumers/Prosumers.entity';
import { ProsumersModule } from '../Prosumers/Prosumers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallets,
      BlockchainApprovals,
      IdrsConversions,
      MarketTrades,
      TradeOrdersCache,
      Prosumers,
    ]),
    forwardRef(() => BlockchainApprovalsModule),
    forwardRef(() => IdrsConversionsModule),
    forwardRef(() => MarketTradesModule),
    forwardRef(() => TradeOrdersCacheModule),
    forwardRef(() => ProsumersModule),
  ],
  providers: [WalletsService],
  exports: [WalletsService, TypeOrmModule],
})
export class WalletsModule {}
