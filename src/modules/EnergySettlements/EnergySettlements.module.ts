import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergySettlementsResolver } from './EnergySettlements.resolver';
import { EnergySettlementsService } from './EnergySettlements.service';
import { EnergySettlements } from './entities/EnergySettlements.entity';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';
import { MqttMessageLogs } from '../MqttMessageLogs/entities/MqttMessageLogs.entity';
import { MqttMessageLogsModule } from '../MqttMessageLogs/MqttMessageLogs.module';
import { TransactionLogs } from '../TransactionLogs/entities/TransactionLogs.entity';
import { TransactionLogsModule } from '../TransactionLogs/TransactionLogs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EnergySettlements,
      SmartMeters,
      MqttMessageLogs,
      TransactionLogs,
    ]),
    forwardRef(() => SmartMetersModule),
    forwardRef(() => MqttMessageLogsModule),
    forwardRef(() => TransactionLogsModule),
  ],
  providers: [EnergySettlementsResolver, EnergySettlementsService],
  exports: [EnergySettlementsService, TypeOrmModule],
})
export class EnergySettlementsModule {}
