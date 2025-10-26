# TimescaleDB Archival Service Decision

## TL;DR

**Archival service is DISABLED** because TimescaleDB handles data lifecycle automatically.

## Why Archival Service is No Longer Needed

### Before TimescaleDB (PostgreSQL Standard)

```
📊 Data Flow:
Redis → PostgreSQL (grows indefinitely)
         ↓
    Archival Service (every 30 days)
         ↓
    Export to MinIO → Delete from PostgreSQL
```

**Problems:**

- Manual intervention required
- Data accumulates without limit
- Heavy archival process every 30 days
- Requires MinIO storage management

### With TimescaleDB (Current)

```
📊 Data Flow:
Redis → TimescaleDB Hypertable
         ↓
    Auto-compress (after 7 days) → 90-95% smaller
         ↓
    Auto-delete (after 5 years) → No manual intervention
```

**Benefits:**

- ✅ **Automatic compression**: After 7 days
- ✅ **Automatic retention**: After 5 years
- ✅ **No manual archival**: Fully automated
- ✅ **Data still queryable**: Even compressed data
- ✅ **Resource efficient**: No heavy archival jobs

## TimescaleDB Policies Active

### 1. Compression Policy

- **Trigger**: After 7 days
- **Method**: Columnar compression
- **Segment By**: `meterId`
- **Order By**: `hourStart DESC`
- **Compression Ratio**: 90-95%
- **Query Performance**: Same or better

### 2. Retention Policy

- **Duration**: 5 years (1,825 days)
- **Action**: Automatic chunk deletion
- **Frequency**: Continuous background process
- **Performance**: Zero impact on queries

### 3. Continuous Aggregate

- **View**: `telemetry_daily_summary`
- **Refresh**: Every 1 hour
- **Purpose**: Pre-computed daily statistics
- **Benefit**: Fast dashboard queries

## Archival Service Status

### Current Configuration

- **Status**: DISABLED (cron commented out)
- **Location**: `src/services/telemetry-archival.service.ts`
- **Cron Schedule**: `// @Cron('0 0 2 */30 * *')` (commented)

### Code Change

```typescript
// BEFORE:
@Cron('0 0 2 */30 * *', {
  name: 'monthly-telemetry-archival',
})
async archiveOldData() { ... }

// AFTER:
// @Cron('0 0 2 */30 * *', {
//   name: 'monthly-telemetry-archival',
// })
async archiveOldData() { ... }
```

## When to Re-enable Archival Service

Consider re-enabling archival service only if:

### Use Case 1: Compliance Requirements

- Need immutable backup in separate storage
- Regulatory requirement for archived data
- Audit trail in CSV format

### Use Case 2: Data Recovery

- Need ability to restore very old data
- Want off-database backup solution
- Disaster recovery planning

### Use Case 3: Data Export

- Need data in MinIO for analytics
- Integration with data warehouse
- Long-term historical analysis outside database

## How to Re-enable (If Needed)

### Step 1: Uncomment Cron Decorator

```typescript
@Cron('0 0 2 */30 * *', {
  name: 'monthly-telemetry-archival',
})
async archiveOldData() { ... }
```

### Step 2: Verify MinIO Configuration

```bash
# Check .env file
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### Step 3: Test Archival

```typescript
// Trigger manually via API or service method
await telemetryArchivalService.archiveOldData();
```

## Storage Comparison

### Without TimescaleDB + Archival

- **PostgreSQL**: ~22 GB (1,000 meters × 5 years)
- **MinIO Archive**: Additional ~22 GB
- **Total**: ~44 GB

### With TimescaleDB (No Archival)

- **First 7 days**: ~200 MB (uncompressed)
- **After compression**: ~10-20 MB (90-95% compressed)
- **Total 5 years**: ~1.1-2.2 GB
- **MinIO**: 0 GB (not needed)
- **Total**: ~1.1-2.2 GB

**Savings**: ~95% storage reduction!

## Performance Impact

### Archival Service (When Enabled)

- **CPU**: High during archival (CSV export + MinIO upload)
- **Memory**: High (loading records into memory)
- **Disk I/O**: High (reading + writing + deleting)
- **Frequency**: Every 30 days
- **Duration**: Several hours for large datasets

### TimescaleDB Policies (Always Active)

- **CPU**: Low (background process)
- **Memory**: Low (chunk-based processing)
- **Disk I/O**: Low (incremental compression)
- **Frequency**: Continuous
- **Duration**: Transparent to application

## Monitoring TimescaleDB Policies

### Check Compression Status

```sql
SELECT
  hypertable_name,
  number_compressed_chunks,
  number_uncompressed_chunks,
  pg_size_pretty(before_compression_total_bytes) as before_size,
  pg_size_pretty(after_compression_total_bytes) as after_size,
  ROUND(
    (1 - after_compression_total_bytes::numeric /
     before_compression_total_bytes::numeric) * 100,
    2
  ) as compression_ratio_pct
FROM timescaledb_information.compressed_hypertable_stats;
```

### Check Retention Policy Status

```sql
SELECT
  job_id,
  application_name,
  schedule_interval,
  config,
  next_start
FROM timescaledb_information.jobs
WHERE proc_name = 'policy_retention';
```

### Check Policy Execution History

```sql
SELECT
  job_id,
  last_run_status,
  last_successful_finish,
  total_runs,
  total_successes,
  total_failures
FROM timescaledb_information.job_stats
WHERE job_id IN (
  SELECT job_id
  FROM timescaledb_information.jobs
  WHERE proc_name IN ('policy_compression', 'policy_retention')
);
```

## Conclusion

**Decision**: Archival service is DISABLED because it is redundant with TimescaleDB policies.

**Rationale**:

1. TimescaleDB handles data lifecycle automatically
2. Better performance (compression vs archival)
3. Better storage efficiency (90-95% compression)
4. Simpler architecture (no external storage needed)
5. Lower operational overhead

**Recommendation**: Keep archival service disabled unless specific compliance or business requirements mandate additional off-database backup.

## References

- [TimescaleDB Compression](https://docs.timescale.com/use-timescale/latest/compression/)
- [TimescaleDB Retention Policies](https://docs.timescale.com/use-timescale/latest/data-retention/)
- [TimescaleDB Continuous Aggregates](https://docs.timescale.com/use-timescale/latest/continuous-aggregates/)
