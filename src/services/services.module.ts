import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { BlockchainService } from './blockchain.service';
import { EnergySettlementService } from './energy-settlement.service';
import { DashboardService } from './dashboard.service';
import { PriceCacheService } from './price-cache.service';
// import { DeviceMonitoringService } from './device-monitoring.service';
import { HealthCheckService } from './health-check.service';
import { MqttMessageLogsModule } from '../modules/MqttMessageLogs/MqttMessageLogs.module';
import { DeviceStatusSnapshotsModule } from '../modules/DeviceStatusSnapshots/DeviceStatusSnapshots.module';
import { DeviceCommandsModule } from '../modules/DeviceCommands/DeviceCommands.module';
import { WalletsModule } from '../modules/Wallets/Wallets.module';
import { TransactionLogsModule } from '../modules/TransactionLogs/TransactionLogs.module';
import { TradeOrdersCacheModule } from '../modules/TradeOrdersCache/TradeOrdersCache.module';
import { MarketTradesModule } from '../modules/MarketTrades/MarketTrades.module';
import { BlockchainApprovalsModule } from '../modules/BlockchainApprovals/BlockchainApprovals.module';
import { EnergySettlementsModule } from '../modules/EnergySettlements/EnergySettlements.module';
import { SmartMetersModule } from '../modules/SmartMeters/SmartMeters.module';
import { CommonModule } from '../common/common.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { EnergyReadingsDetailedModule } from 'src/modules/EnergyReadingsDetailed/EnergyReadingsDetailed.module';
import { ProsumersModule } from 'src/modules/Prosumers/Prosumers.module';

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
