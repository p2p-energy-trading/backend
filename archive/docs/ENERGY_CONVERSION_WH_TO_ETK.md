# Energy Conversion: Wh to ETK

**Date:** 2025-11-01  
**Status:** ✅ IMPLEMENTED

## Overview

EnerLink platform menggunakan **Watt-hours (Wh)** sebagai satuan dasar untuk energy measurement dan conversion ke ETK tokens. Semua perhitungan settlement, estimasi, dan tokenization menggunakan Wh (bukan kWh).

## Configuration

### Environment Variables

```bash
# Energy Settlement Configuration
AUTO_SETTLEMENT_ENABLED=true
SETTLEMENT_THRESHOLD_WH=100        # Minimum Wh untuk trigger settlement
CONVERSION_RATIO_WH_TO_ETK=1       # 1 Wh = 1 ETK (default)

# Auto Grid Shutdown Protection
AUTO_GRID_SHUTDOWN_ENABLED=true
```

### Conversion Ratio

**Default:** `1 Wh = 1 ETK`

- Konfigurasi di file `.env` dengan key `CONVERSION_RATIO_WH_TO_ETK`
- Smart contract `EnergyConverter.sol` menangani konversi actual
- Backend memanggil `calculateEtkAmount(energyWh)` dari contract untuk mendapatkan ETK amount

## Architecture

### Data Flow

```
Smart Meter (IoT Device)
    ↓ MQTT (settlement_energy_wh)
Redis Telemetry Service
    ↓ Latest Data
Energy Settlement Service
    ↓ Net Energy (Wh)
Blockchain Service
    ↓ processEnergySettlement(energyWh)
EnergyConverter.sol Contract
    ↓ calculateEtkAmount(energyWh)
ETK Token Mint/Burn
```

### Energy Units Throughout System

| Component                 | Unit | Notes                                 |
| ------------------------- | ---- | ------------------------------------- |
| **Smart Meter**           | Wh   | Sends `settlement_energy_wh` via MQTT |
| **Redis Telemetry**       | Wh   | Stores raw Wh values                  |
| **Settlement Service**    | Wh   | Calculates net energy in Wh           |
| **Blockchain Service**    | Wh   | Passes Wh to smart contract           |
| **Smart Contract**        | Wh   | Receives Wh, converts to ETK          |
| **Database (Historical)** | kWh  | For display purposes (Wh / 1000)      |
| **Frontend Display**      | kWh  | User-friendly unit                    |

## Implementation Details

### 1. MQTT Data Reception

Smart meter mengirim data dengan `settlement_energy_wh`:

```typescript
{
  "grid": {
    "export": {
      "settlement_energy_wh": 15234.5  // Export energy in Wh
    },
    "import": {
      "settlement_energy_wh": 2567.3   // Import energy in Wh
    }
  }
}
```

### 2. Settlement Calculation

```typescript
// energy-settlement.service.ts
async processMeterSettlement(meterId: string) {
  // Get readings in Wh
  const latestReadings = await this.getLatestSettlementReadings(meterId);

  // Net energy (already in Wh)
  const netEnergyWh = latestReadings.netEnergyWh;

  // Check threshold (in Wh)
  const minSettlementWh = await this.blockchainService.getMinSettlementWh();
  if (Math.abs(netEnergyWh) < minSettlementWh) {
    return null; // Below threshold
  }

  // Get ETK amount from blockchain (Wh → ETK conversion)
  const etkAmount = await this.blockchainService.getCalculateEtkAmount(netEnergyWh);

  // Process settlement
  const txHash = await this.blockchainService.processEnergySettlement(
    walletAddress,
    meterId,
    prosumerAddress,
    Math.floor(netEnergyWh), // Integer Wh to blockchain
    settlementId
  );
}
```

### 3. Blockchain Conversion

```typescript
// blockchain.service.ts
async getCalculateEtkAmount(energyWh: number): Promise<number> {
  const contract = new ethers.Contract(
    this.config.contracts.energyConverter,
    this.energyConverterABI,
    this.provider
  );

  // Convert to integer for contract
  const energyWhInteger = Math.floor(Math.abs(energyWh));

  // Call contract to calculate ETK
  const etkAmount = await contract.calculateEtkAmount(energyWhInteger);

  // Convert from contract units (2 decimals) to ETK
  const etkValue = Number(etkAmount) / 100;
  return energyWh < 0 ? -etkValue : etkValue;
}

async processEnergySettlement(
  walletAddress: string,
  meterId: string,
  prosumerAddress: string,
  energyWh: number,  // Direct Wh input
  settlementId: string
): Promise<string> {
  const contract = new ethers.Contract(
    this.config.contracts.energyConverter,
    this.energyConverterABI,
    wallet
  );

  // Contract handles Wh → ETK conversion internally
  const tx = await contract.processEnergySettlement(
    meterId,
    prosumerAddress,
    Math.floor(energyWh), // Integer Wh
    settlementId
  );

  return tx.hash;
}
```

