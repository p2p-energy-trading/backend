import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdrsConversionsService } from './idrsConversion.service';
import { IdrsConversion } from './idrsConversion.entity';
import { User } from '../user/user.entity';
import { UsersModule } from '../user/user.module';
import { Wallet } from '../wallet/wallet.entity';
import { WalletsModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IdrsConversion, User, Wallet]),
    forwardRef(() => UsersModule),
    forwardRef(() => WalletsModule),
  ],
  providers: [IdrsConversionsService],
  exports: [IdrsConversionsService, TypeOrmModule],
})
export class IdrsConversionsModule {}
