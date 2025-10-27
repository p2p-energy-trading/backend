# Dashboard Service Update TODO

## Context

Dashboard service still references removed tables (EnergyReadingsDetailed, DeviceStatusSnapshots).
These have been temporarily stubbed to allow compilation.

## Tasks Required

### 1. Replace EnergyReadingsDetailedService with TelemetryAggregate

Methods to update:

- `findLatestEnergyStatsForDashboard()` - Line 149
- `findDeviceStatusStatsForDashboard()` - Line 363
- `findSettlementStatsForDashboard()` - Line 421
- `findDailyEnergyTotalsForChart()` - Line 455
- `findLatestCompleteSetsForMeters()` - Line 489
- `findTimeSeriesForMultipleMeters()` - Line 495
- `findTimeSeriesPowerDataOptimized()` - Line 526
- `findAll()` - Line 679

### 2. Replace DeviceStatusSnapshotsService with Redis

- Update device status queries to use RedisTelemetryService
- Get latest status from Redis instead of database snapshots

### 3. Testing

- Test all dashboard endpoints after update
- Verify data accuracy compared to old implementation
- Performance testing with TimescaleDB aggregates

## Migration Strategy

1. **Use TelemetryAggregate table** (TimescaleDB) for historical data queries
2. **Use RedisTelemetryService** for latest/realtime data
3. **Leverage continuous aggregates** (telemetry_daily_summary) for dashboard charts
4. **Keep same API contract** - frontend doesn't need changes

## Priority

- Medium - Dashboard still functional with stubs returning default values
- Should be updated before production deployment
