import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceStatusSnapshotsService } from './DeviceStatusSnapshots.service';
import { DeviceStatusSnapshots } from './DeviceStatusSnapshots.entity';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceStatusSnapshots, SmartMeters]),
    forwardRef(() => SmartMetersModule),
  ],
  providers: [DeviceStatusSnapshotsService],
  exports: [DeviceStatusSnapshotsService, TypeOrmModule],
})
export class DeviceStatusSnapshotsModule {}
