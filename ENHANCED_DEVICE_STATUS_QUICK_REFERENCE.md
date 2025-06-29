# Device Status Quick Reference

## Enhanced Endpoint
`GET /device/status/:meterId`

## Key Changes
- **Heartbeat Source**: Now uses MQTT sensor data timestamps
- **Offline Threshold**: 10 seconds (reduced from 5 minutes)
- **Real-Time Detection**: Immediate offline status when sensor data stops

## New Response Format

```json
{
  "success": true,
  "data": {
    "meterId": "METER001",
    "lastHeartbeat": {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "status": "alive",
      "source": "mqtt_sensor"
    },
    "lastStatus": {
      // Device status snapshot data
    },
    "isOnline": true,
    "heartbeatThreshold": "10 seconds"
  }
}
```

## Status Determination Logic

```typescript
// Device is online if:
// 1. Latest sensor data exists
// 2. Sensor data is less than 10 seconds old
const isOnline = latestSensorTimestamp && 
  (Date.now() - latestSensorTimestamp.getTime() < 10000);
```

## New Fields
- **`source`**: Always "mqtt_sensor" to indicate heartbeat source
- **`heartbeatThreshold`**: Documents the 10-second threshold
- **Enhanced logging**: Debug information about device status detection

## Benefits
✅ **Real-time accuracy**: Based on actual sensor transmission
✅ **Quick detection**: 10-second offline threshold
✅ **Better performance**: Direct query to sensor data
✅ **Improved monitoring**: More reliable device status

## Testing
Use `/test-enhanced-device-status.http` for API testing.

## Implementation Files
- `EnergyReadingsDetailedService.findLatestSensorTimestamp()`
- `DeviceController.getDeviceStatus()` enhanced method
