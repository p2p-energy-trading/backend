# Prosumer → User Migration Guide

## 🎯 Overview

This document provides comprehensive instructions for migrating the EnerLink database from "prosumer" terminology to "user" terminology. This refactoring makes the system more general and universally applicable.

## 📋 What Changes?

### Database Schema Changes
- **Table**: `prosumer` → `user`
- **Primary Key**: `prosumer_id` → `user_id`
- **Foreign Keys**: All references updated in 7 tables
- **Indexes**: All indexes recreated with new names

### Affected Tables
1. `user` (renamed from `prosumer`)
2. `wallet` - FK: `prosumer_id` → `user_id`
3. `smart_meter` - FK: `prosumer_id` → `user_id`
4. `transaction_log` - FK: `prosumer_id` → `user_id`
5. `market_trade` - FK: `buyer_prosumer_id` → `buyer_user_id`, `seller_prosumer_id` → `seller_user_id`
6. `idrs_conversion` - FK: `prosumer_id` → `user_id`
7. `token_blacklist` - FK: `prosumer_id` → `user_id`

### Code Changes (Already Completed ✅)
- ✅ Entity models renamed
- ✅ Services updated (200+ references)
- ✅ Controllers updated
- ✅ DTOs renamed
- ✅ Auth system updated
- ✅ WebSocket gateway updated
- ✅ Redis keys updated
- ✅ Test fixtures updated
- ✅ Factories updated
- ✅ Seeders updated

## 🚀 Quick Start (Automated)

### Option 1: Use Helper Script (Recommended)

```bash
# Run the automated migration script
npm run migration:prosumer-to-user

# Or directly:
bash scripts/run-prosumer-to-user-migration.sh
```

The script will:
1. ✅ Check database connection
2. ✅ Create automatic backup
3. ✅ Show current state
4. ✅ Stop running application
5. ✅ Build project
6. ✅ Run migration
7. ✅ Verify migration
8. ✅ Clear Redis cache
9. ✅ Provide summary

### Option 2: Manual Migration

