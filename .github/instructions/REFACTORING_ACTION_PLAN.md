# Controller & Service Refactoring - Action Plan

## Summary Analisis

Berdasarkan evaluasi mendalam terhadap struktur controller dan service, ditemukan beberapa masalah kritis:

### 🔴 **Critical Issues**

1. **Dashboard Controller Overload**

   - 11 endpoints (seharusnya max 3)
   - Mencampurkan detailed operations dengan summary
   - Endpoints yang salah tempat: `energy-chart`, `real-time-energy`, `settlement-recommendations`, `device-health`, dll

2. **Service Circular Dependencies**

   - `DashboardService` ↔ `BlockchainService` (circular)
   - `DashboardService` ↔ `EnergySettlementService` (circular)
   - Terlalu banyak dependencies (8 services)

3. **Inconsistent Endpoint Organization**
   - Energy data tersebar di dashboard dan energy controller
   - Device health ada di dashboard, bukan di device controller
   - Trading performance ada di dashboard, bukan di trading controller

---

## Recommended Structure

### ✅ **Target Architecture**

```
controllers/
├── dashboard.controller.ts (3 endpoints) - Aggregate summaries only
├── energy.controller.ts (10 endpoints) - All energy operations
├── device.controller.ts (8 endpoints) - Device control & monitoring
├── trading.controller.ts (12 endpoints) - Trading + analytics
├── blockchain.controller.ts (4 endpoints) - NEW - Blockchain operations
├── telemetry.controller.ts (6 endpoints) - Telemetry data
├── wallet.controller.ts (existing)
├── smart-meter.controller.ts (existing)
├── health.controller.ts (existing)
└── debug.controller.ts (4 endpoints) - NEW - Debug/troubleshooting

services/
├── dashboard.service.ts (simplified) - Only aggregation
├── energy-analytics.service.ts (NEW) - Energy calculations & charts
├── device-health.service.ts (NEW) - Device monitoring
├── trading-analytics.service.ts (NEW) - Trading analytics
├── energy-settlement.service.ts (existing)
├── blockchain.service.ts (existing)
├── mqtt.service.ts (existing)
├── redis-telemetry.service.ts (existing)
└── ... (other existing services)
```

---

## Phase 1: High Priority (Week 1)

### Task 1.1: Create EnergyAnalyticsService

**Purpose:** Extract energy-related logic from DashboardService

**File:** `src/services/energy-analytics.service.ts`

**Methods to Extract:**

```typescript
@Injectable()
export class EnergyAnalyticsService {
  // From DashboardService
  async getEnergyStats(meterIds: string[]);
  async getEnergyChartData(prosumerId: string, days: number);
  async getRealTimeEnergyData(prosumerId: string);
  async getEnergySummary(prosumerId: string, period: string);

  // From EnergySettlementService
  async getHourlyEnergyHistory(
    prosumerId: string,
    hours: number,
    meterId?: string,
  );

  // New methods
  async getEnergyStats(prosumerId: string);
  async getDailyEnergyTotals(prosumerId: string, days: number);
}
```

**Steps:**

1. Create new service file
2. Copy methods from DashboardService
3. Update dependencies
4. Add unit tests
5. Update DashboardService to use new service

**Estimated Time:** 4 hours

---

### Task 1.2: Move Energy Endpoints to EnergyController

**Files to Modify:**

- `src/controllers/energy.controller.ts`
- `src/controllers/dashboard.controller.ts`

**Endpoints to Move:**

```typescript
// From dashboard.controller.ts → energy.controller.ts

@Get('chart') // was: /dashboard/energy-chart
@Get('real-time') // was: /dashboard/real-time-energy
@Get('summary') // was: /dashboard/energy-summary
@Get('settlement/recommendations') // was: /dashboard/settlement-recommendations
```

**Implementation:**

