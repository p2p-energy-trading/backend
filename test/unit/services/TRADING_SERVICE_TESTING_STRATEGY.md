# Trading Module Testing Strategy

## Challenge: Blockchain Integration Makes Traditional Unit Testing Impractical

### Problem Analysis

The `TradingMarketService` and other blockchain-related services in this project have a fundamental architectural characteristic that makes traditional unit testing with mocks extremely difficult:

**Contract instances are created within method bodies:**

```typescript
async getMarketPrice(): Promise<number> {
  const contract = new ethers.Contract(
    this.config.contracts.market,
    this.marketABI,
    this.provider,
  );
  const marketPrice = await contract.getMarketPrice();
  // ...
}
```

### Why Traditional Mocking Doesn't Work

1. **`jest.spyOn(ethers, 'Contract')` doesn't intercept constructor calls** in ethers.js v6
2. **`jest.mock('ethers')` at module level** fails because:

   - ethers.Contract is a class with complex internal state
   - The real Contract implementation attempts blockchain calls even when mocked
   - Provider needs full JSON-RPC implementation to satisfy ethers' internals

3. **Real Contract instances are created**, leading to:
   - Attempts to encode/decode ABI data
   - JSON-RPC calls to provider
   - Errors: "invalid BytesLike value", "contract runner does not support sending transactions"

### Attempted Solutions (All Failed)

- ❌ Module-level `jest.mock('ethers')` with mockImplementation
- ❌ `jest.spyOn(ethers, 'Contract')` with mockReturnValue
- ❌ Mocking Contract.prototype methods
- ❌ Full provider mock with send/call methods

## Recommended Testing Approach

### 1. ✅ Integration Tests (Primary Strategy)

**Use Hardhat Network for blockchain integration tests:**

```typescript
// test/integration/trading-market.integration.spec.ts
describe('TradingMarketService Integration Tests', () => {
  let hardhatProvider: ethers.JsonRpcProvider;
  let deployedMarketContract: string;

  beforeAll(async () => {
    // Start Hardhat network
    // Deploy contracts
    // Initialize service with real provider
  });

  it('should place buy order on blockchain', async () => {
    const txHash = await service.placeBuyOrder(walletAddress, 10, 1500);
    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    // Verify on blockchain
    const order = await contract.buyOrders(txHash);
    expect(order.amount).toBe(BigInt(1000)); // 10 ETK * 100
  });
});
```

**Advantages:**

- Tests actual blockchain interaction
- Validates smart contract integration
- Catches ABI encoding/decoding issues
- Tests real transaction flow
- More confidence in production behavior

### 2. ✅ Unit Tests for Business Logic Only

**Focus on testable methods without blockchain calls:**

```typescript
// test/unit/services/trading-market.service.spec.ts
describe('TradingMarketService Unit Tests', () => {
  // Test methods that:
  // - Don't create Contract instances
  // - Only manipulate data
  // - Call other services (which can be mocked)

  it('should validate order parameters', () => {
    // Test input validation logic
  });

  it('should format transaction logs correctly', () => {
    // Test data transformation
  });
});
```

### 3. ✅ Manual Testing via Postman/API Clients

As mentioned by the user: "akan saya lakukan nanti saja di postman"

**API-level testing covers:**

- Full request/response cycle
- Authentication/authorization
- End-to-end workflow
- Real blockchain interaction
- Database persistence

## Decision for This Project

**SKIP detailed unit tests for blockchain-heavy services:**

Services to handle via integration/manual testing:

- `TradingMarketService` ❌ (blockchain-heavy)
- `BlockchainService` ❌ (blockchain-heavy)
- `WalletService` ⚠️ (crypto operations - partial unit testing)

Services suitable for unit testing:

- `RedisOrdersService` ✅ (Redis caching - mockable)
- `PriceCacheService` ✅ (Redis + data transformation)
- `TradingAnalyticsService` ✅ (database queries - mockable repositories)
- `EnergySettlementService` ⚠️ (mixed: DB queries ✅, blockchain calls ❌)
- `TelemetryAggregationService` ✅ (database + Redis)
- Controllers ✅ (mock all service dependencies)

## Alternative: Refactor for Testability (Future Enhancement)

To make blockchain services unit-testable, consider dependency injection:

```typescript
@Injectable()
export class TradingMarketService {
  constructor(
    private readonly contractFactory: ContractFactory, // Injectable
  ) {}

  async getMarketPrice(): Promise<number> {
    const contract = this.contractFactory.createMarketContract();
    // Now contractFactory can be mocked in tests
  }
}
```

**Pros:**

- Makes unit testing possible
- Follows SOLID principles
- Better separation of concerns

**Cons:**

- Requires significant refactoring
- Changes production code for testing
- May not be worth the effort if integration tests suffice

## Summary

**For this project, we accept that blockchain-integrated services are best tested through:**

1. Integration tests with Hardhat network
2. Manual API testing with Postman
3. Unit tests only for pure business logic (data transformation, validation)

**This is a pragmatic decision that:**

- Saves development time
- Focuses testing efforts where they provide most value
- Aligns with user's manual testing preference
- Acknowledges the architectural constraints

**Moving forward:** Focus unit testing efforts on services with clear mockable dependencies (Redis, TypeORM repositories, MQTT clients) and reserve blockchain services for integration testing.
