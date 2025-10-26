# Data Telemetry - EnerLink IoT Smart Meter

## Overview

Sistem telemetri EnerLink menggunakan dua topik MQTT utama untuk pengiriman data dari smart meter ke backend:

1. **`enerlink/meters/data`** - Data pengukuran energi real-time dari semua subsistem (battery, solar, load, grid)
2. **`enerlink/meters/status`** - Data metadata device, konektivitas, dan sensor info

## Topic 1: `enerlink/meters/data`

**Deskripsi:** Topic ini berisi pengukuran energi real-time dari semua subsistem (battery, export, import, load, solar) beserta kalkulasi net solar dan net grid.

**Frekuensi:** Dikirim setiap 5-10 detik untuk monitoring real-time

**Struktur Data:**

```json
{
  "meterId": "METER001",
  "datetime": "2025-10-26T04:27:10Z",
  "units": {
    "datetime": "ISO8601",
    "voltage": "V",
    "current": "mA",
    "power": "mW",
    "energy": "Wh",
    ...
  },
  "data": {
    "battery": { ... },
    "export": { ... },
    "import": { ... },
    "load_smart_mtr": { ... },
    "load_home": { ... },
    "solar_input": { ... },
    "solar_output": { ... },
    "net_solar": { ... },
    "net_grid": { ... }
  }
}
```

### Field Descriptions

#### Root Level

- **`meterId`** (string): Unique identifier untuk smart meter
- **`datetime`** (ISO8601 string): Timestamp pengukuran dalam UTC
- **`units`** (object): Definisi unit untuk semua measurements
  - `voltage`: Volt (V)
  - `current`: Miliampere (mA)
  - `power`: Miliwatt (mW)
  - `energy`: Watt-hour (Wh)
  - `battery_soc`: Percentage (%)
  - `battery_charge_rate`: Percentage per hour (%/hr)

#### `data.battery` - Battery Status & Fuel Gauge

- **`voltage`** (float): Battery voltage dalam Volt (e.g., 4.04875V)
- **`soc`** (float): State of Charge dalam percentage (e.g., 86.63281%)
  - 0% = Empty
  - 100% = Full charged
- **`charge_rate`** (float): Laju pengisian/pengosongan battery dalam %/hour
  - Positif = Charging
  - Negatif = Discharging (e.g., -5.824%/hr berarti battery berkurang 5.8% per jam)
- **`is_charging`** (boolean): Flag apakah battery sedang di-charge
- **`estimated_capacity`** (float): Estimasi kapasitas battery dalam mAh (e.g., 1732.656 mAh)
- **`alert_threshold`** (integer): Threshold SOC untuk low battery alert (e.g., 10%)
- **`alert_active`** (boolean): Flag apakah alert sedang aktif (true jika SOC < threshold)
- **`connected`** (boolean): Status koneksi sensor battery
- **`valid`** (boolean): Flag apakah pembacaan valid

#### `data.export` - Export to Grid Measurements

Mengukur energi yang diekspor dari prosumer ke grid PLN/utility:

- **`voltage`** (float): Voltage pada line export dalam Volt
- **`current`** (float): Current yang mengalir dalam miliampere
- **`power`** (float): Instantaneous power dalam miliwatt (voltage × current)
- **`daily_energy`** (float): Total energy diekspor hari ini dalam Wh (reset setiap midnight)
- **`total_energy`** (float): Cumulative energy diekspor sejak device install dalam Wh
- **`settlement_energy`** (float): Energy terakumulasi sejak settlement terakhir dalam Wh
  - Digunakan untuk billing/settlement dengan grid
  - Reset setelah settlement process
- **`active`** (boolean): Flag apakah sedang aktif export (false = tidak ada ekspor saat ini)

#### `data.import` - Import from Grid Measurements

Mengukur energi yang diimpor dari grid PLN/utility:

- **`voltage`** (float): Voltage pada line import
- **`current`** (float): Current yang mengalir
- **`power`** (float): Instantaneous power dalam miliwatt
- **`daily_energy`** (float): Total energy diimpor hari ini dalam Wh
- **`total_energy`** (float): Cumulative energy diimpor sejak install
- **`settlement_energy`** (float): Energy untuk settlement billing
- **`active`** (boolean): Flag apakah sedang import (false = tidak ada impor saat ini)

#### `data.load_smart_mtr` - Smart Meter Load

Mengukur beban yang terhubung ke smart meter (controlled loads):

- **`voltage`** (float): Voltage pada load
- **`current`** (float): Current consumption dalam mA
- **`power`** (float): Power consumption dalam mW (e.g., 474.6 mW = 0.47W)
- **`daily_energy`** (float): Energy consumed hari ini
- **`total_energy`** (float): Total energy consumed sejak install

#### `data.load_home` - Home Load

Mengukur beban rumah tangga yang tidak melalui smart meter control:

- **`voltage`** (float): Voltage pada load
- **`current`** (float): Current consumption
- **`power`** (float): Power consumption (0 = tidak ada beban saat ini)
- **`daily_energy`** (float): Energy consumed hari ini
- **`total_energy`** (float): Total energy consumed

#### `data.solar_input` - Solar Panel Input (Before MPPT)

Mengukur input langsung dari panel solar sebelum MPPT controller:

- **`voltage`** (float): Voltage dari panel solar
- **`current`** (float): Current dari panel
- **`power`** (float): Power generation (0 = tidak generating, mungkin malam hari)
- **`daily_energy`** (float): Energy generated hari ini
- **`total_energy`** (float): Total energy generated sejak install
- **`generating`** (boolean): Flag apakah panel sedang menghasilkan energi

#### `data.solar_output` - Solar Output (After MPPT)

Mengukur output solar setelah melalui MPPT/charge controller:

- **`voltage`** (float): Voltage output
- **`current`** (float): Current output
- **`power`** (float): Power output
- **`daily_energy`** (float): Energy output hari ini
- **`total_energy`** (float): Total energy output
- **`generating`** (boolean): Flag generating status

#### `data.net_solar` - Net Solar Calculations

Kalkulasi netto antara solar generation dan load consumption:

- **`solar_power`** (float): Current solar power generation dalam mW
- **`load_power`** (float): Current total load consumption dalam mW
- **`net_power`** (float): Net power (solar - load) dalam mW
  - Positif = Surplus solar (bisa untuk export/charge battery)
  - Negatif = Deficit (perlu import dari grid atau battery)
  - Contoh: -474.6 mW berarti deficit 0.47W (load > solar)
- **`solar_daily`** (float): Total solar generated hari ini
- **`load_daily`** (float): Total load consumed hari ini
- **`net_daily`** (float): Net daily (solar - load)
- **`solar_total`** (float): Total solar generated sejak install
- **`load_total`** (float): Total load consumed sejak install
- **`net_total`** (float): Net total (solar - load)
- **`status`** (string): Status kondisi solar-load balance
  - `"surplus"` = Solar > Load (ada kelebihan)
  - `"deficit"` = Solar < Load (kurang, perlu import)
  - `"balanced"` = Solar ≈ Load (seimbang)

#### `data.net_grid` - Net Grid Calculations

Kalkulasi netto antara export dan import grid:

- **`export_power`** (float): Current export power dalam mW
- **`import_power`** (float): Current import power dalam mW
- **`net_power`** (float): Net power (export - import) dalam mW
  - Positif = Net export (jual ke grid)
  - Negatif = Net import (beli dari grid)
  - 0 = Tidak ada transaksi dengan grid
- **`export_daily`** (float): Total exported hari ini
- **`import_daily`** (float): Total imported hari ini (e.g., 16.69483 Wh)
- **`net_daily`** (float): Net daily (export - import)
  - Contoh: -16.69483 Wh berarti net import 16.7 Wh hari ini
