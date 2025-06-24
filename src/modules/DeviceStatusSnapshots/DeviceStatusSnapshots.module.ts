import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceStatusSnapshotsResolver } from './DeviceStatusSnapshots.resolver';
import { DeviceStatusSnapshotsService } from './DeviceStatusSnapshots.service';
import { DeviceStatusSnapshots } from './entities/DeviceStatusSnapshots.entity';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceStatusSnapshots, SmartMeters]),
    forwardRef(() => SmartMetersModule),
  ],
  providers: [DeviceStatusSnapshotsResolver, DeviceStatusSnapshotsService],
  exports: [DeviceStatusSnapshotsService, TypeOrmModule],
})
export class DeviceStatusSnapshotsModule {}
