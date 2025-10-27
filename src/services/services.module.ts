import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './Telemetry/mqtt.service';
import { BlockchainService } from './Blockchain/blockchain.service';
import { TradingMarketService } from './Trading/trading-market.service';
import { EnergySettlementService } from './Energy/energy-settlement.service';
import { EnergyAnalyticsService } from './Energy/energy-analytics.service';
import { SmartMeterHealthService } from './SmartMeter/smart-meter-health.service';
import { TradingAnalyticsService } from './Trading/trading-analytics.service';
import { StatService } from './Stat/stat.service';
import { PriceCacheService } from './Trading/price-cache.service';
import { RedisTelemetryService } from './Telemetry/redis-telemetry.service';
import { RedisOrdersService } from './Trading/redis-orders.service';
import { TradeOrdersCacheRedisService } from './Trading/trade-orders-cache-redis.service';
import { TelemetryAggregationService } from './Telemetry/telemetry-aggregation.service';
import { TelemetryArchivalService } from './Telemetry/telemetry-archival.service';
import { HealthCheckService } from './Health/health-check.service';
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
