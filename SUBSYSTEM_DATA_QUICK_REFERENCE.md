# Subsystem Data Extraction - Quick Reference

## Enhanced Data Structures

### 🔋 **Battery Subsystem**
```typescript
interface BatterySubsystemData {
  soc?: number;            // State of Charge (0-100%)
  voltage?: number;        // Battery voltage (V)
  temperature?: number;    // Temperature (°C)
  charge_state?: string;   // "charging", "discharging", "idle"
}

// Usage Example:
const batteryData = result.subsystemData as BatterySubsystemData | null;
const soc = batteryData?.soc || 0;
const isCharging = batteryData?.charge_state === 'charging';
powerData.battery = isCharging ? powerW : -powerW; // Direction based on state
```

### ☀️ **Solar Subsystem**
```typescript
interface SolarSubsystemData {
  generating?: boolean;    // Currently generating power
  efficiency?: number;     // Panel efficiency (0-1)
  irradiance?: number;     // Solar irradiance (W/m²)
  panel_temp?: number;     // Panel temperature (°C)
}

// Usage Example:
const solarData = result.subsystemData as SolarSubsystemData | null;
const generating = solarData?.generating || false;
powerData.solar = generating ? powerW : 0; // Only count if generating
```

### ⚡ **Grid Subsystem**
```typescript
interface GridSubsystemData {
  active?: boolean;        // Import/export active
  direction?: string;      // "import", "export", "off"
  frequency?: number;      // Grid frequency (Hz)
  power_factor?: number;   // Power factor (0-1)
}

// Usage Example:
const gridData = result.subsystemData as GridSubsystemData | null;
const active = gridData?.active || false;
powerData.gridExport = active ? powerW : 0; // Only count if active
```

### 🏠 **Load Subsystem**
```typescript
interface LoadSubsystemData {
  power_factor?: number;   // Power factor (0-1)
  reactive_power?: number; // Reactive power (W)
}

// Usage Example:
const loadData = result.subsystemData as LoadSubsystemData | null;
const powerFactor = loadData?.power_factor || 0;
powerData.load = powerW; // Always count load power
```

## Key Improvements

### ✅ **Accurate Power Calculation**
- **Solar**: Only counted when `generating=true`
- **Battery**: Direction based on `charge_state` (+ charging, - discharging)
- **Grid**: Only counted when `active=true`
- **Load**: Always counted (continuous consumption)

### ✅ **Rich Debug Information**
```typescript
// Example debug output:
Processing BATTERY reading at 2025-06-19T20:11:36.734Z: 
  powerW=152.2, soc=85%, voltage=48.5V, temp=28.5°C, state=charging

Processing SOLAR reading at 2025-06-19T20:11:36.734Z: 
  powerW=1275.8, generating=true, efficiency=0.18, irradiance=850, temp=45.2°C
```

### ✅ **Type Safety**
- Strongly typed interfaces prevent runtime errors
- Null-safe property access with default values
- Clear data structure documentation

## Data Flow

### Input (MQTT Sensor Data)
```json
{
  "battery": {
    "power": 152.2,
    "state": "charging",
    "daily_energy_wh": 1.793849
  }
}
```

### Stored (Database subsystemData)
```json
{
  "soc": 85,
  "voltage": 48.5,
  "temperature": 28.5,
  "charge_state": "charging"
}
```

### Output (Time Series API)
```typescript
{
  timestamp: "2025-06-19T20:11:36.734Z",
  battery: 152.2,  // Positive (charging)
  solar: 1275.8,   // Only if generating
  gridExport: 0,   // Only if active
  gridImport: 0,   // Only if active
  load: 994.8      // Always counted
}
```

## Quick Implementation Checklist
- ✅ Added type interfaces for all subsystems
- ✅ Enhanced power calculation logic with state validation
- ✅ Added comprehensive debug logging
- ✅ Implemented null-safe property access
- ✅ Maintained performance optimization
- ✅ Build successful with no type errors

**Enhanced subsystem data extraction provides accurate, type-safe IoT monitoring!** 🚀
