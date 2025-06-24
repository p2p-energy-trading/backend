import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsResolver } from './Wallets.resolver';
import { WalletsService } from './Wallets.service';
import { Wallets } from './entities/Wallets.entity';
import { BlockchainApprovals } from '../BlockchainApprovals/entities/BlockchainApprovals.entity';
import { BlockchainApprovalsModule } from '../BlockchainApprovals/BlockchainApprovals.module';
import { IdrsConversions } from '../IdrsConversions/entities/IdrsConversions.entity';
import { IdrsConversionsModule } from '../IdrsConversions/IdrsConversions.module';
import { MarketTrades } from '../MarketTrades/entities/MarketTrades.entity';
import { MarketTradesModule } from '../MarketTrades/MarketTrades.module';
import { TradeOrdersCache } from '../TradeOrdersCache/entities/TradeOrdersCache.entity';
import { TradeOrdersCacheModule } from '../TradeOrdersCache/TradeOrdersCache.module';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
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
  providers: [WalletsResolver, WalletsService],
  exports: [WalletsService, TypeOrmModule],
})
export class WalletsModule {}
