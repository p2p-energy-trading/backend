import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketTradesService } from './marketTrade.service';
import { MarketTrade } from './marketTrade.entity';
import { User } from '../user/user.entity';
import { UsersModule } from '../user/user.module';
import { Wallet } from '../wallet/wallet.entity';
import { WalletsModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketTrade, User, Wallet]),
    forwardRef(() => UsersModule),
    forwardRef(() => WalletsModule),
  ],
  providers: [MarketTradesService],
  exports: [MarketTradesService, TypeOrmModule],
})
export class MarketTradesModule {}
