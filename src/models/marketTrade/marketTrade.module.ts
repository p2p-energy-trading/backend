import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketTradesService } from './marketTrade.service';
import { MarketTrades } from './marketTrade.entity';
import { Prosumers } from '../user/user.entity';
import { ProsumersModule } from '../user/user.module';
import { Wallets } from '../wallet/Wallets.entity';
import { WalletsModule } from '../wallet/Wallets.module';

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
