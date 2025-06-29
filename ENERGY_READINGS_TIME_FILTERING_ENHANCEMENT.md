# EnergyReadingsDetailed Time Filtering Enhancement

## Overview
Enhanced the `EnergyReadingsDetailedService.findAll()` method to support flexible time-based filtering for dashboard real-time data functionality and improved query performance.

## Changes Made

### 1. Enhanced EnergyReadingsDetailedArgs DTO
**File:** `src/modules/EnergyReadingsDetailed/dto/EnergyReadingsDetailed.args.ts`

Added new optional filtering parameters:
- `timestampFrom?: string` - Start of time range (inclusive)
- `timestampTo?: string` - End of time range (inclusive)  
- `lastHours?: number` - Get readings from the last N hours (e.g., 1 for last hour, 24 for last day)

### 2. Enhanced EnergyReadingsDetailedService.findAll()
**File:** `src/modules/EnergyReadingsDetailed/EnergyReadingsDetailed.service.ts`

**New Filtering Capabilities:**
- **Time Range Filtering:** Use `timestampFrom` and `timestampTo` for precise date range queries
- **Relative Time Filtering:** Use `lastHours` parameter for recent data (e.g., last hour, last 24 hours)
- **Backward Compatibility:** All existing exact-match filters still work

**Query Builder Enhancements:**
```typescript
// Time range filtering
if (args && args.timestampFrom !== undefined) {
  queryBuilder.andWhere('reading.timestamp >= :timestampFrom', {
    timestampFrom: new Date(args.timestampFrom),
  });
}

// Hours-based filtering for real-time data
if (args && args.lastHours !== undefined && args.lastHours > 0) {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - args.lastHours);
  queryBuilder.andWhere('reading.timestamp >= :cutoffTime', { cutoffTime });
}
```

### 3. Dashboard Service Optimization
**File:** `src/services/dashboard.service.ts`

**Real-Time Energy Method:**
- Now uses `lastHours: 1` instead of problematic exact timestamp matching
- More efficient database queries for recent data

**Energy Chart Method:**
- Optimized to use `timestampFrom` and `timestampTo` for daily data ranges
- Eliminates client-side filtering in favor of database-level filtering

## Usage Examples

### GraphQL Queries

**Get readings from last hour (for dashboard real-time data):**
```graphql
query {
  energyReadingsDetailed(meterId: "METER_001", lastHours: 1) {
    readingId
    meterId
    timestamp
    subsystem
    currentPowerW
  }
}
```

**Get readings for specific date range:**
```graphql
query {
  energyReadingsDetailed(
    meterId: "METER_001"
    timestampFrom: "2024-01-01T00:00:00Z"
    timestampTo: "2024-01-01T23:59:59Z"
  ) {
    readingId
    meterId
    timestamp
    subsystem
    currentPowerW
  }
}
```

**Get readings from last 24 hours:**
```graphql
query {
  energyReadingsDetailed(meterId: "METER_001", lastHours: 24) {
    readingId
    meterId
    timestamp
    subsystem
  }
}
```

### Service Usage

**Dashboard real-time data:**
```typescript
const recentReadings = await this.energyReadingsDetailedService.findAll({
  meterId,
  lastHours: 1, // Get readings from the last hour
});
```

**Daily energy chart data:**
```typescript
const readings = await this.energyReadingsDetailedService.findAll({
  meterId,
  timestampFrom: dayStart.toISOString(),
  timestampTo: dayEnd.toISOString(),
});
```

## Benefits

1. **Performance Improvement:**
   - Database-level filtering instead of client-side filtering
   - Reduced data transfer and memory usage
   - Faster query execution for time-based filters

2. **Dashboard Real-Time Data:**
   - Proper support for "last hour" filtering needed by dashboard
   - More accurate and efficient real-time energy readings

3. **Flexibility:**
   - Multiple time filtering options (exact, range, relative)
   - Backward compatibility with existing code
   - Easy to use for various dashboard time periods

4. **Code Maintainability:**
   - Comprehensive JSDoc documentation
   - Type-safe parameter handling
   - Consistent with existing service patterns

## Testing
- Created test file: `test-energy-readings-time-filtering.http`
- Tests cover all new filtering options and dashboard integration
- Verified backward compatibility with existing queries

## Impact on Dashboard Endpoints

The following dashboard endpoints now benefit from optimized time filtering:
- `/dashboard/real-time-energy` - Uses `lastHours: 1` for recent readings
- `/dashboard/energy-chart` - Uses `timestampFrom`/`timestampTo` for date ranges
- All other dashboard methods maintain existing functionality while gaining access to new filtering options

This enhancement directly supports the dashboard's need for real-time data while improving overall query performance across the application.
