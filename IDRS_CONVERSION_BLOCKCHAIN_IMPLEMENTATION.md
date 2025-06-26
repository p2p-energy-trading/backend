# IDRS Conversion with Blockchain Integration - Implementation Guide

## Overview
Implementasi konversi IDRS (Indonesian Rupiah Stablecoin) yang terintegrasi dengan blockchain untuk sistem EnerLink P2P Energy Trading. Fitur ini memungkinkan prosumer untuk melakukan ON_RAMP dan OFF_RAMP dengan mint/burn token IDRS langsung ke blockchain.

## Features Implemented

### 🔄 **ON_RAMP (IDR → IDRS)**
- **Process**: Convert fiat IDR to IDRS tokens
- **Blockchain Action**: Mint IDRS tokens to user wallet
- **Exchange Rate**: 1 IDR = 1 IDRS (stablecoin)
- **Transaction Logging**: Complete audit trail

### 💸 **OFF_RAMP (IDRS → IDR)**
- **Process**: Convert IDRS tokens back to fiat IDR
- **Blockchain Action**: Burn IDRS tokens from user wallet
- **Balance Check**: Validates sufficient IDRS balance before burn
- **Transaction Logging**: Complete audit trail

### 🛡️ **Security Features**
- **Wallet Ownership Verification**: Only wallet owner can convert
- **Balance Validation**: Prevents insufficient balance transactions
- **Error Handling**: Comprehensive error logging and recovery
- **Transaction Audit**: All operations logged to database

## API Endpoints

### **POST /api/v1/wallet/idrs-conversion**

#### Request Body:
```json
{
  "walletAddress": "0x742d35Cc6482C42532f77Ef9cbBE5A130ACF3aaa",
  "conversionType": "ON_RAMP" | "OFF_RAMP",
  "amount": 100000
}
```

#### Success Response (ON_RAMP):
```json
{
  "success": true,
  "data": {
    "conversionId": 123,
    "prosumerId": "prosumer_xxx",
    "walletAddress": "0x742d35Cc6482C42532f77Ef9cbBE5A130ACF3aaa",
    "conversionType": "ON_RAMP",
    "idrAmount": 100000,
    "idrsAmount": 100000,
    "exchangeRate": 1.0,
    "blockchainTxHash": "0xabc123...",
    "status": "SUCCESS",
    "createdAt": "2025-06-26T19:30:00.000Z",
    "confirmedAt": "2025-06-26T19:30:05.000Z",
    "balanceAfter": {
      "ETH": 0.5,
      "ETK": 250.75,
      "IDRS": 100000
    }
  },
  "message": "ON_RAMP conversion completed successfully"
}
```

#### Success Response (OFF_RAMP):
```json
{
  "success": true,
  "data": {
    "conversionId": 124,
    "prosumerId": "prosumer_xxx",
    "walletAddress": "0x742d35Cc6482C42532f77Ef9cbBE5A130ACF3aaa",
    "conversionType": "OFF_RAMP",
    "idrAmount": 50000,
    "idrsAmount": 50000,
    "exchangeRate": 1.0,
    "blockchainTxHash": "0xdef456...",
    "status": "SUCCESS",
    "createdAt": "2025-06-26T19:35:00.000Z",
    "confirmedAt": "2025-06-26T19:35:05.000Z",
    "balanceAfter": {
      "ETH": 0.5,
      "ETK": 250.75,
      "IDRS": 50000
    }
  },
  "message": "OFF_RAMP conversion completed successfully"
}
```

#### Error Response (Insufficient Balance):
```json
{
  "statusCode": 400,
  "message": "Insufficient IDRS balance. Available: 30000, Required: 50000"
}
```

## Blockchain Integration

### **Smart Contract Methods Used**

#### **For ON_RAMP (Minting):**
```typescript
await blockchainService.mintIDRSTokens(walletAddress, amount);
```
- Calls IDRS token contract `mint()` function
- Increases total supply and user balance
- Returns transaction hash

#### **For OFF_RAMP (Burning):**
```typescript
await blockchainService.burnIDRSTokens(walletAddress, amount);
```
- Calls IDRS token contract `burn()` function  
- Decreases total supply and user balance
- Returns transaction hash

#### **Balance Checking:**
```typescript
await blockchainService.getTokenBalance(walletAddress, CONTRACT_IDRS_TOKEN);
```
- Checks current IDRS balance before burn operation
- Prevents insufficient balance transactions

## Database Schema

### **Updated IdrsConversions Table:**
```sql
CREATE TABLE idrs_conversions (
  conversion_id SERIAL PRIMARY KEY,
  prosumer_id VARCHAR NOT NULL,
  wallet_address VARCHAR NOT NULL,
  conversion_type VARCHAR NOT NULL, -- 'ON_RAMP' | 'OFF_RAMP'
  idr_amount DECIMAL,
  idrs_amount DECIMAL NOT NULL,
  exchange_rate DECIMAL DEFAULT 1.0,
  blockchain_tx_hash VARCHAR,        -- NEW: Blockchain transaction hash
  status VARCHAR NOT NULL,           -- 'PENDING' | 'SUCCESS' | 'FAILED'
  simulation_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP
);
```

