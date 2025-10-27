import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './mqtt.service';
import { BlockchainService } from './blockchain.service';
import { TradingMarketService } from './trading-market.service';
import { EnergySettlementService } from './energy-settlement.service';
import { EnergyAnalyticsService } from './energy-analytics.service';
import { SmartMeterHealthService } from './smart-meter-health.service';
import { TradingAnalyticsService } from './trading-analytics.service';
import { StatService } from './stat.service';
import { PriceCacheService } from './price-cache.service';
import { RedisTelemetryService } from './redis-telemetry.service';
import { RedisOrdersService } from './redis-orders.service';
import { TradeOrdersCacheRedisService } from './trade-orders-cache-redis.service';
import { TelemetryAggregationService } from './telemetry-aggregation.service';
import { TelemetryArchivalService } from './telemetry-archival.service';
import { HealthCheckService } from './health-check.service';
import { WalletsModule } from '../models/Wallets/Wallets.module';
import { TransactionLogsModule } from '../models/TransactionLogs/TransactionLogs.module';
import { TradeOrdersCacheModule } from '../models/TradeOrdersCache/TradeOrdersCache.module';
import { MarketTradesModule } from '../models/MarketTrades/MarketTrades.module';

// Removed: BlockchainApprovals (not used)
import { EnergySettlementsModule } from '../models/EnergySettlements/EnergySettlements.module';
import { SmartMetersModule } from '../models/SmartMeters/SmartMeters.module';
import { CommonModule } from '../common/common.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { ProsumersModule } from 'src/models/Prosumers/Prosumers.module';
import { TelemetryAggregate } from '../models/TelemetryAggregate/TelemetryAggregate.entity';

@Module({
  imports: [
    CommonModule,
    WebSocketModule,
    TypeOrmModule.forFeature([TelemetryAggregate]),
    // Removed unused modules (replaced by Redis):
    // - MqttMessageLogsModule
    // - EnergyReadingsDetailedModule
    // - DeviceStatusSnapshotsModule
    // - DeviceCommandsModule
    WalletsModule,
    TransactionLogsModule,
    TradeOrdersCacheModule,
    MarketTradesModule,
    // Removed: BlockchainApprovalsModule (not used)
    EnergySettlementsModule,
    SmartMetersModule,
    ProsumersModule,
  ],
  providers: [
    MqttService,
    BlockchainService,
    TradingMarketService,
    EnergySettlementService,
    EnergyAnalyticsService,
    SmartMeterHealthService,
    TradingAnalyticsService,
    StatService,
    PriceCacheService,
    RedisTelemetryService,
    RedisOrdersService,
    TradeOrdersCacheRedisService,
    TelemetryAggregationService,
    TelemetryArchivalService,
    HealthCheckService,
  ],
  exports: [
    MqttService,
    BlockchainService,
    TradingMarketService,
    EnergySettlementService,
    EnergyAnalyticsService,
    SmartMeterHealthService,
    TradingAnalyticsService,
    StatService,
    PriceCacheService,
    RedisTelemetryService,
    RedisOrdersService,
    TradeOrdersCacheRedisService,
    TelemetryAggregationService,
    TelemetryArchivalService,
    HealthCheckService,
  ],
})
export class ServicesModule {}
