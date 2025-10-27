import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergySettlementsService } from './energySettlement.service';
import { EnergySettlements } from './energySettlement.entity';
import { SmartMeters } from '../smartMeter/smartMeter.entity';
import { SmartMetersModule } from '../smartMeter/smartMeter.module';
// Removed: MqttMessageLogs (table dropped)
import { TransactionLogs } from '../transactionLog/transactionLog.entity';
import { TransactionLogsModule } from '../transactionLog/transactionLog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnergySettlements, SmartMeters, TransactionLogs]),
    forwardRef(() => SmartMetersModule),
    forwardRef(() => TransactionLogsModule),
  ],
  providers: [EnergySettlementsService],
  exports: [EnergySettlementsService, TypeOrmModule],
})
export class EnergySettlementsModule {}
