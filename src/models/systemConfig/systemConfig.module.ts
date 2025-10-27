import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfigService } from './systemConfig.service';
import { SystemConfig } from './systemConfig.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  providers: [SystemConfigService],
  exports: [SystemConfigService, TypeOrmModule],
})
export class SystemConfigModule {}
