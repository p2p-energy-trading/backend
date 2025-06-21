import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttMessageLogsResolver } from './MqttMessageLogs.resolver';
import { MqttMessageLogsService } from './MqttMessageLogs.service';
import { MqttMessageLogs } from './entities/MqttMessageLogs.entity';
import { EnergySettlements } from '../EnergySettlements/entities/EnergySettlements.entity';
import { EnergySettlementsModule } from '../EnergySettlements/EnergySettlements.module';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MqttMessageLogs,
      EnergySettlements,
      SmartMeters,
    ]),
    forwardRef(() => EnergySettlementsModule),
    forwardRef(() => SmartMetersModule),
  ],
  providers: [MqttMessageLogsResolver, MqttMessageLogsService],
  exports: [MqttMessageLogsService, TypeOrmModule],
})
export class MqttMessageLogsModule {}
