# Database Migration Guide: Prosumer → User

## Overview

This guide provides SQL migration scripts to rename the `prosumer` table and all related columns to `user` and `user_id` throughout the database.

## ⚠️ IMPORTANT WARNINGS

1. **Backup your database** before running these migrations
2. **Stop all application instances** before migration
3. **Test on staging environment** first
4. **Coordinate with frontend team** for simultaneous deployment
5. This is a **breaking change** - no backward compatibility

## Prerequisites

```bash
# 1. Backup database
pg_dump -h localhost -U your_user -d enerlink_db > backup_before_user_migration_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify backup
ls -lh backup_before_user_migration_*.sql

# 3. Stop application
pm2 stop backend-p2p-energy  # or your process manager
```

## Migration Steps

### Step 1: Disable Foreign Key Constraints (Temporarily)

```sql
-- Disable triggers temporarily for faster migration
SET session_replication_role = 'replica';
```

### Step 2: Rename Primary Table

```sql
-- Rename the main table
ALTER TABLE prosumer RENAME TO "user";

-- Rename primary key column
ALTER TABLE "user" RENAME COLUMN prosumer_id TO user_id;

-- Update column comments if any
COMMENT ON COLUMN "user".user_id IS 'Unique identifier for user';
COMMENT ON TABLE "user" IS 'User accounts table (formerly prosumer)';
```

### Step 3: Update Foreign Key Columns in Related Tables

#### 3.1 Wallets Table

```sql
-- Rename foreign key column
ALTER TABLE wallet RENAME COLUMN prosumer_id TO user_id;

-- Drop old foreign key constraint
ALTER TABLE wallet DROP CONSTRAINT IF EXISTS wallet_prosumer_id_fkey;
ALTER TABLE wallet DROP CONSTRAINT IF EXISTS FK_wallet_prosumer;

-- Add new foreign key constraint
ALTER TABLE wallet
ADD CONSTRAINT wallet_user_id_fkey
FOREIGN KEY (user_id) REFERENCES "user"(user_id)
ON DELETE CASCADE;

-- Update column comment
COMMENT ON COLUMN wallet.user_id IS 'Reference to user who owns this wallet';
```

#### 3.2 Smart Meters Table

```sql
-- Rename foreign key column
ALTER TABLE smart_meter RENAME COLUMN prosumer_id TO user_id;

-- Drop old foreign key constraint
ALTER TABLE smart_meter DROP CONSTRAINT IF EXISTS smart_meter_prosumer_id_fkey;
ALTER TABLE smart_meter DROP CONSTRAINT IF EXISTS FK_smartmeter_prosumer;

-- Add new foreign key constraint
ALTER TABLE smart_meter
ADD CONSTRAINT smart_meter_user_id_fkey
FOREIGN KEY (user_id) REFERENCES "user"(user_id)
ON DELETE CASCADE;

-- Update column comment
COMMENT ON COLUMN smart_meter.user_id IS 'Reference to user who owns this meter';
```

#### 3.3 Transaction Logs Table

```sql
-- Rename foreign key column
ALTER TABLE transaction_log RENAME COLUMN prosumer_id TO user_id;

-- Drop old foreign key constraint
ALTER TABLE transaction_log DROP CONSTRAINT IF EXISTS transaction_log_prosumer_id_fkey;
ALTER TABLE transaction_log DROP CONSTRAINT IF EXISTS FK_transactionlog_prosumer;

-- Add new foreign key constraint
ALTER TABLE transaction_log
ADD CONSTRAINT transaction_log_user_id_fkey
FOREIGN KEY (user_id) REFERENCES "user"(user_id)
ON DELETE CASCADE;

-- Update column comment
COMMENT ON COLUMN transaction_log.user_id IS 'Reference to user associated with this transaction';
```

#### 3.4 Energy Settlements Table

```sql
-- Note: energy_settlement references smart_meter, which references user
-- No direct prosumer_id column, but verify relationships are intact
-- If there's a direct column, update it:
-- ALTER TABLE energy_settlement RENAME COLUMN prosumer_id TO user_id;
```

#### 3.5 Market Trades Table

