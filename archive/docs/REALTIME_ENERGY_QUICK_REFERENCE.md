# Real-Time Energy Data Quick Reference

## Endpoint
`GET /dashboard/real-time-energy/:prosumerId`

## New Response Format (Array of Arrays)

```json
{
  "currentGeneration": 2500,
  "currentConsumption": 1800,
  "currentGridExport": 200,
  "currentGridImport": 0,
  "netFlow": 200,
  "batteryPower": -500,
  "lastUpdate": "2024-01-15T10:30:00.000Z",
  "timeSeries": [
    [
      // Time series for Meter 1
      {
        "timestamp": "2024-01-15T10:30:00.000Z",
        "solar": 2.5,
        "load": 1.8,
        "battery": -0.5,
        "batteryDirection": "charging",
        "gridExport": 0.2,
        "gridImport": 0.0,
        "netFlow": 0.2,
        "meterId": "meter_001"
      }
      // ... 19 more time points for meter_001
    ],
    [
      // Time series for Meter 2 (if multiple meters)
      {
        "timestamp": "2024-01-15T10:30:00.000Z",
        "solar": 1.8,
        "load": 2.2,
        "battery": 0.3,
        "batteryDirection": "discharging",
        "gridExport": 0.0,
        "gridImport": 0.1,
        "netFlow": -0.1,
        "meterId": "meter_002"
      }
      // ... 19 more time points for meter_002
    ]
  ]
}
```

## Key Changes
- **timeSeries** is now an array of arrays (grouped by meter)
- Each meter gets its own sub-array with up to 20 time points
- All power values are in kW (converted from W)
- Battery direction is calculated: positive = discharging, negative = charging

## Frontend Usage Examples

### React/JavaScript
```javascript
// Iterate through all meters and their time series
data.timeSeries.forEach((meterData, meterIndex) => {
  console.log(`Meter ${meterIndex + 1}:`);
  meterData.forEach(point => {
    console.log(`  ${point.timestamp}: Solar ${point.solar}kW`);
  });
});

// Chart each meter separately
data.timeSeries.map((meterData, index) => (
  <Chart key={index} data={meterData} title={`Meter ${index + 1}`} />
));
```

### TypeScript Interface
```typescript
interface RealTimeEnergyResponse {
  currentGeneration: number;
  currentConsumption: number;
  currentGridExport: number;
  currentGridImport: number;
  netFlow: number;
  batteryPower: number;
  lastUpdate: string | null;
  timeSeries: Array<Array<{
    timestamp: string;
    solar: number;
    load: number;
    battery: number;
    batteryDirection: string;
    gridExport: number;
    gridImport: number;
    netFlow: number;
    meterId: string;
  }>>;
}
```

## Testing
Use `/test-realtime-energy-refactored.http` for API testing.

## Performance
- Optimized SQL queries
- Reduced database round trips
- Pre-grouped data structure
- Up to 20 data points per meter
