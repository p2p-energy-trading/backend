# Settlement Estimator Endpoint Documentation

## Overview

Endpoint Settlement Estimator menyediakan estimasi real-time untuk periodic settlement yang akan terjadi, menampilkan informasi seperti status export/import, power consumption, estimasi ETK tokens, dan waktu periode settlement.

## Endpoint

```
GET /energy/settlement-estimator
```

## Authentication

Requires JWT Bearer token authentication.

## Query Parameters

- `meterId` (optional): ID meter spesifik untuk mendapatkan estimasi. Jika tidak disediakan, akan menggunakan meter pertama yang dimiliki prosumer.

## Response Format

```json
{
  "success": true,
  "data": {
    "meterId": "METER001",
    "status": "EXPORTING|IMPORTING|IDLE",
    "periodMinutes": 5,
    "currentPowerKw": 4.3,
    "averagePowerKw": 3.98,
    "estimatedEtkAtSettlement": 0.663,
    "currentRunningEtk": 0.255,
    "periodStartTime": "00:00",
    "currentTime": "03:51",
    "periodEndTime": "05:00",
    "progressPercentage": 76.2,
    "timeRemaining": "01:09",
    "netEnergyWh": 2236.8
  }
}
```

## Response Fields Description

### Basic Information
- `meterId`: ID meter yang digunakan untuk estimasi
- `status`: Status current energy flow
  - `EXPORTING`: Sedang export energy ke grid (surplus)
  - `IMPORTING`: Sedang import energy dari grid (deficit) 
  - `IDLE`: Tidak ada activity signifikan

### Power Metrics
- `currentPowerKw`: Power consumption/generation saat ini dalam kW
- `averagePowerKw`: Rata-rata power selama periode berlangsung dalam kW
- `netEnergyWh`: Net energy akumulasi sejak periode dimulai (Wh)
  - Positif = export to grid
  - Negatif = import from grid

### Settlement Estimation
- `estimatedEtkAtSettlement`: Estimasi jumlah ETK yang akan didapat/digunakan saat settlement
- `currentRunningEtk`: Jumlah ETK yang sudah terakumulasi saat ini

### Timing Information
- `periodMinutes`: Durasi satu periode settlement (default: 5 menit)
- `periodStartTime`: Waktu mulai periode current (format HH:MM)
- `currentTime`: Waktu sekarang (format HH:MM)
- `periodEndTime`: Waktu akhir periode current (format HH:MM)
- `progressPercentage`: Persentase progress periode current (0-100%)
- `timeRemaining`: Waktu tersisa sampai settlement (format MM:SS)

## Example Usage

### 1. Get estimator for default meter
```http
GET /energy/settlement-estimator
Authorization: Bearer your_jwt_token
```

### 2. Get estimator for specific meter
```http
GET /energy/settlement-estimator?meterId=METER001
Authorization: Bearer your_jwt_token
```

## Frontend Display Example

Berdasarkan response data, frontend dapat menampilkan:

```
Periodic Settlement Estimator
Exporting (periode 5 menit)

Power sekarang: 4.30 kW
Rata-rata power: 3.98 kW
Estimasi ETK didapatkan saat settlement: 0.663 ETK
ETK berjalan: 0.255 ETK

Mulai: 00:00
Sekarang: 03:51  
Selesai: 05:00

Progress: ████████████████████████████████████████████████████████████████████████████▓▓▓▓▓▓▓▓▓▓ 76.2%
Waktu tersisa: 01:09
```

## Error Responses

### 404 - No meters found
```json
{
  "success": false,
  "error": "No meters found for this prosumer"
}
```

### 404 - Meter not found
```json
{
  "success": false,
  "error": "Meter not found or unauthorized access"
}
```

### 404 - No data available
```json
{
  "success": false,
  "error": "Unable to retrieve settlement estimator data"
}
```

## Implementation Details

### Data Sources
1. **Energy Readings**: Menggunakan `EnergyReadingsDetailed` untuk mendapatkan current dan historical power data
2. **Settlement Data**: Menggunakan settlement counters dari device MQTT data
3. **Blockchain**: Menggunakan conversion ratio dari smart contract untuk estimasi ETK

### Calculation Logic
1. **Net Energy**: `Export Energy - Import Energy` (dalam Wh)
2. **ETK Estimation**: Menggunakan blockchain conversion ratio
3. **Power Average**: Rata-rata dari readings terakhir (10 data points)
4. **Period Timing**: Berdasarkan cron schedule (default: setiap 5 menit)

### Real-time Updates
- Data di-refresh setiap kali endpoint dipanggil
- Frontend dapat polling setiap 5-10 detik untuk update real-time
- Progress percentage dan time remaining dihitung berdasarkan waktu server

## Related Endpoints

- `GET /energy/settlement/history` - Settlement history
- `GET /dashboard/real-time-energy` - Real-time energy data
- `POST /energy/settlement/manual/:meterId` - Manual settlement trigger

## Configuration

Settlement interval dapat dikonfigurasi melalui environment variable:
```env
SETTLEMENT_INTERVAL_MINUTES=5
```

Threshold untuk status determination:
- Export: `netEnergyWh > 50`
- Import: `netEnergyWh < -50`
- Idle: `-50 <= netEnergyWh <= 50`
