---
applyTo: '**'
---

# EnerLink P2P Energy Trading System - Domain Knowledge & References

## System Overview

EnerLink is a peer-to-peer energy trading platform that enables prosumers (PLTS Atap owners) to trade surplus energy using three core technologies:

- **IoT**: Smart meters with comprehensive monitoring and control capabilities
- **Private Ethereum Blockchain**: Secure, automated transactions with tokenization
- **Modern Web Application**: NestJS backend + ReactJS frontend

## Core Concepts

### Token System

- **ETK (Energy Token)**: Represents energy units (1 kWh = 1 ETK by default)
- **IDRS (Indonesian Rupiah Stablecoin)**: Stable token for payments (1 IDR = 1 IDRS)
- **Tokenization**: Physical energy converted to digital tokens for trading

### User Types

- **Prosumer**: Producer + Consumer - owns PLTS and can both produce and consume energy
- **Smart Meter**: IoT device that measures, monitors, and controls energy flow

## Business Processes

### 1. Onboarding & Asset Management

- Prosumer registration with wallet creation/import
- Smart meter association and configuration
- Device capability discovery (battery, solar, motor, PWM)
- Remote configuration via MQTT commands

### 2. IoT Monitoring & Control (Two-way Communication)

#### A. Data Collection (Smart Meter → Platform)

**MQTT Topics:**

- `home/energy-monitor/sensors`: Comprehensive energy data
- `home/energy-monitor/heartbeat`: Device health monitoring
- `home/energy-monitor/status`: Operational status snapshots

**Sensor Data Structure:**

```json
{
  "timestamp": 33857692,
  "load": {
    "power": 994.8,
    "current": 240.75,
    "voltage": 4.1212,
    "daily_energy_wh": 10.1163,
    "total_energy_wh": 10.1163,
    "settlement_energy_wh": 10.1163
  },
  "solar": {
    "power": 1275.8,
    "current": 144.47,
    "voltage": 8.813601,
    "generating": true,
    "daily_energy_wh": 15.23495,
    "total_energy_wh": 15.23495,
    "settlement_energy_wh": 15.23495
  },
  "export": {
    "power": 38.6,
    "active": true,
    "current": 9.51,
    "voltage": 4.126,
    "daily_energy_wh": 1.959955,
    "total_energy_wh": 1.959955,
    "settlement_energy_wh": 1.959955
  },
  "import": {
    "power": 0.8,
    "active": false,
    "current": 0.13,
    "voltage": 5.550399,
    "daily_energy_wh": 0.004,
    "total_energy_wh": 0.004,
    "settlement_energy_wh": 0.004
  },
  "battery": {
    "power": 152.2,
    "state": "charging",
    "current": -36.49,
    "voltage": 4.176,
    "daily_energy_wh": 1.793849,
    "total_energy_wh": 1.793849,
    "settlement_energy_wh": 1.793849
  }
}
```

**Sensor Data Field Descriptions:**

- **timestamp**: Unix timestamp in milliseconds
- **power**: Instantaneous power in Watts
- **current**: Current measurement in Amperes
- **voltage**: DC voltage measurement in Volts (low values due to DC simulation environment)
- **daily_energy_wh**: Energy accumulated for current day in Watt-hours
- **total_energy_wh**: Cumulative energy since device installation in Watt-hours
- **settlement_energy_wh**: Energy accumulated since last settlement in Watt-hours
- **active**: Boolean flag indicating if import/export is currently active
- **generating**: Boolean flag indicating if solar panel is currently generating
- **state**: Battery state ("charging", "discharging", "idle")

**Note on Voltage Levels:**
The voltage measurements appear low (4-8V range) because the system uses a DC simulation environment for testing and development purposes, rather than standard AC grid voltages (220V/240V).

**Status Data Structure:**

```json
{
  "timestamp": 33860400,
  "pwm": {
    "max_pwm": 255,
    "led_duty": 63
  },
  "grid": {
    "mode": "export",
    "exporting": true,
    "importing": false
  },
  "mqtt": {
    "attempts": 0,
    "connected": true
  },
  "wifi": {
    "ip": "192.168.1.2",
    "rssi": -60,
    "connected": true
  },
  "motor": {
    "duty": 0,
    "max_pwm": 1023,
    "percent": 0,
    "direction": "forward"
  },
  "motor1": {
    "duty": 0,
    "percent": 0,
    "direction": "forward"
  },
  "motor2": {
    "duty": 0,
    "percent": 0,
    "direction": "forward"
  },
  "system": {
    "free_heap": 225968
  }
}
```

