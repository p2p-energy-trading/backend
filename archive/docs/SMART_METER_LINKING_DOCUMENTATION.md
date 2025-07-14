# Smart Meter Linking Endpoints - Implementation Documentation

## Overview
Endpoint sederhana untuk menghubungkan smart meter dengan prosumer. User yang sudah terdaftar (prosumer) dapat membuat smart meter dan secara otomatis akan di-link dengan akun mereka.

## Endpoints

### 1. Create Smart Meter (Linking)
**Endpoint:** `POST /smart-meters/create`

**Purpose:** Membuat smart meter baru dan menghubungkannya dengan prosumer yang sedang login.

**Authentication:** Requires JWT Bearer token

**Request Body:**
```json
{
  "meterId": "string (required)",
  "location": "string (optional)",
  "meterBlockchainAddress": "string (optional)",
  "deviceModel": "string (optional)",
  "deviceVersion": "string (optional)",
  "capabilities": "object (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Smart meter created and linked successfully",
  "data": {
    "meterId": "METER_TEST_001",
    "prosumerId": "prosumer_id_from_jwt",
    "location": "Jakarta Selatan, Indonesia",
    "status": "ACTIVE",
    "deviceModel": "EnerLink Smart Meter v2",
    "deviceVersion": "2.1.0",
    "mqttTopicRealtime": "enerlink/meters/METER_TEST_001/realtime",
    "mqttTopicSettlement": "enerlink/meters/METER_TEST_001/settlement",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get My Smart Meters
**Endpoint:** `GET /smart-meters/list`

**Purpose:** Mendapatkan daftar semua smart meter yang dimiliki oleh prosumer yang sedang login.

**Authentication:** Requires JWT Bearer token

**Response:**
```json
{
  "success": true,
  "message": "Smart meters retrieved successfully",
  "data": [
    {
      "meterId": "METER_TEST_001",
      "location": "Jakarta Selatan, Indonesia",
      "status": "ACTIVE",
      "deviceModel": "EnerLink Smart Meter v2",
      "deviceVersion": "2.1.0",
      "lastSeen": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "mqttTopicRealtime": "enerlink/meters/METER_TEST_001/realtime",
      "mqttTopicSettlement": "enerlink/meters/METER_TEST_001/settlement"
    }
  ],
  "count": 1
}
```

### 3. Get Specific Smart Meter
**Endpoint:** `GET /smart-meters/:meterId`

**Purpose:** Mendapatkan detail dari smart meter tertentu (hanya yang dimiliki oleh prosumer yang sedang login).

**Authentication:** Requires JWT Bearer token

**Response:**
```json
{
  "success": true,
  "message": "Smart meter retrieved successfully",
  "data": {
    "meterId": "METER_TEST_001",
    "prosumerId": "prosumer_id",
    "location": "Jakarta Selatan, Indonesia",
    "status": "ACTIVE",
    "deviceModel": "EnerLink Smart Meter v2",
    "deviceVersion": "2.1.0",
    "firmwareVersion": "1.0.0",
    "lastSeen": "2024-01-01T00:00:00.000Z",
    "lastHeartbeatAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "mqttTopicRealtime": "enerlink/meters/METER_TEST_001/realtime",
    "mqttTopicSettlement": "enerlink/meters/METER_TEST_001/settlement",
    "settlementIntervalMinutes": 5
  }
}
```

### 4. Remove Smart Meter
**Endpoint:** `DELETE /smart-meters/:meterId`

**Purpose:** Menghapus smart meter (hanya yang dimiliki oleh prosumer yang sedang login).

**Authentication:** Requires JWT Bearer token

**Response:**
```json
{
  "success": true,
  "message": "Smart meter removed successfully",
  "data": {
    "meterId": "METER_TEST_001",
    "removedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Features

### Smart Linking
- **Automatic Prosumer Linking:** Smart meter secara otomatis di-link dengan prosumer yang sedang login
- **Ownership Verification:** Semua operasi (get, delete) memverifikasi kepemilikan smart meter
- **Unique Meter ID:** Setiap meter ID harus unik di sistem

### Default Values
- **Status:** Otomatis di-set ke "ACTIVE"
- **Location:** Default "Location not specified" jika tidak diisi
- **Device Model:** Default "Generic Smart Meter" jika tidak diisi
- **Device Version:** Default "1.0.0" jika tidak diisi
- **Firmware Version:** Default "1.0.0"
- **Settlement Interval:** Default 5 menit
- **MQTT Topics:** Otomatis generated berdasarkan meter ID

### Automatic MQTT Topic Generation
- **Realtime Topic:** `enerlink/meters/{meterId}/realtime`
- **Settlement Topic:** `enerlink/meters/{meterId}/settlement`

### Capabilities Support
- Support untuk menyimpan capabilities dalam format JSON
- Capabilities bisa berisi informasi seperti:
  - `has_battery`: boolean
  - `has_solar`: boolean
  - `has_motor`: boolean
  - `max_power`: number
  - `features`: array of strings

## Error Handling

### Common Errors
- **401 Unauthorized:** JWT token tidak valid atau tidak ada
- **400 Bad Request:** Data tidak valid atau meter ID sudah ada
- **400 Bad Request:** Prosumer tidak memiliki smart meter yang diminta

### Example Error Response
```json
{
  "statusCode": 400,
  "message": "Smart meter with ID METER_TEST_001 already exists",
  "error": "Bad Request"
}
```

## Usage Examples

### Frontend Integration
```javascript
// Create smart meter
const createMeter = async (meterData) => {
  const response = await fetch('/smart-meters/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(meterData)
  });
  return response.json();
};

// Get user's smart meters
const getMyMeters = async () => {
  const response = await fetch('/smart-meters/list', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

### Mobile App Integration
```javascript
// Simple meter creation
const linkMeter = async (meterId, location) => {
  return await apiClient.post('/smart-meters/create', {
    meterId,
    location
  });
};
```

## Security Features

### Authentication
- Semua endpoint memerlukan JWT authentication
- Prosumer ID diambil dari JWT token

### Authorization
- User hanya bisa melihat dan mengelola smart meter yang mereka miliki
- Ownership verification pada setiap operasi

### Data Validation
- Meter ID wajib diisi
- Validasi format data input
- Mencegah duplikasi meter ID

## Database Integration

### Auto-Generated Fields
- `createdAt`: Timestamp saat smart meter dibuat
- `updatedAt`: Timestamp terakhir diupdate
- `lastSeen`: Timestamp terakhir device terlihat online

### Relational Data
- Smart meter otomatis terhubung dengan prosumer melalui `prosumerId`
- Mendukung one-to-many relationship (satu prosumer bisa punya banyak smart meter)

## Testing

### Test File
- **Location:** `/test-smart-meter.http`
- **Coverage:** Semua endpoint dengan berbagai skenario
- **Test Cases:** 
  - Create meter dengan data lengkap
  - Create meter dengan data minimal
  - Get list meters
  - Get specific meter
  - Delete meter
  - Error scenarios (duplicate, unauthorized)

## Future Enhancements

### Potential Improvements
1. **Bulk Operations:** Create multiple meters sekaligus
2. **Meter Status Management:** Update status meter (active/inactive)
3. **Advanced Filtering:** Filter meter by location, status, dll
4. **Meter Transfer:** Transfer ownership antar prosumer
5. **Meter Configuration:** Update device configuration remotely

### Integration Points
- **IoT Device Registration:** Automatic registration saat device connect
- **MQTT Integration:** Auto-subscribe ke topics yang sesuai
- **Dashboard Integration:** Display meter status di dashboard
- **Energy Monitoring:** Link dengan energy readings

## Conclusion

Endpoint smart meter linking ini menyediakan cara sederhana dan aman untuk menghubungkan smart meter dengan prosumer. Implementasi fokus pada kemudahan penggunaan sambil mempertahankan keamanan dan integritas data.

## Files Created/Modified

### New Files
- `/src/controllers/smart-meter.controller.ts` - Main controller implementation
- `/test-smart-meter.http` - Test cases
- `/SMART_METER_LINKING_DOCUMENTATION.md` - This documentation

### Modified Files
- `/src/controllers/controllers.module.ts` - Added SmartMeterController to module

### Dependencies Used
- `SmartMetersService` - Existing service untuk database operations
- `JwtAuthGuard` - Authentication guard
- `@nestjs/common` - Standard NestJS decorators

Implementation ini siap digunakan dan dapat di-extend sesuai kebutuhan pengembangan selanjutnya.