```sql
-- Rename buyer prosumer column
ALTER TABLE market_trade RENAME COLUMN buyer_prosumer_id TO buyer_user_id;

-- Rename seller prosumer column
ALTER TABLE market_trade RENAME COLUMN seller_prosumer_id TO seller_user_id;

-- Drop old foreign key constraints
ALTER TABLE market_trade DROP CONSTRAINT IF EXISTS market_trade_buyer_prosumer_id_fkey;
ALTER TABLE market_trade DROP CONSTRAINT IF EXISTS market_trade_seller_prosumer_id_fkey;

-- Add new foreign key constraints
ALTER TABLE market_trade
ADD CONSTRAINT market_trade_buyer_user_id_fkey
FOREIGN KEY (buyer_user_id) REFERENCES "user"(user_id)
ON DELETE CASCADE;

ALTER TABLE market_trade
ADD CONSTRAINT market_trade_seller_user_id_fkey
FOREIGN KEY (seller_user_id) REFERENCES "user"(user_id)
ON DELETE CASCADE;

-- Update column comments
COMMENT ON COLUMN market_trade.buyer_user_id IS 'User ID of the buyer';
COMMENT ON COLUMN market_trade.seller_user_id IS 'User ID of the seller';
```

#### 3.6 IDRS Conversions Table

```sql
-- Rename foreign key column
ALTER TABLE idrs_conversion RENAME COLUMN prosumer_id TO user_id;

-- Drop old foreign key constraint
ALTER TABLE idrs_conversion DROP CONSTRAINT IF EXISTS idrs_conversion_prosumer_id_fkey;
ALTER TABLE idrs_conversion DROP CONSTRAINT IF EXISTS FK_idrsconversion_prosumer;

-- Add new foreign key constraint
ALTER TABLE idrs_conversion
ADD CONSTRAINT idrs_conversion_user_id_fkey
FOREIGN KEY (user_id) REFERENCES "user"(user_id)
ON DELETE CASCADE;

-- Update column comment
COMMENT ON COLUMN idrs_conversion.user_id IS 'Reference to user who performed this conversion';
```

#### 3.7 Token Blacklist Table (if exists)

```sql
-- Rename column if exists
ALTER TABLE token_blacklist RENAME COLUMN prosumer_id TO user_id;

-- Update foreign key if exists
ALTER TABLE token_blacklist DROP CONSTRAINT IF EXISTS token_blacklist_prosumer_id_fkey;
ALTER TABLE token_blacklist
ADD CONSTRAINT token_blacklist_user_id_fkey
FOREIGN KEY (user_id) REFERENCES "user"(user_id)
ON DELETE CASCADE;
```

### Step 4: Update Indexes

```sql
-- Drop old indexes
DROP INDEX IF EXISTS idx_wallet_prosumer_id;
DROP INDEX IF EXISTS idx_smartmeter_prosumer_id;
DROP INDEX IF EXISTS idx_transactionlog_prosumer_id;
DROP INDEX IF EXISTS idx_idrsconversion_prosumer_id;
DROP INDEX IF EXISTS idx_markettrade_buyer_prosumer;
DROP INDEX IF EXISTS idx_markettrade_seller_prosumer;

-- Create new indexes
CREATE INDEX idx_wallet_user_id ON wallet(user_id);
CREATE INDEX idx_smartmeter_user_id ON smart_meter(user_id);
CREATE INDEX idx_transactionlog_user_id ON transaction_log(user_id);
CREATE INDEX idx_idrsconversion_user_id ON idrs_conversion(user_id);
CREATE INDEX idx_markettrade_buyer_user ON market_trade(buyer_user_id);
CREATE INDEX idx_markettrade_seller_user ON market_trade(seller_user_id);

-- Composite indexes
CREATE INDEX idx_wallet_user_active ON wallet(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_smartmeter_user_status ON smart_meter(user_id, status);
```

### Step 5: Update Sequences (if using serial)

```sql
-- Typically not needed for varchar primary keys
-- But if you have auto-increment IDs, update sequence names
-- ALTER SEQUENCE prosumer_id_seq RENAME TO user_id_seq;
```

### Step 6: Re-enable Foreign Key Constraints

```sql
-- Re-enable triggers
SET session_replication_role = 'origin';
```

### Step 7: Verify Migration

```sql
-- Check table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'user' AND table_schema = 'public';

-- Check column names
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user'
ORDER BY ordinal_position;

-- Verify foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'user';

-- Count records (should match before migration)
SELECT COUNT(*) FROM "user";

-- Check sample data
SELECT user_id, email, name, created_at
FROM "user"
LIMIT 5;

-- Verify relationships
SELECT
    u.user_id,
    u.email,
    COUNT(DISTINCT w.wallet_address) as wallet_count,
    COUNT(DISTINCT sm.meter_id) as meter_count
FROM "user" u
LEFT JOIN wallet w ON u.user_id = w.user_id
LEFT JOIN smart_meter sm ON u.user_id = sm.user_id
GROUP BY u.user_id, u.email
LIMIT 10;
```

## Complete Migration Script (All-in-One)

