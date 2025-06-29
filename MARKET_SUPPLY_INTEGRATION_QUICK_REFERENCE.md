# Market Supply Integration - Quick Reference

## New API Endpoints

### ETK Supply in Market
```http
GET /trading/market/etk-supply
Authorization: Bearer {token}
```
**Response:**
```json
{ "etkSupply": 1250.75 }
```

### IDRS Supply in Market
```http
GET /trading/market/idrs-supply
Authorization: Bearer {token}
```
**Response:**
```json
{ "idrsSupply": 3400.25 }
```

### Market Liquidity
```http
GET /trading/market/liquidity
Authorization: Bearer {token}
```
**Response:**
```json
{
  "etkSupply": 1250.75,
  "idrsSupply": 3400.25,
  "buyOrderCount": 15,
  "sellOrderCount": 23
}
```

## Backend Service Methods

### BlockchainService
```typescript
// Get ETK supply in market contract
async getTotalETKSupplyInMarket(): Promise<number>

// Get IDRS supply in market contract  
async getTotalIDRSSupplyInMarket(): Promise<number>

// Get comprehensive market liquidity data
async getMarketLiquidity(): Promise<{
  etkSupply: number;
  idrsSupply: number;
  buyOrderCount: number;
  sellOrderCount: number;
}>
```

## Smart Contract Functions (Already Implemented)
```solidity
// Returns ETK tokens held by market contract
function getTotalETKSupplyInMarket() external view returns (uint256)

// Returns IDRS tokens held by market contract
function getTotalIDRSSupplyInMarket() external view returns (uint256)

// Returns ETK supply, IDRS supply, buy order count, sell order count
function getMarketLiquidity() external view returns (uint256, uint256, uint256, uint256)
```

## Test File
Use `test-market-supply-integration.http` for endpoint testing.

## Usage Examples

### Frontend Integration
```typescript
// Get market liquidity for dashboard
const liquidity = await fetch('/trading/market/liquidity', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

console.log(`Market has ${liquidity.etkSupply} ETK and ${liquidity.idrsSupply} IDRS`);
console.log(`${liquidity.buyOrderCount} buy orders, ${liquidity.sellOrderCount} sell orders`);
```

### Analytics Dashboard
```typescript
// Monitor market depth
const [etkSupply, idrsSupply] = await Promise.all([
  fetch('/trading/market/etk-supply').then(r => r.json()),
  fetch('/trading/market/idrs-supply').then(r => r.json())
]);

const marketDepth = {
  totalValue: etkSupply.etkSupply + idrsSupply.idrsSupply,
  ratio: etkSupply.etkSupply / idrsSupply.idrsSupply
};
```

## Status: ✅ Ready for Use
All endpoints are live and tested. Authentication required for all endpoints.