```typescript
// energy.controller.ts

@ApiTags('Energy')
@Controller('energy')
export class EnergyController {
  constructor(
    private energyAnalyticsService: EnergyAnalyticsService,
    private energySettlementService: EnergySettlementService,
    // ... other services
  ) {}

  @Get('chart')
  @ApiOperation({
    summary: 'Get energy chart data',
    description: 'Retrieve time-series energy data for charts and graphs',
  })
  async getEnergyChart(@Request() req, @Query('days') days?: string) {
    const prosumerId = req.user.prosumerId;
    const dayCount = days ? parseInt(days) : 7;

    const chartData = await this.energyAnalyticsService.getEnergyChartData(
      prosumerId,
      dayCount,
    );

    return { success: true, data: chartData };
  }

  @Get('real-time')
  @ApiOperation({
    summary: 'Get real-time energy data',
    description: 'Latest energy measurements from all smart meters',
  })
  async getRealTimeEnergy(@Request() req) {
    const prosumerId = req.user.prosumerId;
    const data =
      await this.energyAnalyticsService.getRealTimeEnergyData(prosumerId);
    return { success: true, data };
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get comprehensive energy summary',
    description: 'Aggregated energy statistics with generation and consumption',
  })
  async getEnergySummary(
    @Request() req,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly',
  ) {
    const prosumerId = req.user.prosumerId;
    const data = await this.energyAnalyticsService.getEnergySummary(
      prosumerId,
      period || 'daily',
    );
    return { success: true, data };
  }

  @Get('settlement/recommendations')
  @ApiOperation({
    summary: 'Get settlement recommendations',
    description:
      'Recommendations for energy settlements based on accumulated data',
  })
  async getSettlementRecommendations(@Request() req) {
    const prosumerId = req.user.prosumerId;
    const recommendations =
      await this.dashboardService.getSettlementRecommendations(prosumerId);
    return { success: true, data: recommendations };
  }
}
```

**Dashboard Controller (Keep Deprecated):**

```typescript
// dashboard.controller.ts

@Get('energy-chart')
@ApiOperation({ summary: 'Get energy chart data' })
@ApiDeprecated('Deprecated: Use GET /energy/chart instead. Will be removed in v2.0')
async getEnergyChartData(@Request() req, @Query('days') days?: string) {
  // Proxy to new endpoint
  return this.energyController.getEnergyChart(req, days);
}

@Get('real-time-energy')
@ApiDeprecated('Deprecated: Use GET /energy/real-time instead. Will be removed in v2.0')
async getRealTimeEnergyData(@Request() req) {
  return this.energyController.getRealTimeEnergy(req);
}

@Get('energy-summary')
@ApiDeprecated('Deprecated: Use GET /energy/summary instead. Will be removed in v2.0')
async getEnergySummary(@Request() req, @Query('period') period) {
  return this.energyController.getEnergySummary(req, period);
}

@Get('settlement-recommendations')
@ApiDeprecated('Deprecated: Use GET /energy/settlement/recommendations instead. Will be removed in v2.0')
async getSettlementRecommendations(@Request() req) {
  return this.energyController.getSettlementRecommendations(req);
}
```

**Estimated Time:** 6 hours

---

### Task 1.3: Create DeviceHealthService

**Purpose:** Extract device monitoring logic

**File:** `src/services/device-health.service.ts`

**Methods:**

```typescript
@Injectable()
export class DeviceHealthService {
  constructor(
    private smartMetersService: SmartMetersService,
    private redisTelemetryService: RedisTelemetryService,
  ) {}

  async getDeviceStatus(meterIds: string[]);
  async getDeviceHealth(prosumerId: string);
  async getDeviceHealthDetails(meterId: string);
  async checkDeviceConnectivity(meterId: string);
  async getDeviceList(prosumerId: string);
}
```

**Estimated Time:** 3 hours

---

### Task 1.4: Move Device Endpoints to DeviceController

**Endpoints to Add:**