```sql
-- PROSUMER TO USER MIGRATION SCRIPT
-- Date: November 2, 2025
-- WARNING: Test on staging first!

BEGIN;

-- Disable constraints temporarily
SET session_replication_role = 'replica';

-- Step 1: Rename main table and primary key
ALTER TABLE prosumer RENAME TO "user";
ALTER TABLE "user" RENAME COLUMN prosumer_id TO user_id;

-- Step 2: Update wallets
ALTER TABLE wallet RENAME COLUMN prosumer_id TO user_id;
ALTER TABLE wallet DROP CONSTRAINT IF EXISTS wallet_prosumer_id_fkey;
ALTER TABLE wallet ADD CONSTRAINT wallet_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE;

-- Step 3: Update smart_meter
ALTER TABLE smart_meter RENAME COLUMN prosumer_id TO user_id;
ALTER TABLE smart_meter DROP CONSTRAINT IF EXISTS smart_meter_prosumer_id_fkey;
ALTER TABLE smart_meter ADD CONSTRAINT smart_meter_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE;

-- Step 4: Update transaction_log
ALTER TABLE transaction_log RENAME COLUMN prosumer_id TO user_id;
ALTER TABLE transaction_log DROP CONSTRAINT IF EXISTS transaction_log_prosumer_id_fkey;
ALTER TABLE transaction_log ADD CONSTRAINT transaction_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE;

-- Step 5: Update market_trade
ALTER TABLE market_trade RENAME COLUMN buyer_prosumer_id TO buyer_user_id;
ALTER TABLE market_trade RENAME COLUMN seller_prosumer_id TO seller_user_id;
ALTER TABLE market_trade DROP CONSTRAINT IF EXISTS market_trade_buyer_prosumer_id_fkey;
ALTER TABLE market_trade DROP CONSTRAINT IF EXISTS market_trade_seller_prosumer_id_fkey;
ALTER TABLE market_trade ADD CONSTRAINT market_trade_buyer_user_id_fkey
    FOREIGN KEY (buyer_user_id) REFERENCES "user"(user_id) ON DELETE CASCADE;
ALTER TABLE market_trade ADD CONSTRAINT market_trade_seller_user_id_fkey
    FOREIGN KEY (seller_user_id) REFERENCES "user"(user_id) ON DELETE CASCADE;

-- Step 6: Update idrs_conversion
ALTER TABLE idrs_conversion RENAME COLUMN prosumer_id TO user_id;
ALTER TABLE idrs_conversion DROP CONSTRAINT IF EXISTS idrs_conversion_prosumer_id_fkey;
ALTER TABLE idrs_conversion ADD CONSTRAINT idrs_conversion_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE;

-- Step 7: Update indexes
DROP INDEX IF EXISTS idx_wallet_prosumer_id;
DROP INDEX IF EXISTS idx_smartmeter_prosumer_id;
DROP INDEX IF EXISTS idx_transactionlog_prosumer_id;
DROP INDEX IF EXISTS idx_idrsconversion_prosumer_id;
DROP INDEX IF EXISTS idx_markettrade_buyer_prosumer;
DROP INDEX IF EXISTS idx_markettrade_seller_prosumer;

CREATE INDEX idx_wallet_user_id ON wallet(user_id);
CREATE INDEX idx_smartmeter_user_id ON smart_meter(user_id);
CREATE INDEX idx_transactionlog_user_id ON transaction_log(user_id);
CREATE INDEX idx_idrsconversion_user_id ON idrs_conversion(user_id);
CREATE INDEX idx_markettrade_buyer_user ON market_trade(buyer_user_id);
CREATE INDEX idx_markettrade_seller_user ON market_trade(seller_user_id);

-- Re-enable constraints
SET session_replication_role = 'origin';

-- Verify migration
DO $$
DECLARE
    user_count INTEGER;
    wallet_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM "user";
    SELECT COUNT(*) INTO wallet_count FROM wallet;

    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Total users: %', user_count;
    RAISE NOTICE 'Total wallets: %', wallet_count;
END $$;

COMMIT;

-- If anything goes wrong, you can rollback:
-- ROLLBACK;
```

## Rollback Script (Emergency Only)