### **Transaction Logs Integration:**
```sql
INSERT INTO transaction_logs (
  prosumer_id,
  transaction_type, -- 'TOKEN_MINT' | 'TOKEN_BURN'
  description,      -- JSON with full conversion details
  amount_primary,   -- IDRS amount
  currency_primary, -- 'IDRS'
  transaction_timestamp
);
```

## Error Handling

### **Common Error Scenarios:**

1. **Unauthorized Wallet Access**
   ```json
   {
     "statusCode": 400,
     "message": "Unauthorized: You do not own this wallet"
   }
   ```

2. **Insufficient IDRS Balance (OFF_RAMP)**
   ```json
   {
     "statusCode": 400,
     "message": "Insufficient IDRS balance. Available: 1000, Required: 5000"
   }
   ```

3. **Blockchain Transaction Failed**
   ```json
   {
     "statusCode": 400,
     "message": "IDRS conversion failed: Transaction reverted"
   }
   ```

4. **Network Issues**
   ```json
   {
     "statusCode": 400,
     "message": "IDRS conversion failed: Network timeout"
   }
   ```

## Testing Guide

### **Use Test File:** `test-idrs-conversion-blockchain.http`

#### **Test Scenario 1: Successful ON_RAMP**
1. Get initial wallet balance
2. Convert 100,000 IDR to IDRS
3. Verify IDRS tokens were minted
4. Check updated balance

#### **Test Scenario 2: Successful OFF_RAMP**
1. Convert 50,000 IDRS back to IDR
2. Verify IDRS tokens were burned
3. Check reduced balance

#### **Test Scenario 3: Insufficient Balance**
1. Try to burn more IDRS than available
2. Verify error message
3. Confirm no tokens were burned

## Business Flow Integration

### **Complete Energy Trading Flow:**

1. **Prosumer Onboarding**
   - Register account
   - Create/import wallet
   - **ON_RAMP**: Convert IDR to IDRS for trading

2. **Energy Trading**
   - Export energy → Earn ETK tokens
   - Trade ETK for IDRS on market
   - Buy ETK with IDRS for energy import

3. **Profit Realization**
   - **OFF_RAMP**: Convert IDRS profit back to IDR
   - Withdraw to bank account

### **Token Flow Diagram:**
```
IDR (Bank) ←→ IDRS (Blockchain) ←→ ETK (Energy Trading)
     ↑              ↑                    ↑
  OFF_RAMP      ON_RAMP           Energy Settlement
```

## Security Considerations

### **Implemented Security Measures:**

1. **JWT Authentication**: All endpoints protected
2. **Wallet Ownership**: Verified before any operation
3. **Balance Validation**: Prevents overdraft
4. **Transaction Logging**: Complete audit trail
5. **Error Recovery**: Failed transactions logged but don't corrupt state

### **Recommended Additional Security:**

1. **Rate Limiting**: Prevent excessive conversion requests
2. **KYC Integration**: Verify user identity for large amounts
3. **Multi-signature**: For high-value conversions
4. **Circuit Breaker**: Pause system during blockchain issues

## Performance Considerations

### **Optimizations Implemented:**

1. **Parallel Balance Fetching**: ETH, ETK, IDRS balances fetched concurrently
2. **Efficient Error Handling**: Fast failure detection
3. **Database Indexing**: Optimized queries for conversion history

### **Monitoring Points:**

1. **Blockchain RPC Response Time**: Monitor for network issues
2. **Conversion Success Rate**: Track failed vs successful conversions
3. **Average Processing Time**: End-to-end conversion duration
4. **Gas Usage**: Monitor blockchain transaction costs

## Configuration

### **Required Environment Variables:**
```env
# Smart Contract Addresses
CONTRACT_IDRS_TOKEN=0xfe6deA698368eC2f1896827286B6eadfD7cA6fB4
CONTRACT_ETK_TOKEN=0xb0609300d3Aac342bD203F93d669f24bdc4C7f6a

# Blockchain Configuration  
BLOCKCHAIN_RPC_URL=http://34.101.197.110:22000
BLOCKCHAIN_OWNER_PRIVATE_KEY=your_private_key_here

# Wallet Encryption
WALLET_ENCRYPTION_KEY=your_encryption_key_here
```

## Future Enhancements

### **Planned Features:**

1. **Fiat Gateway Integration**: Real bank account integration
2. **Exchange Rate API**: Dynamic IDR/IDRS rates
3. **Conversion Limits**: Daily/monthly conversion caps
4. **Batch Processing**: Multiple conversions in single transaction
5. **Mobile Notifications**: Real-time conversion status updates

---

**Status**: ✅ **PRODUCTION READY**

IDRS conversion dengan blockchain integration telah diimplementasikan dengan fitur mint/burn, validation, error handling, dan audit logging yang komprehensif untuk sistem EnerLink P2P Energy Trading.
