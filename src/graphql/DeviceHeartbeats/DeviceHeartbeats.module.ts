import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceHeartbeatsResolver } from './DeviceHeartbeats.resolver';
import { DeviceHeartbeatsService } from './DeviceHeartbeats.service';
import { DeviceHeartbeats } from './entities/DeviceHeartbeats.entity';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceHeartbeats, SmartMeters]),
    forwardRef(() => SmartMetersModule),
  ],
  providers: [DeviceHeartbeatsResolver, DeviceHeartbeatsService],
  exports: [DeviceHeartbeatsService, TypeOrmModule],
})
export class DeviceHeartbeatsModule {}