```typescript
// device.controller.ts

@Get('health')
@ApiOperation({ summary: 'Get overall device health status' })
async getDeviceHealth(@Request() req) {
  const prosumerId = req.user.prosumerId;
  const health = await this.deviceHealthService.getDeviceHealth(prosumerId);
  return { success: true, data: health };
}

@Get('health/:meterId')
@ApiOperation({ summary: 'Get specific meter health details' })
async getMeterHealth(@Param('meterId') meterId: string, @Request() req) {
  const health = await this.deviceHealthService.getDeviceHealthDetails(meterId);
  return { success: true, data: health };
}

@Get('list')
@ApiOperation({ summary: 'List all devices with status' })
async listDevices(@Request() req) {
  const prosumerId = req.user.prosumerId;
  const devices = await this.deviceHealthService.getDeviceList(prosumerId);
  return { success: true, data: devices };
}

@Get('connectivity/:meterId')
@ApiOperation({ summary: 'Check device connectivity status' })
async checkConnectivity(@Param('meterId') meterId: string) {
  const status = await this.deviceHealthService.checkDeviceConnectivity(meterId);
  return { success: true, data: status };
}
```

**Estimated Time:** 4 hours

---

## Phase 2: Medium Priority (Week 2)

### Task 2.1: Create TradingAnalyticsService

**File:** `src/services/trading-analytics.service.ts`

**Methods:**

```typescript
@Injectable()
export class TradingAnalyticsService {
  async getTradingStats(walletAddresses: string[]);
  async getTradingPerformance(prosumerId: string, days: number);
  async getTradingMetrics(prosumerId: string);
  async getTradeAnalytics(prosumerId: string, period: string);
}
```

**Estimated Time:** 4 hours

---

### Task 2.2: Move Trading Analytics to TradingController

**Endpoints:**

```typescript
// trading.controller.ts

@Get('performance')
@ApiOperation({ summary: 'Get trading performance metrics' })
async getTradingPerformance(@Request() req, @Query('days') days?: string) {
  const prosumerId = req.user.prosumerId;
  const dayCount = days ? parseInt(days) : 30;
  const performance = await this.tradingAnalyticsService.getTradingPerformance(
    prosumerId,
    dayCount,
  );
  return { success: true, data: performance };
}

@Get('analytics')
@ApiOperation({ summary: 'Get detailed trading analytics' })
async getTradingAnalytics(@Request() req, @Query('period') period?: string) {
  const prosumerId = req.user.prosumerId;
  const analytics = await this.tradingAnalyticsService.getTradeAnalytics(
    prosumerId,
    period || 'monthly',
  );
  return { success: true, data: analytics };
}
```

**Estimated Time:** 3 hours

---

### Task 2.3: Create BlockchainController

**File:** `src/controllers/blockchain.controller.ts`

**Endpoints:**

```typescript
@ApiTags('Blockchain')
@Controller('blockchain')
export class BlockchainController {
  constructor(private blockchainService: BlockchainService) {}

  @Get('sync-status')
  @ApiOperation({ summary: 'Get blockchain sync status' })
  async getSyncStatus(@Request() req) {
    const prosumerId = req.user.prosumerId;
    const status =
      await this.dashboardService.getBlockchainSyncStatus(prosumerId);
    return { success: true, data: status };
  }

  @Get('network-info')
  @ApiOperation({ summary: 'Get blockchain network information' })
  async getNetworkInfo() {
    const info = await this.blockchainService.getNetworkInfo();
    return { success: true, data: info };
  }

  @Get('contracts')
  @ApiOperation({ summary: 'Get smart contract addresses' })
  async getContracts() {
    const contracts = await this.blockchainService.getContractAddresses();
    return { success: true, data: contracts };
  }

  @Get('conversion-ratio')
  @ApiOperation({ summary: 'Get ETK conversion ratio' })
  async getConversionRatio() {
    const ratio = await this.blockchainService.getConversionRatio();
    return { success: true, data: { ratio } };
  }

  @Get('min-settlement')
  @ApiOperation({ summary: 'Get minimum settlement threshold' })
  async getMinSettlement() {
    const minWh = await this.blockchainService.getMinSettlementWh();
    return { success: true, data: { minSettlementWh: minWh } };
  }
}
```

