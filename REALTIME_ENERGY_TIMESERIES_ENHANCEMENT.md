# Real-Time Energy Data with Time Series Enhancement

## Overview
Enhanced the dashboard real-time energy functionality to efficiently handle MQTT sensor data patterns and provide time series data for visualization.

## Understanding the Data Pattern

### MQTT Message Structure
Each MQTT sensor message from a smart meter creates **exactly 5 database rows** with the **same timestamp**:

```
Timestamp: 2025-06-27 22:00:39.848 +0700
├── SOLAR       → currentPowerW: 224.0 W    (generation)
├── LOAD        → currentPowerW: 4524.0 W   (consumption)  
├── BATTERY     → currentPowerW: 5620.0 W   (positive = discharging)
├── GRID_EXPORT → currentPowerW: 60.0 W     (export to grid)
└── GRID_IMPORT → currentPowerW: 0.0 W      (import from grid)
```

### Database Pattern
- Every **5 consecutive rows** = 1 complete sensor reading
- All 5 rows share the **same timestamp**
- Each row represents a different **subsystem**
- `currentPowerW` field contains the power value in Watts

## Implementation Changes

### 1. Enhanced EnergyReadingsDetailedService

**New Methods:**

#### `findLatestCompleteSet(meterId: string)`
- Gets the **latest 5 rows** (one complete MQTT message) for a meter
- All rows have the same timestamp but different subsystems
- Ensures we get a complete picture of current energy state

#### `findTimeSeriesPowerData(meterId: string, dataPoints: number = 20)`
- Gets time series data for the last N complete sensor readings
- Groups data by timestamp to create time series points
- Each point contains power values for all 5 subsystems

### 2. Enhanced Dashboard Service

#### `getRealTimeEnergyData(prosumerId: string)`

**Old Approach (Inefficient):**
- Fetched all readings from last hour (could be 100s of rows)
- Complex filtering and grouping logic
- Inconsistent data due to incomplete sets

**New Approach (Efficient):**
- Gets exactly the **latest 5 rows** per meter using `findLatestCompleteSet()`
- Directly maps subsystem to power value
- Aggregates power across multiple meters
- Includes time series data for visualization

**Enhanced Return Structure:**
```typescript
{
  // Real-time current values (in kW)
  currentGeneration: number,    // SOLAR power
  currentConsumption: number,   // LOAD power  
  currentGridExport: number,    // GRID_EXPORT power
  currentGridImport: number,    // GRID_IMPORT power
  batteryPower: number,         // BATTERY power (+ = discharging, - = charging)
  netFlow: number,              // Generation - Consumption
  lastUpdate: string,           // ISO timestamp of latest reading
  
  // Time series for charts (last 20 data points)
  timeSeries: [
    {
      timestamp: string,        // ISO timestamp
      solar: number,           // Solar power in kW
      load: number,            // Load power in kW
      battery: number,         // Battery power in kW
      gridExport: number,      // Grid export power in kW
      gridImport: number,      // Grid import power in kW
      meterId: string         // Meter identification
    }
    // ... up to 20 data points
  ]
}
```

## Benefits

### 1. **Performance Optimization**
- **Before:** Fetch 100+ rows, complex filtering → Slow queries
- **After:** Fetch exactly 5 rows per meter → Fast, predictable queries

### 2. **Data Consistency** 
- **Before:** Risk of incomplete data sets, complex timestamp matching
- **After:** Always get complete sensor readings (all 5 subsystems)

### 3. **Real-Time Accuracy**
- **Before:** Could miss recent readings or get stale data
- **After:** Always get the very latest complete sensor reading

### 4. **Time Series Support**
- **Before:** No historical context, just current values
- **After:** 20 data points for trend visualization and charting

### 5. **Multi-Meter Support**
- Correctly aggregates power across multiple meters
- Maintains meter identification in time series
- Handles different meter update frequencies

## Power Value Mapping

| Subsystem | Database Field | Dashboard Field | Description |
|-----------|----------------|-----------------|-------------|
| SOLAR | currentPowerW | currentGeneration | Solar panel power generation |
| LOAD | currentPowerW | currentConsumption | Home energy consumption |
| GRID_EXPORT | currentPowerW | currentGridExport | Power exported to grid |
| GRID_IMPORT | currentPowerW | currentGridImport | Power imported from grid |
| BATTERY | currentPowerW | batteryPower | Battery power (+ discharging, - charging) |

## Usage Examples

### Frontend Integration
```javascript
// Fetch real-time data with time series
const response = await fetch('/dashboard/real-time-energy');
const data = await response.json();

// Current values for dashboard widgets
console.log(`Solar: ${data.currentGeneration} kW`);
console.log(`Consumption: ${data.currentConsumption} kW`);
console.log(`Net Flow: ${data.netFlow} kW`);
console.log(`Battery: ${data.batteryPower} kW`);

// Time series for charts
data.timeSeries.forEach(point => {
  console.log(`${point.timestamp}: Solar=${point.solar}kW, Load=${point.load}kW`);
});
```

### Dashboard Charts
```javascript
// Create power trend chart
const chartData = data.timeSeries.map(point => ({
  x: new Date(point.timestamp),
  solar: point.solar,
  load: point.load,
  battery: point.battery,
  gridExport: point.gridExport,
  gridImport: point.gridImport
}));
```

## Testing Strategy

### 1. **Data Pattern Verification**
```sql
-- Verify each timestamp has exactly 5 subsystems
SELECT timestamp, COUNT(*) as subsystem_count
FROM ENERGY_READINGS_DETAILED 
WHERE meterId = 'METER001'
GROUP BY timestamp 
ORDER BY timestamp DESC 
LIMIT 10;
```

### 2. **API Response Testing**
- Real-time endpoint returns current values + time series
- Power values are in kilowatts (divided by 1000)
- Time series contains exactly 20 data points or fewer
- Multi-meter aggregation works correctly

### 3. **Performance Testing**
- Query execution time should be < 100ms
- Memory usage should be minimal (only 5-100 rows per meter)
- Scales linearly with number of meters

## Configuration

### Time Series Data Points
- Default: 20 data points
- Configurable via `findTimeSeriesPowerData(meterId, dataPoints)`
- Each data point represents one complete MQTT message

### Update Frequency
- Real-time data reflects the latest complete sensor reading
- Time series updates as new MQTT messages arrive
- Typically updates every 5-30 seconds based on MQTT frequency

## Error Handling

### No Data Available
- Returns zero values for all power fields
- Empty time series array
- Graceful degradation for offline meters

### Incomplete Data Sets
- `findLatestCompleteSet()` ensures we always get complete readings
- Handles edge cases where some subsystems might be missing
- Logs warnings for data inconsistencies

This enhancement provides a robust, efficient, and scalable solution for real-time energy monitoring with historical context through time series data.
