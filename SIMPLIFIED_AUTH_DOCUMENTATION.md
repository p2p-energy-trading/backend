# Simplified Authentication System Documentation

## Overview
Sistem autentikasi EnerLink P2P Energy Trading telah disederhanakan untuk hanya menggunakan **access token** saja, tanpa refresh token. Ini memudahkan implementasi dan mengurangi kompleksitas.

## Features

### 1. Access Token Only
- Hanya menggunakan JWT access token
- Expiry time dikonfigurasi melalui environment variable `JWT_EXPIRES_IN`
- Tidak ada refresh token mechanism

### 2. Token Blacklisting
- Logout akan memasukkan access token ke blacklist
- Token yang sudah di-blacklist tidak dapat digunakan lagi
- Support untuk logout dari semua device (blacklist semua token user)

### 3. Security Features
- JWT signature validation
- Token blacklist checking pada setiap request
- User blacklist checking untuk keamanan tambahan
- IP address dan User-Agent tracking untuk audit

## API Endpoints

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "prosumer": {
    "prosumerId": "prosumer_123",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{}
```

**Note:** Token diambil otomatis dari Authorization header. Tidak perlu parameter tambahan di body.

### Logout All Devices
```http
POST /auth/logout-all
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{}
```

### Get Profile
```http
GET /auth/profile
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Environment Configuration

Pastikan environment variables berikut dikonfigurasi:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Database Configuration
DATABASE_URL=your-database-url

# Encryption Keys
WALLET_ENCRYPTION_KEY=your-wallet-encryption-key
```

## Security Implementation

### JWT Authentication Guard
- Validasi JWT signature
- Check token blacklist status
- Check user blacklist status
- Extract user information untuk request

### Token Blacklisting
- Setiap logout akan blacklist token yang aktif
- Logout all devices akan blacklist semua token user
- Blacklist entries include metadata: IP, User-Agent, reason

### Database Schema
Token blacklist menggunakan table `TokenBlacklist` dengan fields:
- `token` (hashed untuk privacy)
- `prosumerId`
- `reason` (LOGOUT, LOGOUT_ALL_DEVICES, SECURITY_BREACH)
- `blacklistedAt`
- `expiresAt`
- `ipAddress`
- `userAgent`

## Testing

Gunakan file `test-access-token-logout.http` untuk testing:

1. Login untuk mendapatkan access token
2. Test logout dengan token di header
3. Test logout dengan token di body
4. Verify token sudah tidak bisa digunakan
5. Test logout all devices

## Migration Notes

Jika mengupgrade dari sistem refresh token:
1. Semua refresh token yang ada akan diabaikan
2. User perlu login ulang untuk mendapatkan access token baru
3. Database migration mungkin diperlukan untuk cleanup refresh token data

## Best Practices

1. **Token Storage**: Simpan access token di secure storage (HttpOnly cookies atau secure local storage)
2. **Token Expiry**: Set expiry time yang reasonable (1-24 jam)
3. **Logout**: Selalu logout saat user close application
4. **Security**: Monitor blacklist table untuk aktivitas mencurigakan

## Error Handling

Common error responses:

```json
// Invalid credentials
{
  "statusCode": 401,
  "message": "Invalid credentials"
}

// Token blacklisted
{
  "statusCode": 401,
  "message": "Token has been revoked or user session terminated"
}

// Token expired
{
  "statusCode": 401,
  "message": "Authentication failed"
}
```

## Implementation Details

### File Structure
```
src/auth/
├── auth.controller.ts     # Login, logout, profile endpoints
├── auth.service.ts        # Authentication business logic
├── auth.module.ts         # Module configuration
├── dto/
│   └── auth.dto.ts       # LoginDto, RegisterDto (no RefreshTokenDto)
├── guards/
│   └── auth.guards.ts    # JwtAuthGuard, LocalAuthGuard
└── strategies/
    ├── jwt.strategy.ts   # JWT validation with blacklist check
    └── local.strategy.ts # Local authentication strategy
```

### Key Components

1. **AuthService**: Handles login, register, logout with blacklist management
2. **JwtAuthGuard**: Validates JWT and checks blacklist on every request
3. **JwtStrategy**: JWT passport strategy with blacklist validation
4. **BlacklistService**: Manages token and user blacklisting

Sistem ini sudah production-ready dengan security features yang memadai untuk aplikasi P2P energy trading.