**Status Data Field Descriptions:**

- **timestamp**: Unix timestamp in milliseconds
- **pwm**: PWM control for LED indicators
  - `max_pwm`: Maximum PWM value (typically 255 for 8-bit)
  - `led_duty`: Current LED duty cycle value
- **grid**: Grid connection and operational mode
  - `mode`: Current grid mode ("import", "export", "off")
  - `exporting`: Boolean indicating active export to grid
  - `importing`: Boolean indicating active import from grid
- **mqtt**: MQTT connection status
  - `attempts`: Number of connection attempts
  - `connected`: Boolean indicating MQTT broker connection status
- **wifi**: WiFi network connectivity
  - `ip`: Assigned IP address
  - `rssi`: Signal strength in dBm (negative values, closer to 0 = stronger)
  - `connected`: Boolean indicating WiFi connection status
- **motor/motor1/motor2**: Motor control status (multiple motor support)
  - `duty`: Current duty cycle value
  - `max_pwm`: Maximum PWM value for motor control
  - `percent`: Motor speed as percentage (0-100%)
  - `direction`: Motor rotation direction ("forward", "reverse")
- **system**: Device system metrics
  - `free_heap`: Available heap memory in bytes

**Heartbeat Data Structure:**

```json
{
  "qos": 2,
  "status": "alive",
  "uptime": 33215145,
  "free_heap": 226024,
  "timestamp": 33215145
}
```

**Heartbeat Data Field Descriptions:**

- **qos**: MQTT Quality of Service level (0, 1, or 2)
- **status**: Device operational status ("alive", "warning", "error")
- **uptime**: Device uptime in milliseconds since last boot
- **free_heap**: Available heap memory in bytes
- **timestamp**: Unix timestamp in milliseconds when heartbeat was generated

**Note on Heartbeat Frequency:**
Heartbeat messages are sent periodically (typically every 30-60 seconds) to indicate device health and connectivity status. This enables the platform to detect device disconnections and monitor system resources.

#### B. Device Control (Platform → Smart Meter)

**MQTT Topic:** `home/energy-monitor/command`

**Command Types:**

- Grid Control: `{"grid": "import|export|off"}`
- Energy Reset: `{"energy": {"reset": "all|battery|solar|load"}}`
- Settlement Reset: `{"energy": {"reset_settlement": "all"}}`
- Configuration: `{"mqtt": {"sensor_interval": 5000}}`
- Component Control: `{"relay": ..., "motor": ..., "pwm": ...}`

### 3. Energy Settlement Process

- **Trigger**: Periodic (default: 5 minutes) or manual
- **Calculation**: Net kWh = Export - Import (using settlement_energy_wh)
- **Blockchain Integration**: Calls EnergyConverter.sol for ETK mint/burn
- **Settlement Reset**: Automatic reset of settlement counters after successful blockchain confirmation

### 4. P2P Trading Market

- **Order Types**: BID (buy) and ASK (sell)
- **Trading Pair**: ETK/IDRS
- **Process**: Token approval → Order placement → Automatic matching → Settlement
- **Smart Contracts**: Market.sol handles escrow and order matching

### 5. IDRS Conversion (Simulation)

- **On-Ramp**: IDR → IDRS tokens
- **Off-Ramp**: IDRS → IDR
- **Purpose**: Testing and development simulation

## Technical Architecture

### Database Schema Key Tables

#### Core Entities

- `PROSUMERS`: User accounts and authentication
- `WALLETS`: Ethereum wallet management with encryption
- `SMART_METERS`: IoT device registry with capabilities

#### Energy & IoT Data

- `ENERGY_READINGS`: Historical energy measurements
- `ENERGY_READINGS_DETAILED`: Granular per-subsystem data
- `ENERGY_SETTLEMENTS`: Settlement records with blockchain hashes
- `DEVICE_HEARTBEATS`: Device health monitoring
- `DEVICE_STATUS_SNAPSHOTS`: Operational status history

