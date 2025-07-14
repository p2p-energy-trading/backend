# EnerLink Backend - Quick Reference Guide

## 🚀 Quick Start

```bash
# Install all dependencies
./final-setup.sh

# Start development server
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

## 📊 Key Endpoints

### REST API (`/api/v1/`)
```
POST /auth/login           - User authentication
POST /auth/register        - User registration
GET  /energy/settlements   - Settlement history
POST /energy/settle/{id}   - Manual settlement
POST /device/command/{id}  - Send device command
POST /trading/order        - Place trading order
GET  /dashboard/stats      - System statistics
GET  /health              - Health check
```

### GraphQL (`/graphql`)
- Interactive playground available at `/graphql`
- All entities with CRUD operations
- Nested relationship queries
- Real-time subscriptions

### WebSocket (`/notifications`)
- Real-time notifications
- User-specific channels
- Event broadcasting

## 🔧 Configuration

### Environment Variables (`.env`)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=enerlink
DB_SCHEMA=public

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Blockchain
BLOCKCHAIN_RPC_URL=http://localhost:8545
PRIVATE_KEY=your-private-key
CONTRACT_ETK_TOKEN=0x...
CONTRACT_ENERGY_CONVERTER=0x...
CONTRACT_MARKET=0x...

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=username
MQTT_PASSWORD=password

# Settlement
AUTO_SETTLEMENT_ENABLED=true
SETTLEMENT_THRESHOLD_KWH=0.1
```

## 📁 Project Structure

```
src/
├── auth/                 # Authentication module
├── common/               # Shared utilities
│   ├── enums.ts         # System enums
│   ├── interfaces.ts    # TypeScript interfaces
│   ├── exceptions/      # Custom exceptions
│   ├── filters/         # Exception filters
│   ├── guards/          # Custom guards
│   └── middleware/      # Request middleware
├── controllers/         # REST API controllers
├── services/            # Business logic services
│   ├── blockchain.service.ts      # Blockchain integration
│   ├── mqtt.service.ts           # MQTT communication
│   ├── energy-settlement.service.ts # Settlement engine
│   ├── dashboard.service.ts      # Analytics
│   └── device-monitoring.service.ts # Device health
├── websocket/           # Real-time notifications
├── graphql/             # GraphQL schemas and resolvers
│   ├── EnergySettlements/
│   ├── SmartMeters/
│   ├── Prosumers/
│   ├── Wallets/
│   └── ...
└── main.ts             # Application bootstrap
```

## 🔌 Business Logic Flow

### Energy Settlement Process
1. **Data Collection**: Smart meters send energy readings via MQTT
2. **Calculation**: Backend calculates net energy (export - import)
3. **Threshold Check**: Verify settlement threshold is met
4. **Blockchain Transaction**: Mint/burn ETK tokens based on net energy
5. **Device Reset**: Send settlement reset command to device
6. **Notification**: Real-time notification to user

### P2P Trading Process
1. **Token Approval**: User approves tokens for trading
2. **Order Placement**: Place BID/ASK orders on blockchain
3. **Order Matching**: Automatic matching by smart contract
4. **Trade Execution**: Tokens exchanged between parties
5. **Settlement**: Update balances and notify users

### Device Communication
1. **MQTT Subscribe**: Listen for device data on topics
2. **Data Processing**: Parse and store energy readings
3. **Command Sending**: Send control commands to devices
4. **Acknowledgment**: Track command execution status
5. **Health Monitoring**: Monitor device connectivity

## 🛠️ Development Tools

### Available Scripts
```bash
npm run start:dev        # Development with hot reload
npm run start:debug      # Debug mode
npm run build           # Build for production
npm run test            # Run tests
npm run test:e2e        # End-to-end tests
npm run lint            # ESLint checking
npm run format          # Prettier formatting
```

### Database Management
```bash
# Reset database
npm run typeorm:drop

# Run migrations
npm run typeorm:migrate

# Generate migration
npm run typeorm:generate
```

## 🚨 Monitoring & Health

### Health Check Endpoints
```
GET /health       # Application health
GET /health/ready # Readiness probe
GET /health/live  # Liveness probe
```

### Logging
- Request/response logging with correlation IDs
- Error tracking with stack traces
- Performance metrics
- MQTT message audit trail

## 🔒 Security Features

- **JWT Authentication** with secure token rotation
- **Rate Limiting** to prevent API abuse
- **Input Validation** with class-validator
- **SQL Injection Protection** with TypeORM
- **CORS Configuration** for cross-origin security
- **Private Key Encryption** for blockchain wallets

## 📚 API Documentation

- **Swagger UI**: Available at `/api` when server is running
- **GraphQL Playground**: Available at `/graphql`
- **Comprehensive Examples**: Check `README_BACKEND_IMPLEMENTATION.md`

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify connection parameters in `.env`

2. **MQTT Connection Failed**
   - Check MQTT broker is accessible
   - Verify credentials in `.env`

3. **Blockchain RPC Error**
   - Check Ethereum node is running
   - Verify RPC URL and network

4. **Module Not Found Errors**
   - Run `npm install` to install dependencies
   - Check TypeScript compilation with `npm run build`

### Debug Mode
```bash
# Start with debug logging
npm run start:debug

# Check logs for detailed information
tail -f logs/application.log
```

## 📞 Support

For issues and questions:
1. Check the comprehensive documentation in `README_BACKEND_IMPLEMENTATION.md`
2. Review the implementation summary in `IMPLEMENTATION_SUMMARY.md`
3. Check the backend completion report in `BACKEND_COMPLETION_REPORT.md`

---

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Last Updated**: 2024
