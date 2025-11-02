# Prosumer → User Refactoring Quick Reference

## ✅ Status: COMPLETE

### Summary

Successfully renamed **prosumer → user** throughout entire codebase to make the system more general.

---

## 🔄 What Changed

| Before                    | After                 |
| ------------------------- | --------------------- |
| `prosumerId`              | `userId`              |
| `prosumer_id`             | `user_id`             |
| `ProsumersService`        | `UsersService`        |
| `ProsumersModule`         | `UsersModule`         |
| `ValidatedProsumer`       | `ValidatedUser`       |
| `getProsumerIdByWallet()` | `getUserIdByWallet()` |
| `@Entity('prosumer')`     | `@Entity('user')`     |
| `orders:by_prosumer:{id}` | `orders:by_user:{id}` |
| `"prosumer_123"`          | `"user_123"`          |

---

## 📋 Checklist

### Code Changes ✅

- [x] Entity renamed (user.entity.ts)
- [x] Service renamed (UsersService)
- [x] Module renamed (UsersModule)
- [x] DTOs renamed (Users.\*.ts)
- [x] Controllers updated (7 controllers)
- [x] Auth system updated
- [x] Business logic updated (15+ services)
- [x] WebSocket gateway updated
- [x] Redis keys updated
- [x] Test fixtures updated
- [x] TypeScript compilation successful
- [x] Documentation created

### Database Changes ⚠️ PENDING

- [ ] **Run database migration** (CRITICAL)
- [ ] Verify table renamed: `prosumer` → `user`
- [ ] Verify column renamed: `prosumer_id` → `user_id`
- [ ] Verify foreign keys updated
- [ ] Verify indexes recreated
- [ ] Backup database before migration

### Frontend Changes ⚠️ REQUIRED

- [ ] Update all API calls to use `userId`
- [ ] Update authentication to handle `userId` in JWT
- [ ] Update response parsing for `userId` field
- [ ] Update examples and documentation
- [ ] Test all user flows

### Deployment ⚠️ REQUIRED

- [ ] Run database migration
- [ ] Deploy backend with new code
- [ ] Deploy frontend with userId support
- [ ] Clear Redis cache
- [ ] Verify authentication works
- [ ] Monitor for errors

---

## 🚀 Next Steps

### 1. Database Migration (IMMEDIATE)

```bash
# Backup database
pg_dump -h localhost -U your_user -d enerlink_db > backup.sql

# Run migration (see DATABASE_MIGRATION_GUIDE.md)
psql -h localhost -U your_user -d enerlink_db < migration.sql
```

### 2. Deploy Backend

```bash
npm run build
npm run start:prod
# or
pm2 restart backend-p2p-energy
```

### 3. Clear Cache

```bash
redis-cli FLUSHALL
```

### 4. Verify

```bash
# Test authentication
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'

# Should return userId (not prosumerId)
```

---

## 📊 Impact Analysis

### Breaking Changes

❌ **API Response Fields**: `prosumerId` → `userId`
❌ **JWT Token Payload**: Contains `userId` instead of `prosumerId`
❌ **Database Schema**: Table and column names changed

### Affected Systems

- ✅ Backend API (updated)
- ⚠️ Frontend (needs update)
- ⚠️ Database (needs migration)
- ⚠️ Mobile app (if exists, needs update)
- ⚠️ External integrations (need coordination)

---

## 🔍 Verification Commands

### Check for remaining "prosumer" references

```bash
grep -r "prosumer" src/ --exclude-dir=node_modules --exclude="*.md" | grep -v "prosumer -> user"
```

### Build project

```bash
npm run build
```

### Run tests

```bash
npm test
```

### Check database

```sql
-- Should return 'user' table
SELECT table_name FROM information_schema.tables
WHERE table_name = 'user';

-- Should return 'user_id' column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user' AND column_name = 'user_id';
```

---

## 📚 Documentation

- **Summary**: `PROSUMER_TO_USER_REFACTORING_SUMMARY.md`
- **Migration Guide**: `DATABASE_MIGRATION_GUIDE.md`
- **This Guide**: `PROSUMER_TO_USER_QUICK_REFERENCE.md`

---

## ⚠️ Important Notes

1. **Coordinate deployment**: Backend, frontend, and database must be updated together
2. **No backward compatibility**: This is a breaking change
3. **Backup first**: Always backup before running migrations
4. **Test on staging**: Test complete flow on staging environment
5. **Monitor production**: Watch logs closely after deployment

---

## 🆘 Rollback (Emergency)

If something goes wrong:

1. **Stop application**
2. **Run rollback script** (see DATABASE_MIGRATION_GUIDE.md)
3. **Restore backup** if needed
4. **Revert code** using Git: `git revert <commit-hash>`

---

## ✅ Success Criteria

- [ ] Application starts without errors
- [ ] Authentication works (login/register)
- [ ] API returns `userId` in responses
- [ ] Database queries work correctly
- [ ] Frontend displays data correctly
- [ ] No console errors
- [ ] All tests pass

---

**Status**: ✅ Code Complete, ⚠️ Database Migration Pending
**Last Updated**: November 2, 2025
**Author**: Backend Team
