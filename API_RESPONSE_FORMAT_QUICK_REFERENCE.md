# API Response Format - Quick Reference

## ✅ Correct Response Format (Current Standard)

All API endpoints MUST return responses in this format:

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Your actual data here
  },
  "metadata": {
    "timestamp": "2025-11-01T10:30:00.000Z"
    // Optional: count, page, limit, etc.
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message or object"
}
```

## ❌ Incorrect Response Format (Old - DO NOT USE)

```json
{
  "accessToken": "...",
  "user": { ... }
}
```

## Implementation Pattern

### Controller Method

```typescript
@Get('endpoint')
async getEndpoint() {
  try {
    const data = await this.service.getData();
    return ResponseFormatter.success(data, 'Success message');
  } catch (error) {
    this.logger.error('Error context:', error);
    return ResponseFormatter.error('Error message', error.message);
  }
}
```

### Response DTO

```typescript
export class EndpointResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Success message' })
  message: string;

  @ApiProperty({ type: YourDataDto })
  data: YourDataDto;

  @ApiProperty({ example: { timestamp: '2025-11-01T10:30:00.000Z' } })
  metadata: { timestamp: string };
}
```

### Decorator

```typescript
@ApiResponse({
  status: 200,
  description: 'Success',
  type: EndpointResponseDto, // ← Must be ResponseFormatter wrapper
})
```

## Status: Auth Module ✅ Complete

All other controllers need verification and updates.
