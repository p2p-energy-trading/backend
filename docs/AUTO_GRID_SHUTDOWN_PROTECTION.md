# Auto Grid Shutdown Protection Feature

## Overview

Fitur keamanan otomatis yang mencegah kegagalan settlement dengan mematikan grid import secara otomatis ketika estimasi ETK yang akan di-burn melebihi saldo ETK user.

## Latar Belakang

Ketika smart meter mengimport listrik dari grid, pada saat settlement akan terjadi pembakaran (burn) token ETK dari wallet user. Jika saldo ETK tidak mencukupi, settlement akan gagal dan dapat menyebabkan:

- Transaksi blockchain yang gagal
- Energi yang sudah dikonsumsi tidak tercatat
- Ketidakseimbangan antara data fisik dan blockchain

## Cara Kerja

### 1. Monitoring Otomatis

Sistem melakukan pengecekan setiap detik (via cron job `logPowerData`) untuk semua smart meter yang aktif.

### 2. Kondisi Trigger

Fitur ini akan aktif ketika:

- Smart meter sedang dalam status **IMPORTING** (mengimport listrik dari grid)
- Estimasi ETK yang akan di-burn **≥ Saldo ETK user**
- Safety margin 5% sudah diperhitungkan

### 3. Aksi Otomatis

Ketika kondisi terpenuhi:

1. Sistem mendeteksi insufficient balance
2. Log warning ditampilkan dengan detail:
   - Saldo ETK user saat ini
   - Estimasi burn ETK
   - Estimasi dengan safety margin (5%)
   - Current import power
   - Waktu tersisa hingga settlement
3. MQTT command dikirim ke device: `{"grid": "off"}`
4. Device akan mematikan grid import
5. Log konfirmasi ditampilkan

### 4. Safety Margin

**5% buffer** ditambahkan ke estimasi burn untuk mengatasi:

- Fluktuasi power sebelum settlement
- Network delay dalam eksekusi command
- Waktu antara pengecekan dan settlement aktual

## Perhitungan

```typescript
// Formula
const safetyMargin = 1.05; // 5%
const estimatedBurnWithMargin = estimatedEtkAtSettlement * safetyMargin;

// Kondisi trigger
if (estimatedBurnWithMargin >= etkBalance) {
  // Kirim command grid off
}
```

### Contoh

```
User Balance: 10.000 ETK
Estimated Burn: 9.600 ETK
With Safety Margin (5%): 10.080 ETK

Result: 10.080 >= 10.000 → TRIGGER (Grid akan dimatikan)
```

## Konfigurasi

### Environment Variables

```bash
# Enable/Disable fitur (default: enabled)
AUTO_GRID_SHUTDOWN_ENABLED=true

# Contract address untuk ETK token
CONTRACT_ETK_TOKEN=0x...
```

### Menonaktifkan Fitur

Untuk menonaktifkan fitur ini, set environment variable:

```bash
AUTO_GRID_SHUTDOWN_ENABLED=false
```

## Log Output

### Ketika Insufficient Balance Terdeteksi

```
[WARN] ⚠️  INSUFFICIENT BALANCE PROTECTION TRIGGERED for meter SM001:
  - User Balance: 10.000 ETK
  - Estimated Burn: 9.600 ETK
  - With Safety Margin (5%): 10.080 ETK
  - Current Import Power: -2.45 kW
  - Time Until Settlement: 03:24
  🛡️  Sending grid shutdown command to prevent settlement failure...

[LOG] ✅ Grid shutdown command sent successfully to meter SM001
```

### Ketika Error Terjadi

```
[ERROR] ❌ Error in auto-shutdown protection check for meter SM001:
  [Error details...]
```

## MQTT Command

Command yang dikirim ke device:

```json
{
  "grid": "off"
}
```

Device response (expected):

- Grid mode berubah menjadi `"off"` atau `"idle"`
- Import status menjadi `false`
- Power import menjadi `0` atau mendekati `0`

## Device Status Verification

Setelah command dikirim, verify via endpoint:

```bash
GET /smart-meters/status/:meterId
```

Expected response:

```json
{
  "data": {
    "lastStatus": {
      "grid": {
        "mode": "off",
        "importing": false,
        "exporting": false
      }
    }
  }
}
```

## Best Practices

### 1. Monitoring

- Monitor log untuk melihat trigger event
- Track frekuensi auto-shutdown per user
- Alert jika terlalu sering terjadi

