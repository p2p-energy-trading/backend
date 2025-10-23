import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdrsConversionsService } from './IdrsConversions.service';
import { IdrsConversions } from './IdrsConversions.entity';
import { Prosumers } from '../Prosumers/Prosumers.entity';
import { ProsumersModule } from '../Prosumers/Prosumers.module';
import { Wallets } from '../Wallets/Wallets.entity';
import { WalletsModule } from '../Wallets/Wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IdrsConversions, Prosumers, Wallets]),
    forwardRef(() => ProsumersModule),
    forwardRef(() => WalletsModule),
  ],
  providers: [IdrsConversionsService],
  exports: [IdrsConversionsService, TypeOrmModule],
})
export class IdrsConversionsModule {}