- **`export_total`** (float): Total exported sejak install
- **`import_total`** (float): Total imported sejak install
- **`net_total`** (float): Net total (export - import)
  - Contoh: -12.6692 Wh berarti lifetime net import 12.67 Wh
- **`status`** (string): Status grid transaction
  - `"exporting"` = Sedang jual ke grid
  - `"importing"` = Sedang beli dari grid
  - `"idle"` = Tidak ada transaksi saat ini

---

## Topic 2: `enerlink/meters/status`

**Deskripsi:** Topic ini berisi informasi metadata device, status konektivitas (WiFi, MQTT, Grid), informasi sistem (heap, uptime), dan inventory sensor yang terpasang pada smart meter.

**Frekuensi:** Dikirim setiap 30-60 detik atau ketika ada perubahan status konektivitas

**Struktur Data:**

```json
{
  "meterId": "METER001",
  "datetime": "2025-10-26T04:26:57Z",
  "units": {
    "datetime": "ISO8601",
    "uptime": "ms",
    "free_heap": "bytes",
    "rssi": "dBm"
  },
  "data": {
    "wifi": { ... },
    "grid": { ... },
    "mqtt": { ... },
    "system": { ... },
    "sensors": { ... }
  }
}
```

### Field Descriptions

#### Root Level

- **`meterId`** (string): Unique identifier untuk smart meter (e.g., "METER001")
- **`datetime`** (ISO8601 string): Timestamp saat data dikirim dalam format UTC
- **`units`** (object): Unit pengukuran untuk setiap field data

#### `data.wifi` - WiFi Connectivity Status

- **`connected`** (boolean): Status koneksi WiFi (true = terhubung)
- **`rssi`** (integer): Signal strength dalam dBm (e.g., -39)
  - Range: -100 (lemah) hingga 0 (kuat)
  - < -70 dBm = Lemah
  - -70 to -50 dBm = Sedang
  - > -50 dBm = Kuat
- **`ip`** (string): IP address yang assigned ke device (e.g., "192.168.200.103")

#### `data.grid` - Grid Connection Mode

- **`mode`** (string): Mode operasi grid connection
  - `"off"` = Tidak terhubung ke grid
  - `"import"` = Sedang import energi dari grid
  - `"export"` = Sedang export energi ke grid
- **`importing`** (boolean): Flag apakah sedang import dari grid
- **`exporting`** (boolean): Flag apakah sedang export ke grid

#### `data.mqtt` - MQTT Broker Connection Status

- **`connected`** (boolean): Status koneksi ke MQTT broker
- **`attempts`** (integer): Jumlah percobaan koneksi (0 = berhasil di attempt pertama)
- **`qos`** (integer): Quality of Service level (0, 1, atau 2)
  - 0 = At most once (fire and forget)
  - 1 = At least once (acknowledged delivery)
  - 2 = Exactly once (assured delivery)

#### `data.system` - Device System Information

- **`free_heap`** (integer): Available heap memory dalam bytes (e.g., 214292)
  - Monitoring untuk memory leak detection
  - Nilai rendah (<50KB) bisa indikasi masalah
- **`uptime`** (integer): Waktu sejak device terakhir boot dalam milliseconds (e.g., 11850673 = ~3.3 jam)
- **`status`** (string): Overall device status
  - `"alive"` = Normal operation
  - `"warning"` = Ada issue tapi masih operational
  - `"error"` = Critical issue

#### `data.sensors` - Sensor Inventory & Configuration

- **`total_count`** (integer): Total jumlah sensor terpasang (e.g., 7)
- **`device_role`** (string): Role device dalam sistem
  - `"Prosumer"` = Ada solar panel (producer + consumer)
  - `"Consumer"` = Hanya konsumsi energi
- **`has_solar`** (boolean): Indikator apakah device memiliki solar panel

##### `sensors.ina219[]` - Current/Voltage Sensors (INA219 chips)

Array yang berisi semua INA219 sensor yang terdeteksi untuk power monitoring:

- **`address`** (string): I2C address sensor (e.g., "0x40", "0x41")
- **`name`** (string): Label sensor sesuai fungsinya:
  - `"Export"` (0x40) - Mengukur energi yang diekspor ke grid
  - `"Import"` (0x41) - Mengukur energi yang diimpor dari grid
  - `"Load Smart"` (0x42) - Mengukur beban pada smart meter
  - `"Load Home"` (0x43) - Mengukur beban rumah tangga
  - `"Solar Input"` (0x44) - Mengukur input dari panel solar
  - `"Solar Output"` (0x45) - Mengukur output solar setelah MPPT/controller
- **`connected`** (boolean): Status koneksi sensor (true = terdeteksi dan berfungsi)

##### `sensors.max17048[]` - Battery Fuel Gauge (MAX17048 chip)

Array yang berisi battery monitoring sensor:

- **`address`** (string): I2C address sensor (typically "0x36")
- **`name`** (string): Label sensor ("Battery Fuel Gauge")
- **`connected`** (boolean): Status koneksi sensor

##### Sensor Counts

- **`ina219_count`** (integer): Jumlah INA219 sensor terdeteksi (e.g., 6)
- **`max17048_count`** (integer): Jumlah MAX17048 sensor terdeteksi (typically 1)

---

## Data Flow Architecture

### 1. IoT Device → MQTT Broker

- Smart meter publish ke broker setiap 5-60 detik
- Topics: `enerlink/meters/data` dan `enerlink/meters/status`
- QoS 2 (exactly once delivery)

### 2. Backend Subscribe → Redis Storage

- Backend service subscribe kedua topic
- Data disimpan ke Redis dengan TTL 1-2 jam:
  - `telemetry:latest:data` (Hash) - Latest energy measurements
  - `telemetry:latest:status` (Hash) - Latest device metadata
  - `telemetry:timeseries:{meterId}` (Sorted Set) - Time-series snapshots

### 3. Minutely Aggregation → PostgreSQL

- Cron job jalan setiap menit
- Ambil semua snapshots dari Redis (1 menit terakhir)
- Kalkulasi statistik: avg, min, max, total
- Simpan ke table `telemetry_aggregates` di PostgreSQL
- Cleanup data lama dari Redis

### 4. Yearly Archival → MinIO

- Cron job jalan setiap hari jam 2 pagi
- Export data > 1 tahun ke CSV format
- Upload ke MinIO blob storage
- Delete dari PostgreSQL

### 5. API Access

- Real-time: Query Redis via `/telemetry/latest/*`
- Historical: Query PostgreSQL via `/telemetry/history/*`
- Archive: Download CSV dari MinIO

---

## Use Cases

### 1. Real-time Dashboard

Query Redis untuk data terbaru setiap device untuk ditampilkan di dashboard real-time

### 2. Historical Analytics

Query PostgreSQL untuk analisis trend consumption, generation, dan grid interaction

### 3. Billing & Settlement

Gunakan `settlement_energy` fields untuk kalkulasi billing periodic dengan grid utility

### 4. Anomaly Detection

Monitor `net_solar.status` dan `net_grid.status` untuk deteksi anomali atau inefficiency

### 5. Device Health Monitoring

Track `wifi.rssi`, `mqtt.connected`, `system.free_heap` untuk preventive maintenance

### 6. Battery Management

Monitor `battery.soc`, `battery.charge_rate`, dan `battery.alert_active` untuk optimasi battery lifecycle

---

## Notes

- **Voltage Values**: Dalam contoh terlihat voltage rendah (4-9V) karena menggunakan DC simulation environment untuk testing. Production device akan menggunakan standard AC voltage (220V/240V)
- **Power Units**: Semua power dalam miliwatt (mW), convert ke Watt dengan dibagi 1000
- **Energy Accumulation**: `total_energy` fields adalah cumulative counter, tidak pernah reset kecuali device di-flash ulang
- **Settlement Reset**: `settlement_energy` di-reset setelah settlement process selesai untuk billing cycle baru
