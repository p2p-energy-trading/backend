# EnerLink P2P Energy Trading Platform - Backend API

<p align="center">
  <img src="https://via.placeholder.com/300x150/1e40af/ffffff?text=EnerLink" alt="EnerLink Logo" />
</p>

<p align="center">
  <strong>Blockchain-Powered Peer-to-Peer Energy Trading Platform</strong>
</p>

<p align="center">
  <a href="#quick-start">🚀 Quick Start</a> •
  <a href="#features">✨ Features</a> •
  <a href="#api-documentation">📚 API Docs</a> •
  <a href="#architecture">🏗️ Architecture</a> •
  <a href="#deployment">🚢 Deployment</a>
</p>

---

## 🌟 Overview

EnerLink is a comprehensive peer-to-peer energy trading platform that enables prosumers (PLTS Atap owners) to trade surplus solar energy through blockchain technology. The platform integrates IoT smart meters, private Ethereum blockchain, and modern web technologies to create a transparent, secure, and efficient energy marketplace.

### 🎯 Core Technologies

- **🏠 IoT Integration**: Smart meters with bidirectional MQTT communication
- **⛓️ Blockchain**: Private Ethereum network with custom smart contracts
- **🔗 NestJS Backend**: Scalable, enterprise-grade API architecture
- **⚡ Real-time**: WebSocket-based live data streaming
- **📊 Analytics**: Comprehensive energy trading analytics

### 💡 Key Concepts

- **ETK (Energy Token)**: Digital representation of energy units (1 kWh = 1 ETK)
- **IDRS (Indonesian Rupiah Stablecoin)**: Stable digital currency for payments
- **Prosumer**: Producer + Consumer with solar panel installations
- **Smart Meter**: IoT device for energy monitoring and control

---

## ✨ Features

### 🔐 Authentication & Security
- **JWT Authentication**: Secure token-based authentication system
- **Wallet Management**: Encrypted private key storage and management
- **Role-based Access**: Scope-based data access (`own`, `public`, `all`)
- **Rate Limiting**: API throttling and security protection
- **Audit Logging**: Comprehensive security monitoring

### 🏠 IoT & Smart Meter Integration
- **MQTT Communication**: Bidirectional real-time messaging
- **Device Management**: Smart meter registration and monitoring
- **Remote Control**: Device command execution with correlation tracking
- **Health Monitoring**: Real-time device status and heartbeat tracking
- **Energy Readings**: Time-series data collection and storage

### ⛓️ Blockchain Integration
- **Smart Contracts**: ETK token and marketplace contracts
- **Wallet Operations**: Balance queries and transaction management
- **Event Listening**: Real-time blockchain event processing
- **Token Management**: ETK and IDRS token operations
- **Transaction Logging**: Complete blockchain transaction audit

### ⚡ Energy Trading
- **P2P Marketplace**: Decentralized energy trading platform
- **Order Management**: BID/ASK order placement and tracking
- **Automated Matching**: Smart contract-based order execution
- **Real-time Data**: Live order book and trade history
- **Settlement Engine**: Automated energy-to-token conversion

### 📊 Analytics & Monitoring
- **Real-time Dashboard**: Live energy and trading metrics
- **Historical Data**: Comprehensive time-series analytics
- **Market Insights**: Trading statistics and price discovery
- **Performance Monitoring**: System health and performance tracking
- **Custom Alerts**: Automated notification system