**Estimated Time:** 3 hours

---

### Task 2.4: Create DebugController

**File:** `src/controllers/debug.controller.ts`

**Purpose:** Centralize all debug/troubleshooting endpoints

```typescript
@ApiTags('Debug')
@Controller('debug')
@UseGuards(JwtAuthGuard) // Consider adding AdminGuard
export class DebugController {
  constructor(
    private redisTelemetryService: RedisTelemetryService,
    private mqttService: MqttService,
    private priceCacheService: PriceCacheService,
  ) {}

  @Get('telemetry/redis-keys')
  @ApiOperation({ summary: 'List all Redis telemetry keys' })
  async getRedisKeys() {
    const keys = await this.redisTelemetryService.getAllKeys();
    return { success: true, data: keys };
  }

  @Get('telemetry/redis-data/:meterId')
  @ApiOperation({ summary: 'Get all Redis data for a meter' })
  async getRedisData(@Param('meterId') meterId: string) {
    const data = await this.redisTelemetryService.getAllMeterData(meterId);
    return { success: true, data };
  }

  @Get('mqtt/stats')
  @ApiOperation({ summary: 'Get MQTT message statistics' })
  async getMqttStats() {
    const stats = this.mqttService.getMessageStats();
    return { success: true, data: stats };
  }

  @Get('cache/price')
  @ApiOperation({ summary: 'Get price cache debug info' })
  async getPriceCacheDebug() {
    const info = await this.priceCacheService.getDebugInfo();
    return { success: true, data: info };
  }
}
```

**Estimated Time:** 2 hours

---

## Phase 3: Low Priority (Week 3)

### Task 3.1: Refactor DashboardService

**Goal:** Reduce dependencies and complexity

**Before:**

```typescript
export class DashboardService {
  constructor(
    private telemetryAggregateRepository,
    private redisTelemetryService,
    private energySettlementsService,
    private marketTradesService,
    private smartMetersService,
    private walletsService,
    @Inject(forwardRef(() => BlockchainService)) blockchainService, // Circular!
    @Inject(forwardRef(() => EnergySettlementService)) energySettlementService, // Circular!
  ) {}

  // 8 complex methods
}
```

**After:**

```typescript
export class DashboardService {
  constructor(
    private energyAnalyticsService: EnergyAnalyticsService,
    private deviceHealthService: DeviceHealthService,
    private tradingAnalyticsService: TradingAnalyticsService,
    private walletsService: WalletsService,
    // NO circular dependencies!
  ) {}

  // Only 3 aggregate methods
  async getDashboardStats(prosumerId): Promise<DashboardStats>;
  async getSystemOverview(prosumerId);
  async getQuickStats(prosumerId);
}
```

**Implementation:**

```typescript
async getDashboardStats(prosumerId: string): Promise<DashboardStats> {
  const [
    energyStats,
    tradingStats,
    balances,
    deviceStatus,
    settlementStats,
  ] = await Promise.all([
    this.energyAnalyticsService.getEnergyStats(prosumerId),
    this.tradingAnalyticsService.getTradingStats(prosumerId),
    this.walletsService.getBalances(prosumerId),
    this.deviceHealthService.getDeviceStatus(prosumerId),
    this.energyAnalyticsService.getSettlementStats(prosumerId),
  ]);

  return {
    energyStats,
    tradingStats,
    balances,
    deviceStatus,
    settlementStats,
  };
}
```

**Estimated Time:** 8 hours

---

### Task 3.2: Update Module Dependencies

**Files to Update:**

