import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProsumersResolver } from './Prosumers.resolver';
import { ProsumersService } from './Prosumers.service';
import { Prosumers } from './entities/Prosumers.entity';
import { BlockchainApprovals } from '../BlockchainApprovals/entities/BlockchainApprovals.entity';
import { BlockchainApprovalsModule } from '../BlockchainApprovals/BlockchainApprovals.module';
import { DeviceCommands } from '../DeviceCommands/entities/DeviceCommands.entity';
import { DeviceCommandsModule } from '../DeviceCommands/DeviceCommands.module';
import { IdrsConversions } from '../IdrsConversions/entities/IdrsConversions.entity';
import { IdrsConversionsModule } from '../IdrsConversions/IdrsConversions.module';
import { MarketTrades } from '../MarketTrades/entities/MarketTrades.entity';
import { MarketTradesModule } from '../MarketTrades/MarketTrades.module';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';
import { TradeOrdersCache } from '../TradeOrdersCache/entities/TradeOrdersCache.entity';
import { TradeOrdersCacheModule } from '../TradeOrdersCache/TradeOrdersCache.module';
import { TransactionLogs } from '../TransactionLogs/entities/TransactionLogs.entity';
import { TransactionLogsModule } from '../TransactionLogs/TransactionLogs.module';
import { Wallets } from '../Wallets/entities/Wallets.entity';
import { WalletsModule } from '../Wallets/Wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Prosumers,
      BlockchainApprovals,
      DeviceCommands,
      IdrsConversions,
      MarketTrades,
      SmartMeters,
      TradeOrdersCache,
      TransactionLogs,
      Wallets,
    ]),
    forwardRef(() => BlockchainApprovalsModule),
    forwardRef(() => DeviceCommandsModule),
    forwardRef(() => IdrsConversionsModule),
    forwardRef(() => MarketTradesModule),
    forwardRef(() => SmartMetersModule),
    forwardRef(() => TradeOrdersCacheModule),
    forwardRef(() => TransactionLogsModule),
    forwardRef(() => WalletsModule),
  ],
  providers: [ProsumersResolver, ProsumersService],
  exports: [ProsumersService, TypeOrmModule],
})
export class ProsumersModule {}