### 2. User Notification

Pertimbangkan untuk menambahkan notifikasi ke user:

- Email notification
- Push notification via websocket
- SMS alert untuk kasus kritis

### 3. Balance Management

User sebaiknya:

- Maintain minimum balance untuk import
- Top up ETK sebelum balance habis
- Monitor dashboard untuk balance warning

### 4. Audit Trail

Implementasi logging ke database (saat ini optional):

```typescript
// Uncomment in code
await this.logAutoShutdownEvent(
  meterId,
  prosumerId,
  estimator.estimatedEtkAtSettlement,
  etkBalance,
);
```

## Integration Points

### 1. Energy Settlement Service

File: `src/services/energy/energy-settlement.service.ts`

- Method: `checkAndAutoShutdownGridImport()`
- Called by: `logPowerData()` cron job

### 2. Blockchain Service

- Method: `getTokenBalance()` - Get ETK balance
- Contract: ETK_ERC20

### 3. MQTT Service

- Method: `sendCommand()` - Send grid control command
- Topic: `home/energy-monitor/command`

### 4. Settlement Estimator

- Method: `getSettlementEstimator()` - Calculate estimated burn
- Returns: Status, power, estimated ETK

## Testing

### Manual Test

1. **Setup**: Create meter dengan balance rendah

```typescript
// Set balance close to estimated burn
await setUserBalance(walletAddress, 10); // 10 ETK
```

2. **Trigger**: Start importing energy

```bash
# Via MQTT or API
POST /smart-meters/grid-control
{
  "meterId": "SM001",
  "mode": "import"
}
```

3. **Verify**: Check logs untuk auto-shutdown trigger

```bash
# Monitor logs
tail -f logs/application.log | grep "INSUFFICIENT BALANCE"
```

4. **Confirm**: Verify device status

```bash
# Check grid mode
GET /smart-meters/status/SM001
```

### Unit Test (TODO)

```typescript
describe('Auto Grid Shutdown Protection', () => {
  it('should shutdown grid when balance insufficient', async () => {
    // Test implementation
  });

  it('should not shutdown when balance sufficient', async () => {
    // Test implementation
  });

  it('should apply 5% safety margin correctly', async () => {
    // Test implementation
  });
});
```

## Troubleshooting

### Issue: Grid tidak mati setelah command

**Possible Causes:**

- MQTT connection issue
- Device tidak merespons command
- Command tidak sampai ke device

**Solution:**

- Check MQTT broker status
- Verify device connectivity
- Check device logs
- Manual grid control via device

### Issue: Terlalu sering trigger

**Possible Causes:**

- Balance terlalu rendah
- Import power terlalu tinggi
- Safety margin terlalu konservatif

**Solution:**

- Top up balance
- Adjust safety margin (kurangi dari 5%)
- Limit import power

### Issue: Tidak pernah trigger meski balance rendah

**Possible Causes:**

- Feature disabled
- Settlement estimator error
- Blockchain connection issue

**Solution:**

- Check `AUTO_GRID_SHUTDOWN_ENABLED`
- Check settlement estimator logs
- Verify blockchain RPC connection

## Future Enhancements

1. **Configurable Safety Margin**

   ```bash
   AUTO_SHUTDOWN_SAFETY_MARGIN=0.05 # 5% default
   ```

2. **User Notification System**

   - Email alerts
   - WebSocket push
   - SMS notification

3. **Database Audit Log**

   - Track all auto-shutdown events
   - Analytics dashboard
   - Historical trends

4. **Gradual Power Reduction**

   - Instead of instant off
   - Reduce import power gradually
   - More graceful shutdown

5. **Predictive Analysis**
   - ML-based balance prediction
   - Earlier warning system
   - Proactive balance management

## Related Documentation

- [Energy Settlement Process](./ENERGY_SETTLEMENT.md)
- [MQTT Commands](./MQTT_COMMANDS.md)
- [Smart Meter Health Monitoring](./SMART_METER_HEALTH.md)
- [Blockchain Integration](./BLOCKCHAIN_INTEGRATION.md)

## Support

Untuk pertanyaan atau issue terkait fitur ini:

- Check logs di `logs/application.log`
- Review MQTT message logs
- Contact: backend team

---

**Version:** 1.0.0  
**Last Updated:** November 1, 2025  
**Author:** Backend P2P Energy Team
