import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './telemetry/mqtt.service';
import { BlockchainService } from './blockchain/blockchain.service';
import { TradingMarketService } from './trading/trading-market.service';
import { EnergySettlementService } from './energy/energy-settlement.service';
import { EnergyAnalyticsService } from './energy/energy-analytics.service';
import { SmartMeterHealthService } from './smartMeter/smart-meter-health.service';
import { TradingAnalyticsService } from './trading/trading-analytics.service';
import { StatService } from './stat/stat.service';
import { PriceCacheService } from './trading/price-cache.service';
import { RedisTelemetryService } from './telemetry/redis-telemetry.service';
import { RedisOrdersService } from './trading/redis-orders.service';
import { TradeOrdersCacheRedisService } from './trading/trade-orders-cache-redis.service';
import { TelemetryAggregationService } from './telemetry/telemetry-aggregation.service';
import { TelemetryArchivalService } from './telemetry/telemetry-archival.service';
import { HealthCheckService } from './health/health-check.service';
import { WalletsModule } from '../models/wallet/Wallets.module';
import { TransactionLogsModule } from '../models/transactionLog/TransactionLogs.module';
import { TradeOrdersCacheModule } from '../models/tradeOrdersCache/TradeOrdersCache.module';
import { MarketTradesModule } from '../models/marketTrade/marketTrade.module';

// Removed: BlockchainApprovals (not used)
import { EnergySettlementsModule } from '../models/energySettlement/energySettlement.module';
import { SmartMetersModule } from '../models/smartMeter/SmartMeters.module';
import { CommonModule } from '../common/common.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { ProsumersModule } from 'src/models/prosumer/user.module';
import { TelemetryAggregate } from '../models/telemetryAggregate/TelemetryAggregate.entity';

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
