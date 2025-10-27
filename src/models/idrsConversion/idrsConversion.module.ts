import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdrsConversionsService } from './idrsConversion.service';
import { IdrsConversions } from './idrsConversion.entity';
import { Prosumers } from '../prosumer/user.entity';
import { ProsumersModule } from '../prosumer/user.module';
import { Wallets } from '../wallet/Wallets.entity';
import { WalletsModule } from '../wallet/Wallets.module';

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
