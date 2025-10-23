import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceCommandsService } from './DeviceCommands.service';
import { DeviceCommands } from './DeviceCommands.entity';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';
import { Prosumers } from '../Prosumers/Prosumers.entity';
import { ProsumersModule } from '../Prosumers/Prosumers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceCommands, SmartMeters, Prosumers]),
    forwardRef(() => SmartMetersModule),
    forwardRef(() => ProsumersModule),
  ],
  providers: [DeviceCommandsService],
  exports: [DeviceCommandsService, TypeOrmModule],
})
export class DeviceCommandsModule {}
