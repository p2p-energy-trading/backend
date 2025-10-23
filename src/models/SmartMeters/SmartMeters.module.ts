import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmartMetersService } from './SmartMeters.service';
import { SmartMeters } from './SmartMeters.entity';
import { DeviceCommands } from '../DeviceCommands/DeviceCommands.entity';
import { DeviceCommandsModule } from '../DeviceCommands/DeviceCommands.module';
import { DeviceStatusSnapshots } from '../DeviceStatusSnapshots/DeviceStatusSnapshots.entity';
import { DeviceStatusSnapshotsModule } from '../DeviceStatusSnapshots/DeviceStatusSnapshots.module';
import { EnergyReadingsDetailed } from '../EnergyReadingsDetailed/EnergyReadingsDetailed.entity';
import { EnergyReadingsDetailedModule } from '../EnergyReadingsDetailed/EnergyReadingsDetailed.module';
import { EnergySettlements } from '../EnergySettlements/EnergySettlements.entity';
import { EnergySettlementsModule } from '../EnergySettlements/EnergySettlements.module';
import { MqttMessageLogs } from '../MqttMessageLogs/MqttMessageLogs.entity';
import { MqttMessageLogsModule } from '../MqttMessageLogs/MqttMessageLogs.module';
import { Prosumers } from '../Prosumers/Prosumers.entity';
import { ProsumersModule } from '../Prosumers/Prosumers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmartMeters,
      DeviceCommands,
      DeviceStatusSnapshots,
      EnergyReadingsDetailed,
      EnergySettlements,
      MqttMessageLogs,
      Prosumers,
    ]),
    forwardRef(() => DeviceCommandsModule),
    forwardRef(() => DeviceStatusSnapshotsModule),
    forwardRef(() => EnergyReadingsDetailedModule),
    forwardRef(() => EnergySettlementsModule),
    forwardRef(() => MqttMessageLogsModule),
    forwardRef(() => ProsumersModule),
  ],
  providers: [SmartMetersService],
  exports: [SmartMetersService, TypeOrmModule],
})
export class SmartMetersModule {}
