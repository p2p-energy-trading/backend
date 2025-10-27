import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionLogsService } from './TransactionLogs.service';
import { TransactionLogs } from './TransactionLogs.entity';
import { TradeOrdersCache } from '../TradeOrdersCache/TradeOrdersCache.entity';
import { TradeOrdersCacheModule } from '../TradeOrdersCache/TradeOrdersCache.module';
import { Prosumers } from '../prosumer/Prosumers.entity';
import { ProsumersModule } from '../prosumer/Prosumers.module';
import { EnergySettlements } from '../energySettlement/EnergySettlements.entity';
import { EnergySettlementsModule } from '../energySettlement/EnergySettlements.module';

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
  providers: [TransactionLogsService],
  exports: [TransactionLogsService, TypeOrmModule],
})
export class TransactionLogsModule {}