Follow the steps in the [Manual Migration](#-manual-migration-steps) section below.

## 📝 Prerequisites

### Before Migration
1. **Backup Database** (Critical!)
2. **Stop Application** (All instances)
3. **Clear Redis Cache** (After migration)
4. **Update Frontend** (Coordinate deployment)

### System Requirements
- PostgreSQL 12+
- Node.js 18+
- TypeORM 0.3.27
- Redis (for cache clearing)

## 🔧 Manual Migration Steps

### Step 1: Backup Database

```bash
# Create backup with timestamp
pg_dump -h localhost -p 5432 -U your_user -d enerlink_db > backup_prosumer_to_user_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file
ls -lh backup_prosumer_to_user_*.sql
```

### Step 2: Stop Application

```bash
# If using PM2
pm2 stop backend-p2p-energy

# If using systemd
sudo systemctl stop backend-p2p-energy

# Or kill process manually
pkill -f "nest start"
```

### Step 3: Build Project

```bash
# Ensure latest code is compiled
npm run build
```

### Step 4: Run Migration

```bash
# Execute migration
npm run migration:run
```

**Expected Output:**
```
query: SELECT * FROM current_schema()
query: SELECT * FROM "information_schema"."tables" WHERE "table_schema" = 'public' AND "table_name" = 'migrations'
query: SELECT * FROM "migrations" "migrations" ORDER BY "id" DESC
0 migrations are already loaded in the database.
1 migrations were found in the source code.
1 migrations are new migrations must be executed.
query: START TRANSACTION
[Step 1/9] Renaming table 'prosumer' to 'user'...
[Step 2/9] Updating foreign key in 'wallet' table...
[Step 3/9] Updating foreign keys in 'smart_meter' table...
...
✅ Migration completed successfully!
query: INSERT INTO "migrations"("timestamp", "name") VALUES ($1, $2) -- PARAMETERS: [1730534400000,"RenameProsumerToUser1730534400000"]
Migration RenameProsumerToUser1730534400000 has been executed successfully.
query: COMMIT
```

### Step 5: Verify Migration

```bash
# Connect to database
psql -h localhost -p 5432 -U your_user -d enerlink_db

-- Check user table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'user';

-- Check user_id column exists
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'user_id';

-- Count records (should match original prosumer count)
SELECT COUNT(*) FROM "user";

-- Check foreign keys
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'user';

-- Exit psql
\q
```

### Step 6: Clear Redis Cache

```bash
# Clear all Redis keys (old prosumerId references)
redis-cli FLUSHALL

# Or selectively clear
redis-cli KEYS "orders:by_prosumer:*" | xargs redis-cli DEL
redis-cli KEYS "prosumer:*" | xargs redis-cli DEL
```

### Step 7: Start Application

```bash
# Development
npm run start:dev

# Production
npm run start:prod

# Or with PM2
pm2 start ecosystem.config.js
```

### Step 8: Verify Application

```bash
# Test authentication endpoint
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Response should contain userId (not prosumerId):
# {
#   "access_token": "...",
#   "user": {
#     "userId": "user_1730534400000_abc123",  ← Check this
#     "email": "test@example.com",
#     ...
#   }
# }

# Test GET current user
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔄 Rollback (If Needed)

### Using Migration Revert

```bash
# Revert last migration
npm run migration:revert
```

**Expected Output:**
```
[Step 9/9 ROLLBACK] Renaming table back to 'prosumer'...
[Step 8/9 ROLLBACK] Restoring indexes...
...
✅ Rollback completed successfully!
Migration RenameProsumerToUser1730534400000 has been reverted successfully.
```

### Using Backup Restore

```bash
# Stop application
pm2 stop backend-p2p-energy

# Drop database (⚠️ CAREFUL!)
psql -h localhost -p 5432 -U your_user -c "DROP DATABASE IF EXISTS enerlink_db;"

# Create new database
psql -h localhost -p 5432 -U your_user -c "CREATE DATABASE enerlink_db;"

# Restore from backup
psql -h localhost -p 5432 -U your_user -d enerlink_db < backup_prosumer_to_user_20241102_153000.sql

# Clear Redis
redis-cli FLUSHALL

# Start application
pm2 start backend-p2p-energy
```

## ✅ Verification Checklist

### Database Verification
- [ ] Table `user` exists
- [ ] Column `user_id` exists
- [ ] Record count matches original `prosumer` count
- [ ] Foreign keys updated in all 7 tables
- [ ] Indexes recreated successfully
- [ ] No orphaned records

### Application Verification
- [ ] Application starts without errors
- [ ] Login endpoint returns `userId`
- [ ] JWT token contains `userId` claim
- [ ] API responses use `userId` field
- [ ] WebSocket authentication works
- [ ] Redis keys use `orders:by_user:*` pattern

### Frontend Verification
- [ ] API calls updated to use `userId`
- [ ] User profile displays correctly
- [ ] Dashboard loads user data
- [ ] Trading interface works
- [ ] Transaction history displays

## 🐛 Troubleshooting

### Issue: Migration Fails at Step X

**Solution:**
```bash
# Check current migration status
npm run typeorm migration:show

# If stuck in transaction, rollback manually
psql -h localhost -p 5432 -U your_user -d enerlink_db -c "ROLLBACK;"

# Try migration again
npm run migration:run
```

### Issue: Foreign Key Constraint Violation

**Solution:**
```bash
# Check for orphaned records
psql -h localhost -p 5432 -U your_user -d enerlink_db

-- Find orphaned wallets
SELECT * FROM wallet WHERE prosumer_id NOT IN (SELECT prosumer_id FROM prosumer);

-- Find orphaned smart meters
SELECT * FROM smart_meter WHERE prosumer_id NOT IN (SELECT prosumer_id FROM prosumer);

-- Clean up orphaned records before migration
DELETE FROM wallet WHERE prosumer_id NOT IN (SELECT prosumer_id FROM prosumer);
DELETE FROM smart_meter WHERE prosumer_id NOT IN (SELECT prosumer_id FROM prosumer);
```

### Issue: Application Won't Start

**Symptoms:**
```
Error: relation "prosumer" does not exist
```

**Solution:**
```bash
# Verify migration ran successfully
npm run typeorm migration:show

# If not run, execute it
npm run migration:run

# Clear compiled cache
rm -rf dist/
npm run build

# Restart application
npm run start:dev
```

### Issue: JWT Still Contains prosumerId

**Solution:**
```bash
# Clear Redis cache
redis-cli FLUSHALL

# Invalidate all existing tokens (users must re-login)
psql -h localhost -p 5432 -U your_user -d enerlink_db -c "TRUNCATE TABLE token_blacklist;"

# Restart application
pm2 restart backend-p2p-energy
```

### Issue: Frontend Still Sending prosumerId

**Solution:**
Update frontend API client:

```typescript
// Before (❌ Old)
interface User {
  prosumerId: string;
  email: string;
  // ...
}

// After (✅ New)
interface User {
  userId: string;
  email: string;
  // ...
}

// Update API calls
const response = await fetch(`/api/users/${userId}`);  // not prosumerId
```

## 📊 Performance Considerations

### Migration Duration

| Records | Estimated Time |
|---------|----------------|
| < 1,000 | ~5 seconds |
| 1,000 - 10,000 | ~30 seconds |
| 10,000 - 100,000 | ~2 minutes |
| 100,000+ | ~5-10 minutes |

### Downtime Window

- **Development**: ~2 minutes (including verification)
- **Production**: ~5-10 minutes (including backup and verification)

### Database Size Impact

- Migration adds temporary indexes during execution
- Final database size: **No change** (column rename only)
- Migration creates ~200KB of additional log entries in `migrations` table

## 📱 Frontend Coordination

### Breaking Changes for Frontend

1. **API Response Field Change**
   ```json
   // Before
   { "prosumerId": "prosumer_xxx", ... }
   
   // After
   { "userId": "user_xxx", ... }
   ```

2. **API Endpoint Parameters**
   ```bash
   # Before
   GET /api/prosumers/:prosumerId
   
   # After
   GET /api/users/:userId
   ```

3. **WebSocket Events**
   ```typescript
   // Before
   socket.emit('join', { prosumerId: '...' });
   
   // After
   socket.emit('join', { userId: '...' });
   ```

### Deployment Strategy

**Option 1: Simultaneous Deployment (Recommended)**
1. Deploy backend with migration
2. Deploy frontend immediately after
3. Downtime: 5-10 minutes

**Option 2: Backward Compatible (Complex)**
1. Add `userId` alongside `prosumerId` (transition period)
2. Update frontend to use `userId`
3. Remove `prosumerId` after frontend stable
4. Not recommended for this refactoring

## 📚 Additional Resources

- **Migration File**: `src/database/migrations/1730534400000-RenameProsumerToUser.ts`
- **Factory File**: `src/database/factories/UsersFactory.ts`
- **Seeder File**: `src/database/seeders/FirstSeeder.ts`
- **Helper Script**: `scripts/run-prosumer-to-user-migration.sh`
- **Complete Guide**: `MIGRATION_SEEDING_GUIDE.md`
- **Refactoring Summary**: `PROSUMER_TO_USER_REFACTORING.md`

## 🔒 Security Notes

- **Backup Encryption**: Consider encrypting backup files if they contain sensitive data
- **Redis Clear**: Essential to prevent userId/prosumerId mismatch
- **Token Invalidation**: All users must re-login after migration
- **Audit Trail**: Migration logs all changes for compliance

## ✨ Post-Migration Tasks

1. **Monitor Application**
   - Check error logs for any remaining prosumer references
   - Monitor API response times
   - Verify database query performance

2. **Update Documentation**
   - Update API documentation (Swagger/OpenAPI)
   - Update architecture diagrams
   - Update deployment guides

3. **Clean Up**
   - Remove old backup files after 30 days
   - Archive old documentation
   - Update team knowledge base

## 🎉 Success Criteria

Migration is successful when:
- ✅ All database tables use `user` terminology
- ✅ Application starts without errors
- ✅ Authentication returns `userId`
- ✅ All API endpoints work correctly
- ✅ WebSocket connections authenticate successfully
- ✅ Frontend displays data correctly
- ✅ No console errors related to prosumer references

---

**Last Updated**: 2024-11-02  
**Migration Version**: 1730534400000  
**Status**: Ready for Execution  

Need help? Check the troubleshooting section or contact the development team.