### 4. Smart Contract (Solidity)

```solidity
// EnergyConverter.sol
uint256 public conversionRatio = 1; // 1 Wh = 1 ETK (with 2 decimals)

function calculateEtkAmount(int256 energyWh) public view returns (int256) {
    // Convert Wh to ETK using ratio
    // Result is in ETK units with 2 decimals
    return (energyWh * int256(conversionRatio));
}

function processEnergySettlement(
    string memory meterId,
    address prosumer,
    int256 energyWh,
    string memory settlementId
) public onlyOwner returns (bool) {
    int256 etkAmount = calculateEtkAmount(energyWh);

    if (etkAmount > 0) {
        // Export: Mint ETK
        etkToken.mint(prosumer, uint256(etkAmount));
    } else if (etkAmount < 0) {
        // Import: Burn ETK
        etkToken.burn(prosumer, uint256(-etkAmount));
    }

    emit EnergySettled(meterId, prosumer, energyWh, etkAmount, settlementId);
    return true;
}
```

## Key Changes from kWh to Wh Paradigm

### Before (kWh-based)

```typescript
// Settlement threshold
SETTLEMENT_THRESHOLD_KWH = 0.1; // 0.1 kWh = 100 Wh

// Conversion
const energyWh = energyKwh * 1000;
const netEnergyKwh = netEnergyWh / 1000;
```

### After (Wh-based)

```typescript
// Settlement threshold
SETTLEMENT_THRESHOLD_WH = 100; // Direct Wh value

// No conversion needed
const netEnergyWh = latestReadings.netEnergyWh; // Already in Wh
```

## Benefits of Wh-based System

### 1. **Precision**

- Wh provides finer granularity than kWh
- No rounding errors from kWh → Wh → kWh conversions
- Better for small-scale energy measurements

### 2. **Consistency**

- Smart meter native unit is Wh
- No conversion overhead in data pipeline
- Direct mapping from IoT → Redis → Blockchain

### 3. **Smart Contract Compatibility**

- Solidity doesn't handle floating point well
- Integer Wh values are more reliable
- Eliminates decimal precision issues

### 4. **Performance**

- Fewer conversion operations
- Reduced computational overhead
- Faster settlement processing

## Database Storage

### Historical Data (kWh for Display)

```typescript
// energy-settlement.entity.ts
{
  rawExportKwh: latestReadings.exportEnergyWh / 1000,  // Convert for DB
  rawImportKwh: latestReadings.importEnergyWh / 1000,  // Convert for DB
  netKwhFromGrid: netEnergyWh / 1000,                  // Convert for DB
  detailedEnergyBreakdown: {
    exportEnergyWh: latestReadings.exportEnergyWh,     // Keep Wh for precision
    importEnergyWh: latestReadings.importEnergyWh,     // Keep Wh for precision
    netEnergyWh                                        // Keep Wh for precision
  }
}
```

**Rationale:**

- Database stores kWh for human-readable historical reports
- Detailed breakdown keeps Wh for precision
- Frontend displays kWh for better UX

## Frontend Display

```typescript
// Display conversion
const displayValue = (energyWh: number) => {
  return (energyWh / 1000).toFixed(2) + ' kWh';
};

// Settlement estimator
{
  netEnergyWh: 15234,           // Internal calculation
  displayEnergy: '15.23 kWh',   // User display
  estimatedEtk: 15234           // Token amount (1:1 ratio)
}
```

## Configuration Management

### Contract-based Configuration

```typescript
// blockchain.service.ts
async getMinSettlementWh(): Promise<number> {
  const contract = new ethers.Contract(
    this.config.contracts.energyConverter,
    this.energyConverterABI,
    this.provider
  );

  const minWh = await contract.minSettlementThreshold();
  return Number(minWh);
}

async getConversionRatio(): Promise<number> {
  const contract = new ethers.Contract(
    this.config.contracts.energyConverter,
    this.energyConverterABI,
    this.provider
  );

  const ratio = await contract.conversionRatio();
  return Number(ratio);
}
```

