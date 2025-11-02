# Migration & Seeding Guide: Prosumer → User

## 📋 Overview

Panduan lengkap untuk menjalankan migration database dan seeding data setelah refactoring dari `prosumer` ke `user`.

---

## 🚀 Quick Start

### 1. Backup Database (WAJIB!)

```bash
# Backup database sebelum migration
pg_dump -h localhost -U your_user -d enerlink_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verifikasi backup berhasil
ls -lh backup_*.sql
```

### 2. Stop Application

```bash
# Stop semua instance aplikasi
pm2 stop all
# atau
pkill -f "nest start"
```

### 3. Run Migration

```bash
cd /home/lynoz/projects/backend-p2p-energy

# Jalankan migration
npm run migration:run
```

### 4. Verify Migration

```bash
# Connect ke database
psql -h localhost -U your_user -d enerlink_db

# Verify table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'user' AND table_schema = 'public';

# Check user_id column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user' AND column_name = 'user_id';

# Count users
SELECT COUNT(*) FROM "user";

# Exit
\q
```

### 5. Clear Redis Cache

```bash
redis-cli FLUSHALL
```

### 6. Run Seeders (Optional - Development Only)

```bash
# Reset database dengan seed data
npm run db:reset

# Atau seed saja tanpa reset
npm run seed
```

### 7. Start Application

```bash
npm run start:dev
# atau production
npm run start:prod
```

---

## 📦 Migration Details

### Migration File

**Location**: `src/database/migrations/1730534400000-RenameProsumerToUser.ts`

**What it does**:

1. ✅ Renames `prosumer` table → `user`
2. ✅ Renames `prosumer_id` column → `user_id`
3. ✅ Updates foreign keys in all related tables:
   - `wallet.prosumer_id` → `wallet.user_id`
   - `smart_meter.prosumer_id` → `smart_meter.user_id`
   - `transaction_log.prosumer_id` → `transaction_log.user_id`
   - `market_trade.buyer_prosumer_id` → `market_trade.buyer_user_id`
   - `market_trade.seller_prosumer_id` → `market_trade.seller_user_id`
   - `idrs_conversion.prosumer_id` → `idrs_conversion.user_id`
   - `token_blacklist.prosumer_id` → `token_blacklist.user_id`
4. ✅ Drops old indexes and creates new ones
5. ✅ Updates foreign key constraints
6. ✅ Verifies migration success

### Commands

```bash
# Generate new migration (if needed)
npm run migration:generate -- src/database/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run typeorm migration:show
```

---

## 🌱 Seeding Details

### Updated Files

#### 1. **UsersFactory.ts** (formerly ProsumersFactory.ts)

**Location**: `src/database/factories/UsersFactory.ts`

```typescript
export const UsersFactory = setSeederFactory(User, (faker) => {
  const user = new User();
  user.userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  user.name = faker.person.fullName();
  user.email = faker.internet.email();
  user.passwordHash = bcrypt.hashSync('password', 12);
  user.createdAt = new Date();
  user.updatedAt = new Date();
  return user;
});
```

**Changes**:

- ✅ Renamed `ProsumersFactory` → `UsersFactory`
- ✅ Variable `prosumer` → `user`
- ✅ ID prefix `prosumer_` → `user_`

#### 2. **WalletsFactory.ts**

**Location**: `src/database/factories/WalletsFactory.ts`

**Status**: ✅ Already uses `userId` - No changes needed

#### 3. **SmartMetersFactory.ts**

**Location**: `src/database/factories/SmartMetersFactory.ts`

**Status**: ✅ Already uses `userId` - No changes needed

#### 4. **FirstSeeder.ts**

**Location**: `src/database/seeders/FirstSeeder.ts`

**Changes**:

- ✅ `prosumerFactory` → `userFactory`
- ✅ `prosumers` → `users`
- ✅ Log messages updated

**What it seeds**:

- 5 users with random names and emails
- 1 wallet per user
- 1 smart meter per user
- Default password: `password`

---

## 🗂️ Database Schema Changes

### Before Migration

```
Table: prosumer
└── prosumer_id (PK)

Table: wallet
└── prosumer_id (FK → prosumer.prosumer_id)

Table: smart_meter
└── prosumer_id (FK → prosumer.prosumer_id)

Table: transaction_log
└── prosumer_id (FK → prosumer.prosumer_id)

Table: market_trade
├── buyer_prosumer_id (FK → prosumer.prosumer_id)
└── seller_prosumer_id (FK → prosumer.prosumer_id)

Table: idrs_conversion
└── prosumer_id (FK → prosumer.prosumer_id)
```

### After Migration

