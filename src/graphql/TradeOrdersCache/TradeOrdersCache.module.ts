import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeOrdersCacheResolver } from './TradeOrdersCache.resolver';
import { TradeOrdersCacheService } from './TradeOrdersCache.service';
import { TradeOrdersCache } from './entities/TradeOrdersCache.entity';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
import { ProsumersModule } from '../Prosumers/Prosumers.module';
import { Wallets } from '../Wallets/entities/Wallets.entity';
import { WalletsModule } from '../Wallets/Wallets.module';
import { TransactionLogs } from '../TransactionLogs/entities/TransactionLogs.entity';
import { TransactionLogsModule } from '../TransactionLogs/TransactionLogs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TradeOrdersCache,
      Prosumers,
      Wallets,
      TransactionLogs,
    ]),
    forwardRef(() => ProsumersModule),
    forwardRef(() => WalletsModule),
    forwardRef(() => TransactionLogsModule),
  ],
  providers: [TradeOrdersCacheResolver, TradeOrdersCacheService],
  exports: [TradeOrdersCacheService, TypeOrmModule],
})
export class TradeOrdersCacheModule {}
