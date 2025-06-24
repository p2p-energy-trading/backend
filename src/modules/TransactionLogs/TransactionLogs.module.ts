import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionLogsResolver } from './TransactionLogs.resolver';
import { TransactionLogsService } from './TransactionLogs.service';
import { TransactionLogs } from './entities/TransactionLogs.entity';
import { TradeOrdersCache } from '../TradeOrdersCache/entities/TradeOrdersCache.entity';
import { TradeOrdersCacheModule } from '../TradeOrdersCache/TradeOrdersCache.module';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
import { ProsumersModule } from '../Prosumers/Prosumers.module';
import { EnergySettlements } from '../EnergySettlements/entities/EnergySettlements.entity';
import { EnergySettlementsModule } from '../EnergySettlements/EnergySettlements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionLogs,
      TradeOrdersCache,
      Prosumers,
      EnergySettlements,
    ]),
    forwardRef(() => TradeOrdersCacheModule),
    forwardRef(() => ProsumersModule),
    forwardRef(() => EnergySettlementsModule),
  ],
  providers: [TransactionLogsResolver, TransactionLogsService],
  exports: [TransactionLogsService, TypeOrmModule],
})
export class TransactionLogsModule {}
