import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketTradesService } from './MarketTrades.service';
import { MarketTrades } from './MarketTrades.entity';
import { Prosumers } from '../prosumer/Prosumers.entity';
import { ProsumersModule } from '../prosumer/Prosumers.module';
import { Wallets } from '../Wallets/Wallets.entity';
import { WalletsModule } from '../Wallets/Wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketTrades, Prosumers, Wallets]),
    forwardRef(() => ProsumersModule),
    forwardRef(() => WalletsModule),
  ],
  providers: [MarketTradesService],
  exports: [MarketTradesService, TypeOrmModule],
})
export class MarketTradesModule {}
