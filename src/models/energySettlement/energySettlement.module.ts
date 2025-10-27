import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergySettlementsService } from './energySettlement.service';
import { EnergySettlements } from './energySettlement.entity';
import { SmartMeters } from '../smartMeter/SmartMeters.entity';
import { SmartMetersModule } from '../smartMeter/SmartMeters.module';
// Removed: MqttMessageLogs (table dropped)
import { TransactionLogs } from '../transactionLog/TransactionLogs.entity';
import { TransactionLogsModule } from '../transactionLog/TransactionLogs.module';

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
