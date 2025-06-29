import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmartMetersResolver } from './SmartMeters.resolver';
import { SmartMetersService } from './SmartMeters.service';
import { SmartMeters } from './entities/SmartMeters.entity';
import { DeviceCommands } from '../DeviceCommands/entities/DeviceCommands.entity';
import { DeviceCommandsModule } from '../DeviceCommands/DeviceCommands.module';
import { DeviceStatusSnapshots } from '../DeviceStatusSnapshots/entities/DeviceStatusSnapshots.entity';
import { DeviceStatusSnapshotsModule } from '../DeviceStatusSnapshots/DeviceStatusSnapshots.module';
import { EnergyReadingsDetailed } from '../EnergyReadingsDetailed/entities/EnergyReadingsDetailed.entity';
import { EnergyReadingsDetailedModule } from '../EnergyReadingsDetailed/EnergyReadingsDetailed.module';
import { EnergySettlements } from '../EnergySettlements/entities/EnergySettlements.entity';
import { EnergySettlementsModule } from '../EnergySettlements/EnergySettlements.module';
import { MqttMessageLogs } from '../MqttMessageLogs/entities/MqttMessageLogs.entity';
import { MqttMessageLogsModule } from '../MqttMessageLogs/MqttMessageLogs.module';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
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
  providers: [SmartMetersResolver, SmartMetersService],
  exports: [SmartMetersService, TypeOrmModule],
})
export class SmartMetersModule {}