```
Table: user
└── user_id (PK)

Table: wallet
└── user_id (FK → user.user_id)

Table: smart_meter
└── user_id (FK → user.user_id)

Table: transaction_log
└── user_id (FK → user.user_id)

Table: market_trade
├── buyer_user_id (FK → user.user_id)
└── seller_user_id (FK → user.user_id)

Table: idrs_conversion
└── user_id (FK → user.user_id)
```

---

## 🧪 Testing

### Test Migration on Development

```bash
# 1. Backup current database
npm run db:backup  # if you have this script

# 2. Run migration
npm run migration:run

# 3. Test application
npm run start:dev

# 4. Test endpoints
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Should return userId (not prosumerId)
```

### Test Seeders

```bash
# Reset database with seed data
npm run db:reset

# Check seeded data
psql -h localhost -U your_user -d enerlink_db -c "SELECT * FROM \"user\" LIMIT 5;"
```

---

## ⚠️ Rollback (Emergency)

### If Migration Fails

```bash
# Rollback to previous state
npm run migration:revert

# Restore from backup
pg_restore -h localhost -U your_user -d enerlink_db backup_YYYYMMDD_HHMMSS.sql
```

### If Application Breaks

```bash
# 1. Stop application
pm2 stop all

# 2. Rollback migration
npm run migration:revert

# 3. Restore database
psql -h localhost -U your_user -d enerlink_db < backup_YYYYMMDD_HHMMSS.sql

# 4. Clear Redis
redis-cli FLUSHALL

# 5. Revert code changes
git revert <commit-hash>

# 6. Restart application
npm run start:prod
```

---

## 📊 Verification Checklist

### Database Verification

- [ ] Table `user` exists
- [ ] Column `user_id` exists in `user` table
- [ ] Foreign keys updated in all related tables
- [ ] Indexes recreated successfully
- [ ] Record count matches before migration
- [ ] No orphaned records

### Application Verification

- [ ] Application starts without errors
- [ ] Login works (returns `userId` in response)
- [ ] Registration works
- [ ] JWT token contains `userId`
- [ ] Wallet endpoints work
- [ ] Trading endpoints work
- [ ] Energy endpoints work

### Seeder Verification

- [ ] Seeder creates 5 users
- [ ] Each user has 1 wallet
- [ ] Each user has 1 smart meter
- [ ] User IDs use `user_` prefix
- [ ] All users have password "password"
- [ ] Email addresses are unique

---

## 🔍 Troubleshooting

### Issue: Migration fails with foreign key error

**Solution**:

```sql
-- Check for orphaned records
SELECT w.* FROM wallet w
LEFT JOIN "user" u ON w.user_id = u.user_id
WHERE u.user_id IS NULL;

-- Delete orphaned records if any
DELETE FROM wallet WHERE user_id NOT IN (SELECT user_id FROM "user");
```

### Issue: Seeder creates prosumer* IDs instead of user*

**Solution**:

- Clear database: `npm run db:reset-clean`
- Rebuild: `npm run build`
- Run seeder: `npm run seed`

### Issue: Application can't find "prosumer" table

**Solution**:

- Verify migration ran: Check `migrations` table in database
- Clear Node modules cache: `rm -rf node_modules dist && npm install && npm run build`
- Restart application

### Issue: Redis cache shows old data

**Solution**:

```bash
redis-cli FLUSHALL
```

---

## 📈 Performance Considerations

- **Migration Duration**: ~10-30 seconds (depending on data size)
- **Downtime Required**: Yes (~2-5 minutes total)
- **Disk Space**: Temporary space needed for index rebuild
- **Memory**: Standard PostgreSQL requirements

---

## 🔐 Security Notes

1. **Backup Encryption**: Consider encrypting backups if they contain sensitive data
2. **Password Seeding**: Default password "password" should only be used in development
3. **Production**: Always use strong, unique passwords in production seeds
4. **Access Control**: Restrict migration execution to authorized personnel only

---

## 📚 Related Documentation

- **Refactoring Summary**: `PROSUMER_TO_USER_REFACTORING_SUMMARY.md`
- **Database Migration Guide**: `DATABASE_MIGRATION_GUIDE.md`
- **Quick Reference**: `PROSUMER_TO_USER_QUICK_REFERENCE.md`

---

## ✅ Success Criteria

✅ Migration completed without errors
✅ All foreign keys intact
✅ Indexes recreated
✅ Application starts successfully
✅ Authentication works
✅ All API endpoints return correct data
✅ Seeders create data with correct schema

---

**Last Updated**: November 2, 2025
**Migration Version**: 1730534400000
**Status**: Ready for Execution