### 🌐 API Architecture
- **REST API**: Traditional HTTP endpoints for all operations
- **GraphQL API**: Flexible data querying with Apollo Server
- **WebSocket**: Real-time notifications and live updates
- **Swagger Documentation**: Interactive API documentation
- **Flexible Pagination**: Configurable data limits and scoping

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 21+ and npm
- **PostgreSQL** 16+
- **MQTT Broker** (Mosquitto recommended)
- **Ethereum Node** (Hardhat for development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nestjs-with-relation

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:setup

# Start development server
npm run start:dev
```

### Environment Configuration

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=enerlink_db

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Blockchain
BLOCKCHAIN_RPC_URL=http://localhost:8545
PRIVATE_KEY=your-wallet-private-key
ETK_CONTRACT_ADDRESS=0x...
IDRS_CONTRACT_ADDRESS=0x...
MARKET_CONTRACT_ADDRESS=0x...

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=your_mqtt_username
MQTT_PASSWORD=your_mqtt_password

# Application
PORT=3000
NODE_ENV=development
```

---

## 📚 API Documentation

### 🔗 API Endpoints Overview

The EnerLink platform provides comprehensive REST and GraphQL APIs for all system operations:

#### 🔐 Authentication APIs
```bash
POST /auth/register          # Prosumer registration
POST /auth/login             # User authentication
POST /auth/logout            # Secure logout
GET  /auth/profile           # User profile information
```

#### 🏠 IoT & Device Management APIs
```bash
GET    /devices                    # List smart meters
POST   /devices                    # Register new smart meter
GET    /devices/:id/status         # Device status and health
POST   /devices/:id/commands       # Send device commands
GET    /devices/:id/heartbeat      # Device heartbeat monitoring
```

#### ⚡ Energy Management APIs
```bash
GET  /energy/readings              # Energy readings with time filtering
GET  /energy/readings/detailed     # Subsystem-level energy data
GET  /energy/settlement/history    # Settlement history with scope
POST /energy/settlement/trigger    # Manual settlement trigger
GET  /energy/dashboard             # Real-time energy dashboard
```

#### ⛓️ Blockchain & Wallet APIs
```bash
GET    /wallet/balance             # Wallet token balances
GET    /wallet/transactions/idrs   # IDRS transaction history
GET    /wallet/transactions/token-minting  # Token minting history
POST   /wallet/idrs/convert        # IDRS conversion operations
```

#### 💹 Trading APIs
```bash
GET    /trading/orders             # Trading orders with scope & pagination
GET    /trading/trades             # Market trades with scope & pagination
POST   /trading/orders             # Place new trading order
DELETE /trading/orders/:id         # Cancel trading order
GET    /trading/market/summary     # Market statistics and analytics
```

### 📖 API Scope Parameters

All major endpoints support flexible scope parameters for data transparency:

| Scope | Description | Use Case |
|-------|-------------|----------|
| `own` | Personal data only | User dashboard |
| `public` | Anonymized market data | Market transparency |
| `all` | Complete data (admin) | System administration |

#### Example API Calls

```bash
# Personal energy settlement history
GET /energy/settlement/history?scope=own&limit=50

# Public market transparency
GET /trading/orders?scope=public&status=OPEN&limit=100

# Admin market analysis
GET /trading/trades?scope=all&limit=500
```

### 🌐 GraphQL API

Access the GraphQL playground at `http://localhost:3000/graphql`

**Sample Queries:**
```graphql
# Get prosumer profile with energy data
query GetProsumerDashboard {
  me {
    id
    username
    email
    smartMeters {
      id
      deviceId
      status
      lastReading {
        timestamp
        solarPower
        batteryPower
        gridExportPower
      }
    }
  }
}

# Get market trading data
query GetMarketData {
  tradeOrders(status: OPEN, limit: 20) {
    id
    orderType
    amountEtk
    priceIdrsPerEtk
    createdAt
  }
}
```

### 📡 WebSocket Events

Real-time notifications available at `ws://localhost:3000`

**Event Types:**
- `energy.reading` - New energy readings
- `device.status` - Device status changes
- `settlement.completed` - Energy settlement completion
- `trade.executed` - Trade execution notifications
- `order.placed` - New order notifications

### 🔧 Swagger Documentation

Interactive API documentation available at:
- **Development**: `http://localhost:3000/api`
- **Swagger JSON**: `http://localhost:3000/api-json`

---

## 🏗️ Architecture

### 🏛️ System Architecture

```
EnerLink P2P Energy Trading Platform

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IoT Devices   │    │  Frontend Apps  │    │   Admin Panel   │
│  (Smart Meters) │    │ (React/Mobile)  │    │   (Dashboard)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ MQTT                 │ HTTP/WS              │ HTTP
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS Backend API                          │
├─────────────────────────────────────────────────────────────────┤
│  🔐 Auth  │  🏠 IoT   │  ⚡ Energy │  ⛓️ Blockchain │  💹 Trading │
│  Module   │  Module   │  Module    │   Module      │   Module    │
├─────────────────────────────────────────────────────────────────┤
│          📊 Services │ 🔄 Controllers │ 🌐 Gateways             │
└─────────┬─────────────────────┬─────────────────────┬───────────┘
          │                     │                     │
          ▼                     ▼                     ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │  MQTT Broker    │    │   Ethereum      │
│   (Database)    │    │  (Mosquitto)    │    │   (Blockchain)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 🗂️ Project Structure

```
src/
├── auth/                    # Authentication & authorization
│   ├── guards/             # JWT guards and role protection
│   ├── strategies/         # Passport strategies
│   └── decorators/         # Custom auth decorators
├── modules/                # Core business modules
│   ├── prosumer/          # User management
│   ├── smart-meter/       # IoT device management
│   ├── energy/           # Energy readings & settlement
│   ├── wallet/           # Blockchain wallet operations
│   └── trading/          # P2P trading marketplace
├── services/              # Shared business logic
│   ├── mqtt/             # MQTT communication service
│   ├── blockchain/       # Ethereum integration
│   ├── settlement/       # Energy settlement engine
│   └── websocket/        # Real-time notifications
├── controllers/           # HTTP request handlers
├── common/               # Shared utilities & decorators
└── websocket/           # WebSocket gateways
```

### 🗄️ Database Schema

**Core Entities:**
- `PROSUMERS` - User accounts and authentication
- `WALLETS` - Encrypted blockchain wallet management
- `SMART_METERS` - IoT device registry with capabilities
- `ENERGY_READINGS` - Time-series energy measurements
- `ENERGY_SETTLEMENTS` - Settlement records with blockchain hashes
- `TRADE_ORDERS_CACHE` - Order book cache from blockchain
- `MARKET_TRADES` - Executed trade history
- `MQTT_MESSAGE_LOGS` - MQTT communication audit trail

### ⛓️ Smart Contracts

- **EnergyConverter.sol** - Energy-to-token conversion
- **Market.sol** - Decentralized trading marketplace
- **ETK_Token.sol** - Energy token (ERC-20)
- **IDRS_Token.sol** - Indonesian Rupiah stablecoin (ERC-20)

---

## 🔧 Development

### 🛠️ Available Scripts

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugging
npm run start:prod         # Production mode

# Building
npm run build              # Compile TypeScript
npm run format             # Format code with Prettier
npm run lint               # Lint and fix code

# Testing
npm run test               # Unit tests
npm run test:watch         # Watch mode testing
npm run test:cov           # Test coverage
npm run test:e2e           # End-to-end tests

# Database
npm run db:setup           # Setup database and run migrations
npm run db:seed            # Seed database with test data
npm run db:reset           # Reset database
```

### 🧪 Testing

Comprehensive testing strategy with multiple test types:

**Unit Tests:**
```bash
npm run test
```

**Integration Tests:**
```bash
npm run test:e2e
```

**API Testing:**
Use the provided `.http` files in the project root:
- `test-dashboard-endpoints.http`
- `test-energy-settlement.http`
- `test-trading-enhanced.http`
- `test-realtime-energy-performance.http`

### 🚀 Performance Optimization

- **Database Indexing**: Optimized queries for time-series data
- **Connection Pooling**: Efficient database connection management
- **Caching Strategy**: Redis integration for frequently accessed data
- **Pagination**: Configurable limits for large datasets
- **Background Jobs**: Cron-based settlement processing

---

## 🚢 Deployment

### 🐳 Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=postgres
      - MQTT_BROKER_URL=mqtt://mosquitto:1883
    depends_on:
      - postgres
      - mosquitto
      - hardhat
    
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: enerlink_db
      POSTGRES_USER: enerlink
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/sql.sql:/docker-entrypoint-initdb.d/schema.sql
    
  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
      
  hardhat:
    image: ethereum/client-go:latest
    ports:
      - "8545:8545"
    command: --dev --http --http.addr=0.0.0.0

volumes:
  postgres_data:
```

### ☁️ Cloud Deployment

**AWS Deployment:**
```bash
# Install AWS CDK
npm install -g aws-cdk

# Deploy infrastructure
cdk bootstrap
cdk deploy EnerLinkStack
```

**Kubernetes Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: enerlink-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: enerlink-api
  template:
    metadata:
      labels:
        app: enerlink-api
    spec:
      containers:
      - name: api
        image: enerlink/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_HOST
          value: "postgres-service"
        - name: MQTT_BROKER_URL
          value: "mqtt://mosquitto-service:1883"
```

### 🏭 Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Smart contracts deployed
- [ ] MQTT broker configured
- [ ] SSL certificates installed
- [ ] Monitoring and logging setup
- [ ] Backup strategy implemented
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Health checks configured

---

## 🔒 Security

### 🛡️ Security Features

- **Authentication**: JWT-based with secure token management
- **Authorization**: Role-based access control with scope validation
- **Encryption**: Private keys encrypted at rest with AES-256
- **Rate Limiting**: API throttling to prevent abuse
- **Input Validation**: Comprehensive request validation with class-validator
- **Audit Logging**: Complete system activity tracking
- **CORS**: Cross-origin resource sharing protection
- **Helmet**: Security headers for HTTP responses

### 🔐 Wallet Security

- Private keys are encrypted using AES-256 encryption
- Secure key generation and import functionality
- Transaction signing happens server-side in secure environment
- Wallet activity comprehensively logged for audit

### 📝 Audit & Compliance

- All API calls logged with user context
- Blockchain transactions tracked with complete audit trail
- MQTT messages logged for device communication audit
- Admin access to sensitive data logged and monitored

---

## 🤝 Contributing

### 📋 Development Guidelines

1. **Code Style**: Follow ESLint and Prettier configurations
2. **Testing**: Write unit tests for all new features
3. **Documentation**: Update API documentation for new endpoints
4. **Security**: Security review required for authentication changes
5. **Performance**: Load test new features with realistic data

### 🔄 Development Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test
npm run test
npm run lint
npm run build

# Submit pull request with:
# - Feature description
# - Test coverage report
# - Performance impact analysis
# - Security considerations
```

### 🐛 Bug Reports

Please use the issue template and include:
- Environment details (OS, Node.js version, etc.)
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs and error messages

---

## 📈 Monitoring & Analytics

### 📊 Metrics & Monitoring

The platform includes comprehensive monitoring capabilities:

- **API Performance**: Response times and throughput metrics
- **Device Health**: Real-time IoT device status monitoring
- **Blockchain Integration**: Transaction success rates and gas usage
- **Energy Trading**: Market activity and settlement performance
- **System Resources**: CPU, memory, and database performance

### 🚨 Alerting

Automated alerts for:
- Device disconnections or failures
- Failed blockchain transactions
- Settlement processing errors
- API performance degradation
- Security anomalies

### 📋 Logs & Audit

- **Application Logs**: Structured logging with correlation IDs
- **Audit Logs**: Complete user activity tracking
- **MQTT Logs**: Device communication audit trail
- **Blockchain Logs**: Transaction and contract interaction logs

---

## 🆘 Support & Troubleshooting

### 🔧 Common Issues

**Database Connection Issues:**
```bash
# Check PostgreSQL connection
npm run db:test-connection

# Reset database
npm run db:reset
```

**MQTT Connection Problems:**
```bash
# Test MQTT connectivity
npm run mqtt:test

# Check broker configuration
mosquitto_pub -h localhost -t test -m "test message"
```

**Blockchain Integration Issues:**
```bash
# Check blockchain connectivity
npm run blockchain:test

# Verify contract deployment
npm run contracts:verify
```

### 📞 Getting Help

- **Documentation**: Check the `/archive/docs/` folder for detailed guides
- **API Reference**: Visit `http://localhost:3000/api` for Swagger docs
- **GraphQL**: Use `http://localhost:3000/graphql` for GraphQL playground
- **Issues**: Create GitHub issues with detailed information

### 🔍 Debug Mode

Enable debug logging:
```bash
DEBUG=enerlink:* npm run start:dev
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **NestJS Framework**: For providing excellent TypeScript framework
- **Ethereum Community**: For blockchain integration tools
- **MQTT Community**: For IoT communication standards
- **PostgreSQL**: For reliable database solution

---

<p align="center">
  <strong>Built with ❤️ for sustainable energy trading</strong>
</p>

<p align="center">
  <a href="https://nestjs.com/">NestJS</a> •
  <a href="https://ethereum.org/">Ethereum</a> •
  <a href="https://mqtt.org/">MQTT</a> •
  <a href="https://www.postgresql.org/">PostgreSQL</a>
</p>
