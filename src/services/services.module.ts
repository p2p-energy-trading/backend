import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { BlockchainService } from './blockchain.service';
import { EnergySettlementService } from './energy-settlement.service';
import { DashboardService } from './dashboard.service';
import { PriceCacheService } from './price-cache.service';
// import { DeviceMonitoringService } from './device-monitoring.service';
import { HealthCheckService } from './health-check.service';
import { MqttMessageLogsModule } from '../models/MqttMessageLogs/MqttMessageLogs.module';
import { DeviceStatusSnapshotsModule } from '../models/DeviceStatusSnapshots/DeviceStatusSnapshots.module';
import { DeviceCommandsModule } from '../models/DeviceCommands/DeviceCommands.module';
import { WalletsModule } from '../models/Wallets/Wallets.module';
import { TransactionLogsModule } from '../models/TransactionLogs/TransactionLogs.module';
import { TradeOrdersCacheModule } from '../models/TradeOrdersCache/TradeOrdersCache.module';
import { MarketTradesModule } from '../models/MarketTrades/MarketTrades.module';
import { BlockchainApprovalsModule } from '../models/BlockchainApprovals/BlockchainApprovals.module';
import { EnergySettlementsModule } from '../models/EnergySettlements/EnergySettlements.module';
import { SmartMetersModule } from '../models/SmartMeters/SmartMeters.module';
import { CommonModule } from '../common/common.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { EnergyReadingsDetailedModule } from 'src/models/EnergyReadingsDetailed/EnergyReadingsDetailed.module';
import { ProsumersModule } from 'src/models/Prosumers/Prosumers.module';

@Module({
  imports: [
    CommonModule,
    WebSocketModule,
    MqttMessageLogsModule,
    EnergyReadingsDetailedModule,
    DeviceStatusSnapshotsModule,
    DeviceCommandsModule,
    WalletsModule,
    TransactionLogsModule,
    TradeOrdersCacheModule,
    MarketTradesModule,
    BlockchainApprovalsModule,
    EnergySettlementsModule,
    SmartMetersModule,
    ProsumersModule,
    // DeviceMonitoringModule, // Uncomment if you have a DeviceMonitoringModule

    // DashboardService,
  ],
  providers: [
    MqttService,
    BlockchainService,
    EnergySettlementService,
    DashboardService,
    PriceCacheService,
    // DeviceMonitoringService,
    HealthCheckService,
  ],
  exports: [
    MqttService,
    BlockchainService,
    EnergySettlementService,
    DashboardService,
    PriceCacheService,
    // DeviceMonitoringService,
    HealthCheckService,
  ],
})
export class ServicesModule {}