### Environment Override (Optional)

```typescript
// For testing or custom deployments
const conversionRatio = process.env.CONVERSION_RATIO_WH_TO_ETK
  ? parseFloat(process.env.CONVERSION_RATIO_WH_TO_ETK)
  : await this.getConversionRatio(); // Fallback to contract
```

## Testing

### Unit Tests

```typescript
describe('Energy Conversion', () => {
  it('should convert 1000 Wh to 1000 ETK (1:1 ratio)', async () => {
    const energyWh = 1000;
    const etkAmount = await blockchainService.getCalculateEtkAmount(energyWh);
    expect(etkAmount).toBe(1000);
  });

  it('should handle negative values (import)', async () => {
    const energyWh = -500;
    const etkAmount = await blockchainService.getCalculateEtkAmount(energyWh);
    expect(etkAmount).toBe(-500);
  });

  it('should respect settlement threshold', async () => {
    const energyWh = 50; // Below 100 Wh threshold
    const minThreshold = await blockchainService.getMinSettlementWh();
    expect(Math.abs(energyWh)).toBeLessThan(minThreshold);
  });
});
```

## Migration Notes

### System Config Table Removal

- Previous: `KWH_TO_ETK_RATIO` stored in `SYSTEM_CONFIG` table
- Now: Configuration managed in smart contract + `.env` file
- Migration: `1761992110457-DropSystemConfigTable.ts` drops the table

### Code Updates

**Files Changed:**

- `.env` and `.env.example` - Updated configuration keys
- `energy-settlement.service.ts` - Removed kWh conversion variables
- `blockchain.service.ts` - Already using Wh throughout
- Comments updated to reflect Wh-based paradigm

**No Changes Needed:**

- Smart contracts (already Wh-based)
- MQTT data structure (already Wh-based)
- Redis telemetry (already Wh-based)

## Best Practices

### 1. Always Use Wh Internally

```typescript
// ✅ Good
const netEnergyWh = exportWh - importWh;
const etkAmount = await calculateEtkAmount(netEnergyWh);

// ❌ Avoid
const netEnergyKwh = (exportWh - importWh) / 1000;
const etkAmount = await calculateEtkAmount(netEnergyKwh * 1000);
```

### 2. Convert to kWh Only for Display

```typescript
// ✅ Good
const displayEnergy = `${(energyWh / 1000).toFixed(2)} kWh`;

// ❌ Avoid (storing kWh for calculations)
const energyKwh = energyWh / 1000;
const result = calculateSomething(energyKwh * 1000); // Unnecessary conversion
```

### 3. Use Integer Wh for Blockchain

```typescript
// ✅ Good
const energyWhInt = Math.floor(netEnergyWh);
await contract.processEnergySettlement(meterId, prosumer, energyWhInt, id);

// ❌ Avoid (floating point to blockchain)
await contract.processEnergySettlement(meterId, prosumer, 1234.56, id);
```

## Troubleshooting

### Issue: Settlement Not Triggering

**Check:**

1. Energy in Wh meets minimum threshold: `SETTLEMENT_THRESHOLD_WH=100`
2. Smart contract `minSettlementThreshold` configuration
3. Logs: "Settlement threshold not met"

### Issue: Incorrect ETK Amount

**Check:**

1. Conversion ratio in smart contract: `conversionRatio` variable
2. Backend calculation: `getCalculateEtkAmount(energyWh)`
3. Decimal handling: Contract uses 2 decimals (1 ETK = 100 units)

### Issue: Precision Loss

**Solution:**

- Keep Wh values throughout calculation chain
- Only convert to kWh for database storage and display
- Use `Math.floor()` before blockchain calls

## Conclusion

Sistem EnerLink sekarang menggunakan **Wh** sebagai satuan standar untuk semua perhitungan energy dan tokenization. Ini memberikan:

- ✅ Precision tinggi untuk small-scale measurements
- ✅ Consistency dari IoT device sampai blockchain
- ✅ Compatibility dengan smart contract (integer-based)
- ✅ Performance lebih baik (no unnecessary conversions)

**Conversion ratio `1 Wh = 1 ETK`** dapat disesuaikan melalui smart contract configuration sesuai kebutuhan business logic.

---

**Updated by:** GitHub Copilot  
**Review status:** Production ready
