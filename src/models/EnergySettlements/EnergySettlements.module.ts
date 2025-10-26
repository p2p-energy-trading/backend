import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergySettlementsService } from './EnergySettlements.service';
import { EnergySettlements } from './EnergySettlements.entity';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';
// Removed: MqttMessageLogs (table dropped)
import { TransactionLogs } from '../TransactionLogs/TransactionLogs.entity';
import { TransactionLogsModule } from '../TransactionLogs/TransactionLogs.module';

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
