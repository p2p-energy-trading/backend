import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdrsConversionsService } from './idrsConversion.service';
import { IdrsConversions } from './idrsConversion.entity';
import { Prosumers } from '../user/user.entity';
import { ProsumersModule } from '../user/user.module';
import { Wallets } from '../wallet/wallet.entity';
import { WalletsModule } from '../wallet/wallet.module';

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
