# Trading Enhancement Quick Reference Guide

## API Endpoints Overview

### Enhanced Trading Orders
```bash
GET /trading/orders?scope={own|public|all}&status={OPEN|FILLED|CANCELLED}&limit={1-1000}
```

### Enhanced Trading Trades
```bash
GET /trading/trades?scope={own|public|all}&limit={1-1000}
```

## Quick Parameter Reference

### Scope Parameters
| Value | Description | Data Access | Use Case |
|-------|-------------|-------------|----------|
| `own` | Personal data only | Full data for user's transactions | Personal dashboard |
| `public` | All data (anonymized) | Masked sensitive fields | Market transparency |
| `all` | All data (complete) | Full data access + audit log | Admin/debug |

### Limit Parameters
| Range | Recommended Use | Response Time | Data Size |
|-------|-----------------|---------------|-----------|
| 1-25 | Quick views | ~50ms | ~2-5KB |
| 26-100 | Standard views | ~100-200ms | ~5-15KB |
| 101-500 | Analytics | ~500-1000ms | ~50-80KB |
| 501-1000 | Bulk analysis | ~1-2s | ~100-200KB |

## Quick Implementation Examples

### Frontend Scope Selector
```typescript
const scopeOptions = [
  { value: 'own', label: 'My Trading', limit: 50 },
  { value: 'public', label: 'Market View', limit: 100 },
  { value: 'all', label: 'Admin View', limit: 200 }
];
```

### API Call Patterns
```typescript
// Personal quick view
fetch('/trading/orders?scope=own&limit=10')

// Market analysis
fetch('/trading/orders?scope=public&status=OPEN&limit=200')

// Admin monitoring
fetch('/trading/trades?scope=all&limit=500')
```

## Data Anonymization Quick Reference

### Anonymized Fields (Public Scope)
- `walletAddress`: `0x742d35Cc...` (first 10 chars)
- `prosumerId`: `prosumer_...` (first 8 chars)
- `blockchainTxHash`: `0x9f2a8b3c4d5e...` (first 12 chars)

### Preserved Fields (All Scopes)
- `orderId`, `tradeId`
- `amountEtk`, `tradedEtkAmount`
- `priceIdrsPerEtk`
- `orderType`, `statusOnChain`
- `tradeTimestamp`, `createdAt`

## Response Format Quick Reference

```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "scope": "public",
    "limit": 50,
    "count": 25,
    "prosumerId": "multiple"
  },
  "message": "Orders retrieved successfully (public scope, 25 records)"
}
```

## Security & Audit Quick Reference

### Input Validation
- Scope: Must be `own`, `public`, or `all`
- Limit: Must be number between 1-1000
- Default scope: `own`
- Default limit: `50`

### Audit Logging
- `scope=all` access logged with user ID and timestamp
- Includes endpoint, limit, and filters in log
- Security monitoring for admin access

## Performance Quick Tips

### Optimization
- Use appropriate limits for use case
- Cache public scope data when possible
- Consider pagination for large datasets
- Monitor response times for high limits

### Best Practices
- Start with small limits for user testing
- Increase limits based on actual needs
- Use public scope for market transparency
- Reserve `all` scope for admin operations

## Testing Quick Commands

```bash
# Test personal orders
curl "/trading/orders?scope=own&limit=5"

# Test public market view
curl "/trading/orders?scope=public&status=OPEN&limit=20"

# Test admin access (with auth)
curl -H "Authorization: Bearer $TOKEN" "/trading/trades?scope=all&limit=100"

# Test limit validation
curl "/trading/orders?limit=2000"  # Should return 400 error
```

## Common Use Cases

### 1. Personal Trading Dashboard
```typescript
// Show user's recent orders
scope: 'own', limit: 20

// Show user's trade history
scope: 'own', limit: 50
```

### 2. Market Transparency Page
```typescript
// Current order book
scope: 'public', status: 'OPEN', limit: 100

// Recent market trades
scope: 'public', limit: 50
```

### 3. Admin Market Analysis
```typescript
// Complete market overview
scope: 'all', limit: 500

// Detailed trade analysis
scope: 'all', limit: 1000
```

### 4. Mobile App Quick View
```typescript
// Fast loading for mobile
scope: 'own', limit: 10

// Market preview
scope: 'public', limit: 25
```

## Integration Checklist

### Frontend Integration
- [ ] Implement scope selector component
- [ ] Add limit parameter to API calls
- [ ] Handle anonymized data in public scope
- [ ] Implement pagination controls
- [ ] Add loading states for high limits

### Backend Validation
- [ ] Scope parameter validation working
- [ ] Limit parameter validation working
- [ ] Data anonymization implemented
- [ ] Audit logging for admin access
- [ ] Error handling for invalid parameters

### Testing Coverage
- [ ] All scope values tested
- [ ] Limit boundary testing complete
- [ ] Anonymization validation done
- [ ] Performance testing with large limits
- [ ] Security testing for admin access

## Troubleshooting Quick Guide

### Common Issues
1. **400 Error**: Invalid scope or limit parameter
2. **Slow Response**: Limit too high, reduce limit value
3. **Missing Data**: Wrong scope selected
4. **Anonymized Data**: Using public scope, switch to own/all

### Quick Fixes
- Check scope parameter spelling
- Ensure limit is numeric and ≤1000
- Verify authentication for 'all' scope
- Use smaller limits for better performance

This quick reference covers all essential aspects of the enhanced trading endpoints for rapid development and integration.
