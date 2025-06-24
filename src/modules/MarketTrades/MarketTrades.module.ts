import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketTradesResolver } from './MarketTrades.resolver';
import { MarketTradesService } from './MarketTrades.service';
import { MarketTrades } from './entities/MarketTrades.entity';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
import { ProsumersModule } from '../Prosumers/Prosumers.module';
import { Wallets } from '../Wallets/entities/Wallets.entity';
import { WalletsModule } from '../Wallets/Wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketTrades, Prosumers, Wallets]),
    forwardRef(() => ProsumersModule),
    forwardRef(() => WalletsModule),
  ],
  providers: [MarketTradesResolver, MarketTradesService],
  exports: [MarketTradesService, TypeOrmModule],
})
export class MarketTradesModule {}