- `src/app.module.ts`
- `src/modules/*/modules.ts`

**Changes:**

1. Register new services (EnergyAnalyticsService, DeviceHealthService, TradingAnalyticsService)
2. Register new controllers (BlockchainController, DebugController)
3. Update imports/exports
4. Update providers array

**Estimated Time:** 2 hours

---

### Task 3.3: Update Tests

**Test Files to Create/Update:**

- `energy-analytics.service.spec.ts` (new)
- `device-health.service.spec.ts` (new)
- `trading-analytics.service.spec.ts` (new)
- `blockchain.controller.spec.ts` (new)
- `debug.controller.spec.ts` (new)
- `energy.controller.spec.ts` (update)
- `device.controller.spec.ts` (update)
- `trading.controller.spec.ts` (update)
- `dashboard.service.spec.ts` (update)

**Estimated Time:** 12 hours

---

## Phase 4: Cleanup & Documentation

### Task 4.1: Remove Deprecated Endpoints

**After frontend migration (2-4 weeks):**

1. Remove deprecated endpoints from `dashboard.controller.ts`
2. Update Swagger documentation
3. Update API changelog
4. Notify API consumers

**Estimated Time:** 2 hours

---

### Task 4.2: Update Documentation

**Files to Update:**

- `README.md` - Update API structure
- `SWAGGER_GUIDE.md` - Update endpoint examples
- `API_MIGRATION_GUIDE.md` (new) - Migration instructions
- Architecture diagrams

**Estimated Time:** 4 hours

---

### Task 4.3: Performance Testing

**Tests to Run:**

1. Load testing on new endpoints
2. Response time comparison (old vs new)
3. Memory usage monitoring
4. Database query optimization

**Estimated Time:** 6 hours

---

## Total Effort Estimation

| Phase                    | Tasks        | Estimated Time         |
| ------------------------ | ------------ | ---------------------- |
| Phase 1: High Priority   | 4 tasks      | 17 hours (~2-3 days)   |
| Phase 2: Medium Priority | 4 tasks      | 12 hours (~1.5 days)   |
| Phase 3: Low Priority    | 3 tasks      | 22 hours (~3 days)     |
| Phase 4: Cleanup         | 3 tasks      | 12 hours (~1.5 days)   |
| **Total**                | **14 tasks** | **63 hours (~8 days)** |

---

## Risk Mitigation

### Backward Compatibility

- ✅ Keep old endpoints during migration
- ✅ Add deprecation warnings
- ✅ Proxy old endpoints to new ones
- ✅ Monitor usage analytics

### Testing Strategy

- ✅ Write tests before refactoring
- ✅ Test both old and new endpoints
- ✅ Integration tests
- ✅ E2E tests

### Deployment Strategy

- ✅ Deploy incrementally (one phase at a time)
- ✅ Feature flags for new endpoints
- ✅ Rollback plan
- ✅ Monitoring and alerts

---

## Success Criteria

### Technical

- [ ] Zero circular dependencies
- [ ] DashboardController has max 3 endpoints
- [ ] All services follow single responsibility
- [ ] Test coverage ≥ 90%
- [ ] No performance regression

### Business

- [ ] Frontend successfully migrated
- [ ] Zero production incidents
- [ ] API documentation complete
- [ ] Developer satisfaction improved

---

## Next Steps

1. **Review this plan** with team
2. **Get approval** from stakeholders
3. **Create Jira tickets** for each task
4. **Start Phase 1** - High priority items
5. **Iterate and improve** based on feedback

---

## Questions & Decisions Needed

1. ❓ Should we create AdminGuard for debug endpoints?
2. ❓ What's the timeline for frontend migration?
3. ❓ Should we version the API (v1 vs v2)?
4. ❓ Do we need feature flags?
5. ❓ Who will review PRs for each phase?

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-26  
**Author:** GitHub Copilot  
**Status:** Ready for Review