```sql
-- ROLLBACK: USER TO PROSUMER (Emergency Recovery)
-- WARNING: Only use if migration fails!

BEGIN;

SET session_replication_role = 'replica';

-- Reverse main table
ALTER TABLE "user" RENAME TO prosumer;
ALTER TABLE prosumer RENAME COLUMN user_id TO prosumer_id;

-- Reverse wallets
ALTER TABLE wallet RENAME COLUMN user_id TO prosumer_id;
ALTER TABLE wallet DROP CONSTRAINT IF EXISTS wallet_user_id_fkey;
ALTER TABLE wallet ADD CONSTRAINT wallet_prosumer_id_fkey
    FOREIGN KEY (prosumer_id) REFERENCES prosumer(prosumer_id);

-- Reverse smart_meter
ALTER TABLE smart_meter RENAME COLUMN user_id TO prosumer_id;
ALTER TABLE smart_meter DROP CONSTRAINT IF EXISTS smart_meter_user_id_fkey;
ALTER TABLE smart_meter ADD CONSTRAINT smart_meter_prosumer_id_fkey
    FOREIGN KEY (prosumer_id) REFERENCES prosumer(prosumer_id);

-- Reverse transaction_log
ALTER TABLE transaction_log RENAME COLUMN user_id TO prosumer_id;
ALTER TABLE transaction_log DROP CONSTRAINT IF EXISTS transaction_log_user_id_fkey;
ALTER TABLE transaction_log ADD CONSTRAINT transaction_log_prosumer_id_fkey
    FOREIGN KEY (prosumer_id) REFERENCES prosumer(prosumer_id);

-- Reverse market_trade
ALTER TABLE market_trade RENAME COLUMN buyer_user_id TO buyer_prosumer_id;
ALTER TABLE market_trade RENAME COLUMN seller_user_id TO seller_prosumer_id;
ALTER TABLE market_trade DROP CONSTRAINT IF EXISTS market_trade_buyer_user_id_fkey;
ALTER TABLE market_trade DROP CONSTRAINT IF EXISTS market_trade_seller_user_id_fkey;
ALTER TABLE market_trade ADD CONSTRAINT market_trade_buyer_prosumer_id_fkey
    FOREIGN KEY (buyer_prosumer_id) REFERENCES prosumer(prosumer_id);
ALTER TABLE market_trade ADD CONSTRAINT market_trade_seller_prosumer_id_fkey
    FOREIGN KEY (seller_prosumer_id) REFERENCES prosumer(prosumer_id);

-- Reverse idrs_conversion
ALTER TABLE idrs_conversion RENAME COLUMN user_id TO prosumer_id;
ALTER TABLE idrs_conversion DROP CONSTRAINT IF EXISTS idrs_conversion_user_id_fkey;
ALTER TABLE idrs_conversion ADD CONSTRAINT idrs_conversion_prosumer_id_fkey
    FOREIGN KEY (prosumer_id) REFERENCES prosumer(prosumer_id);

-- Reverse indexes
DROP INDEX IF EXISTS idx_wallet_user_id;
DROP INDEX IF EXISTS idx_smartmeter_user_id;
DROP INDEX IF EXISTS idx_transactionlog_user_id;
DROP INDEX IF EXISTS idx_idrsconversion_user_id;
DROP INDEX IF EXISTS idx_markettrade_buyer_user;
DROP INDEX IF EXISTS idx_markettrade_seller_user;

CREATE INDEX idx_wallet_prosumer_id ON wallet(prosumer_id);
CREATE INDEX idx_smartmeter_prosumer_id ON smart_meter(prosumer_id);
CREATE INDEX idx_transactionlog_prosumer_id ON transaction_log(prosumer_id);
CREATE INDEX idx_idrsconversion_prosumer_id ON idrs_conversion(prosumer_id);

SET session_replication_role = 'origin';

COMMIT;
```

## Post-Migration Checklist

- [ ] Database migration completed without errors
- [ ] All foreign keys re-established correctly
- [ ] Indexes recreated successfully
- [ ] Record counts match pre-migration
- [ ] Sample queries return expected results
- [ ] Application starts without database errors
- [ ] Authentication works (JWT with userId)
- [ ] API endpoints return correct field names
- [ ] Frontend updated to use userId
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Backup verified and stored safely

## Troubleshooting

### Issue: Foreign key constraint fails

```sql
-- Check for orphaned records
SELECT w.* FROM wallet w
LEFT JOIN "user" u ON w.user_id = u.user_id
WHERE u.user_id IS NULL;
```

### Issue: Index creation fails

```sql
-- Check for duplicate index names
SELECT indexname FROM pg_indexes WHERE tablename = 'wallet';
```

### Issue: Application errors after migration

1. Clear Redis cache: `redis-cli FLUSHALL`
2. Restart application
3. Check logs for specific table/column name errors
4. Verify TypeORM synchronization is disabled

## Performance Considerations

- Migration duration: ~5-30 seconds (depends on data volume)
- Downtime required: YES (estimated 1-2 minutes)
- Index rebuild: Automatic during migration
- Cache invalidation: Required (Redis FLUSHALL)

## Success Criteria

✅ All tables renamed successfully
✅ All foreign keys recreated
✅ All indexes recreated
✅ Application starts without errors
✅ API tests pass
✅ Frontend integration works

---

**Document Version**: 1.0
**Last Updated**: November 2, 2025
**Status**: Ready for execution
