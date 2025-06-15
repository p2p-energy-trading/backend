import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { BlockchainService } from './blockchain.service';
import { EnergySettlementService } from './energy-settlement.service';
import { DashboardService } from './dashboard.service';
import { DeviceMonitoringService } from './device-monitoring.service';
import { HealthCheckService } from './health-check.service';
import { MqttMessageLogsModule } from '../graphql/MqttMessageLogs/MqttMessageLogs.module';
import { EnergyReadingsModule } from '../graphql/EnergyReadings/EnergyReadings.module';
import { DeviceHeartbeatsModule } from '../graphql/DeviceHeartbeats/DeviceHeartbeats.module';
import { DeviceStatusSnapshotsModule } from '../graphql/DeviceStatusSnapshots/DeviceStatusSnapshots.module';
import { DeviceCommandsModule } from '../graphql/DeviceCommands/DeviceCommands.module';
import { WalletsModule } from '../graphql/Wallets/Wallets.module';
import { TransactionLogsModule } from '../graphql/TransactionLogs/TransactionLogs.module';
import { TradeOrdersCacheModule } from '../graphql/TradeOrdersCache/TradeOrdersCache.module';
import { MarketTradesModule } from '../graphql/MarketTrades/MarketTrades.module';
import { BlockchainApprovalsModule } from '../graphql/BlockchainApprovals/BlockchainApprovals.module';
import { EnergySettlementsModule } from '../graphql/EnergySettlements/EnergySettlements.module';
import { SmartMetersModule } from '../graphql/SmartMeters/SmartMeters.module';
import { CommonModule } from '../common/common.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    CommonModule,
    WebSocketModule,
    MqttMessageLogsModule,
    EnergyReadingsModule,
    DeviceHeartbeatsModule,
    DeviceStatusSnapshotsModule,
    DeviceCommandsModule,
    WalletsModule,
    TransactionLogsModule,
    TradeOrdersCacheModule,
    MarketTradesModule,
    BlockchainApprovalsModule,
    EnergySettlementsModule,
    SmartMetersModule,
  ],
  providers: [
    MqttService,
    BlockchainService,
    EnergySettlementService,
    DashboardService,
    DeviceMonitoringService,
    HealthCheckService,
  ],
  exports: [
    MqttService,
    BlockchainService,
    EnergySettlementService,
    DashboardService,
    DeviceMonitoringService,
    HealthCheckService,
  ],
})
export class ServicesModule {}
