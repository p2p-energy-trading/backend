# TimescaleDB Integration

## Overview

EnerLink telemetry system uses **TimescaleDB** for optimal time-series data management. TimescaleDB is a PostgreSQL extension that provides:

- 🗜️ **90-95% compression** - Massive storage savings
- ⚡ **10-100x faster queries** - Optimized for time-series
- 🤖 **Automatic data lifecycle** - Compression & retention policies
- 📊 **Continuous aggregates** - Pre-computed analytics
- 🔄 **Full SQL compatibility** - All PostgreSQL features work

## Quick Start

### Deploy TimescaleDB

```bash
# Automated migration (recommended)
bash scripts/migrate-to-timescaledb.sh

# Or manual
cd dependency
docker compose down
docker volume rm dependency_postgres_data
docker compose up -d
cd ..
npm run migration:run
```

### Verify Installation

```bash
# Check version
docker exec -it enerlink-postgres psql -U enerlink_user -d enerlink_db \
  -c "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';"

# Check hypertables
docker exec -it enerlink-postgres psql -U enerlink_user -d enerlink_db \
  -c "SELECT * FROM timescaledb_information.hypertables;"
```

## Architecture

### Data Flow

```
IoT Device (MQTT)
    ↓
Redis (Hot Storage - 2 hours)
    ↓
TimescaleDB Hypertable (Warm Storage - 5 years)
  ├── Raw data (7 days)
  ├── Compressed data (after 7 days) → 90-95% smaller
  └── Auto-deleted (after 5 years)
    ↓ [Optional]
MinIO (Cold Archive - backup/compliance)
```

### Features Enabled

1. **Hypertable**: `telemetry_aggregates`

   - Automatic partitioning (7-day chunks)
   - Optimized for time-range queries

2. **Compression Policy**

   - Triggers: After 7 days
   - Ratio: 90-95% reduction
   - Transparent: Queries work normally

3. **Retention Policy**

   - Duration: 5 years
   - Action: Automatic deletion
   - Benefit: No manual cleanup needed

4. **Continuous Aggregate**: `telemetry_daily_summary`
   - Pre-computed daily statistics
   - Auto-refreshes every hour
   - Much faster than raw aggregation

## Storage Estimates

| Meters | PostgreSQL (5y) | TimescaleDB (5y) | Savings |
| ------ | --------------- | ---------------- | ------- |
| 100    | ~2.2 GB         | ~110-220 MB      | 90-95%  |
| 500    | ~11 GB          | ~550 MB - 1.1 GB | 90-95%  |
| 1,000  | ~22 GB          | ~1.1-2.2 GB      | 90-95%  |
| 5,000  | ~110 GB         | ~5.5-11 GB       | 90-95%  |
| 10,000 | ~220 GB         | ~11-22 GB        | 90-95%  |

## Query Examples

### Standard SQL (No Changes)

```sql
-- All existing queries work the same
SELECT * FROM telemetry_aggregates
WHERE meter_id = 'METER001'
  AND hour_start >= NOW() - INTERVAL '7 days';
```

### TimescaleDB Functions

```sql
-- Time bucket aggregation
SELECT
  time_bucket('1 day', hour_start) AS day,
  AVG(battery_voltage_avg) as avg_voltage
FROM telemetry_aggregates
WHERE meter_id = 'METER001'
GROUP BY day
ORDER BY day DESC;

-- Use continuous aggregate (faster)
SELECT * FROM telemetry_daily_summary
WHERE meter_id = 'METER001'
  AND day_start >= NOW() - INTERVAL '30 days';
```

## Monitoring

### Compression Stats

```sql
SELECT
  pg_size_pretty(before_compression_total_bytes) as before,
  pg_size_pretty(after_compression_total_bytes) as after,
  ROUND(100 - (after_compression_total_bytes::numeric /
    before_compression_total_bytes::numeric * 100), 2) as savings_percent
FROM timescaledb_information.compressed_hypertable_stats
WHERE hypertable_name = 'telemetry_aggregates';
```

### Chunk Status

```sql
SELECT chunk_name, range_start, range_end, is_compressed
FROM timescaledb_information.chunks
WHERE hypertable_name = 'telemetry_aggregates'
ORDER BY range_start DESC;
```

### Job Status

```sql
SELECT job_id, application_name, next_start, last_run_status
FROM timescaledb_information.jobs;
```

## Code Impact

### ✅ No Changes Required!

- **TypeORM Entities**: Work as-is
- **Services**: No modifications needed
- **Controllers**: No changes
- **Queries**: All SQL compatible

### Optional Enhancements

You can leverage TimescaleDB-specific functions:

```typescript
// Example: Use time_bucket
const dailyStats = await this.repository.query(
  `
  SELECT 
    time_bucket('1 day', hour_start) AS day,
    AVG(battery_voltage_avg) as avg_voltage
  FROM telemetry_aggregates
  WHERE meter_id = $1
  GROUP BY day
  ORDER BY day DESC
`,
  [meterId],
);
```

## Archival Service

With TimescaleDB retention policy, MinIO archival is **optional**:

### Option 1: Keep Archival (Current)

- ✅ Backup in MinIO before deletion
- ✅ Good for compliance
- ✅ Runs every 30 days

### Option 2: Disable Archival

- ✅ Simpler architecture
- ✅ Rely on TimescaleDB retention
- ✅ No CSV exports needed

## Troubleshooting

### Extension Not Found

```bash
docker exec -it enerlink-postgres psql -U enerlink_user -d enerlink_db \
  -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

### Check Logs

```bash
docker compose logs postgres | grep -i timescale
```

### Manual Compression

```sql
SELECT compress_chunk(i, if_not_compressed => true)
FROM show_chunks('telemetry_aggregates', older_than => INTERVAL '7 days') i;
```

### Reindex (if needed)

```sql
REINDEX TABLE telemetry_aggregates;
```

## Rollback

If you need to revert to standard PostgreSQL:

```bash
bash scripts/rollback-timescaledb.sh
```

## Documentation

- 📘 **Full Guide**: `.github/instructions/TimescaleDB Migration Guide.md`
- 📝 **Quick Reference**: `.github/instructions/TimescaleDB Quick Reference.md`
- 📊 **Summary**: `.github/instructions/TimescaleDB Migration Summary.md`
- 🔧 **Migration Script**: `scripts/migrate-to-timescaledb.sh`

## Resources

- [TimescaleDB Official Docs](https://docs.timescale.com/)
- [Hypertables Guide](https://docs.timescale.com/use-timescale/latest/hypertables/)
- [Compression Guide](https://docs.timescale.com/use-timescale/latest/compression/)
- [Best Practices](https://docs.timescale.com/use-timescale/latest/schema-management/best-practices/)

---

**Ready to deploy?** Run `bash scripts/migrate-to-timescaledb.sh` 🚀
