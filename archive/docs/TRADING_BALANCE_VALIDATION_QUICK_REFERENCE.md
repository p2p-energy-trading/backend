# Trading Balance Validation Quick Reference

## Enhanced Trading Endpoint
`POST /trading/order` - Now includes balance validation

## Key Improvements
✅ **Pre-validates wallet balance** before blockchain transaction
✅ **Prevents "Not enough balance" blockchain errors**
✅ **Clear error messages** with required vs available amounts
✅ **Faster error detection** without gas fees

## Validation Logic

### BID Orders (Buy ETK)
- **Checks**: IDRS balance ≥ (quantity × price)
- **Example**: Buy 10 ETK @ 500 IDRS = Need 5000 IDRS
- **Error**: `"Insufficient IDRS balance. Required: 5000.00 IDRS, Available: 1500.00 IDRS"`

### ASK Orders (Sell ETK)
- **Checks**: ETK balance ≥ quantity
- **Example**: Sell 10 ETK = Need 10 ETK
- **Error**: `"Insufficient ETK balance. Required: 10.00 ETK, Available: 5.50 ETK"`

## New Endpoint
```http
GET /trading/wallet/:walletAddress/balances
```
Returns:
```json
{
  "success": true,
  "data": {
    "ETK": 25.50,
    "IDRS": 1500.00
  }
}
```

## Error Response Format
```json
{
  "statusCode": 400,
  "message": "Insufficient [TOKEN] balance. Required: [X], Available: [Y]",
  "error": "Bad Request"
}
```

## Benefits
- **No blockchain failures** due to insufficient balance
- **Better user experience** with clear error messages
- **Cost savings** - no gas fees for failed transactions
- **Faster feedback** - immediate validation

## Testing
Use `/test-trading-balance-validation.http` for comprehensive testing scenarios.

## Implementation Files
- `TradingController.placeOrder()` - Enhanced with balance validation
- `TradingController.checkSufficientBalance()` - New validation method
- `TradingController.getWalletBalances()` - Helper method