#### MQTT & Commands

- `MQTT_MESSAGE_LOGS`: Comprehensive MQTT message logging
- `DEVICE_COMMANDS`: Outbound command tracking with correlation
- Command correlation IDs for request-response tracking

#### Trading & Blockchain

- `TRADE_ORDERS_CACHE`: Order book cache from blockchain events
- `MARKET_TRADES`: Executed trade records
- `BLOCKCHAIN_APPROVALS`: Token approval tracking
- `TRANSACTION_LOGS`: Comprehensive transaction history

### Smart Contracts

- **EnergyConverter.sol**: Converts energy measurements to ETK tokens
- **Market.sol**: Handles order placement, matching, and settlement
- **ETK_Token.sol**: Energy token contract (ERC-20)
- **IDRS_Token.sol**: Stablecoin contract (ERC-20)

### IoT Device Capabilities

- **Energy Management Hub**: Not just measurement, but active control
- **Subsystems**: Grid, Battery, Solar, Load monitoring
- **Control Features**: Grid mode switching, relay control, PWM, motor control
- **Communication**: Bidirectional MQTT with command acknowledgment

## Data Flow Patterns

### Real-time Data Flow

1. Smart meter sends sensor data every 5-30 seconds
2. Backend processes and stores in time-series tables
3. Frontend displays real-time dashboard updates
4. Historical data aggregation for analytics

### Settlement Flow

1. Smart meter calculates net energy using settlement counters
2. Sends settlement data via MQTT
3. Backend validates and records settlement
4. Blockchain transaction initiated (EnergyConverter)
5. Settlement reset command sent to device
6. Transaction confirmation updates status

### Command Flow

1. User initiates command via frontend
2. Backend generates correlation ID and command
3. MQTT command sent to device
4. Device processes and optionally responds
5. Response tracked via correlation ID
6. Command status updated (acknowledged/timeout)

## Enum Definitions

### Flow Direction

- `IMPORT`: Energy imported from grid
- `EXPORT`: Energy exported to grid
- `CONSUMPTION`: Energy consumed by load
- `GENERATION`: Energy generated by solar

### Transaction Status

- `PENDING`: Waiting for blockchain confirmation
- `SUCCESS`: Confirmed on blockchain
- `FAILED`: Transaction failed

### Order Status

- `OPEN`: Available for matching
- `PARTIALLY_FILLED`: Partially executed
- `FILLED`: Completely executed
- `CANCELLED`: Cancelled by user

### Device Subsystems

- `GRID`: Grid import/export interface
- `BATTERY`: Energy storage system
- `SOLAR`: Photovoltaic generation
- `LOAD`: Energy consumption
- `SYSTEM`: Device system metrics

## Security Considerations

### Wallet Security

- Private keys encrypted at rest
- Secure key generation and import
- Wallet activity tracking

### MQTT Security

- Topic-based access control
- Message correlation for command verification
- Timeout handling for unacknowledged commands

### Blockchain Security

- Token approvals before trading
- Escrow mechanism in Market contract
- Settlement validation before token conversion

## Performance Optimization

### Database Indexing

- Time-series data optimized for recent queries
- Composite indexes for meter_id + timestamp
- Status and type-based filtering indexes

### Caching Strategy

- Order book cache synchronized with blockchain events
- Real-time data caching for dashboard performance
- Historical data aggregation for analytics

## Development Guidelines

### Error Handling

- Comprehensive logging for MQTT messages
- Command timeout and retry mechanisms
- Blockchain transaction failure recovery

### Testing Strategies

- MQTT message simulation
- Blockchain interaction testing
- IoT device emulation for development

### Monitoring & Observability

- Device heartbeat monitoring
- Transaction status tracking
- Performance metrics collection

## Configuration Management

### System Configuration

- Contract addresses management
- MQTT broker configuration
- Settlement interval settings
- Conversion ratios (ETK:kWh)

### Device Configuration

- Remote sensor interval adjustment
- Heartbeat frequency configuration
- Settlement trigger customization
- Component-specific settings

This domain knowledge serves as the foundation for understanding the EnerLink system architecture, business processes, and technical implementation details.
