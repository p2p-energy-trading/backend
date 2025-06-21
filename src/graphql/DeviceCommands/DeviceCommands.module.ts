import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceCommandsResolver } from './DeviceCommands.resolver';
import { DeviceCommandsService } from './DeviceCommands.service';
import { DeviceCommands } from './entities/DeviceCommands.entity';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
import { ProsumersModule } from '../Prosumers/Prosumers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceCommands,
      SmartMeters,
      Prosumers,
    ]),
    forwardRef(() => SmartMetersModule),
    forwardRef(() => ProsumersModule),
  ],
  providers: [DeviceCommandsResolver, DeviceCommandsService],
  exports: [DeviceCommandsService, TypeOrmModule],
})
export class DeviceCommandsModule {}
