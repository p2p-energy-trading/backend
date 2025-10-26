# TimescaleDB Migration Guide

## Overview

EnerLink telemetry system has been migrated from standard PostgreSQL to TimescaleDB for optimal time-series data handling.

## What is TimescaleDB?

TimescaleDB is a PostgreSQL extension specifically designed for time-series data. It provides:

- **Automatic Partitioning**: Data automatically partitioned by time (hypertables)
- **Compression**: 90-95% storage reduction with native compression
- **Fast Queries**: 10-100x faster for time-series operations
- **Data Retention**: Automatic deletion of old data
- **Continuous Aggregates**: Materialized views that auto-refresh
- **SQL Compatible**: All standard PostgreSQL features still work

## Architecture Changes

### Before:

```
Redis (2 hours) → PostgreSQL → MinIO Archive (via cron)
```

### After:

```
Redis (2 hours) → TimescaleDB (with auto-compression & retention) → MinIO Archive (optional)
```

## Setup & Migration

### 1. Docker Compose Update

Changed PostgreSQL image to TimescaleDB:

```yaml
postgres:
  image: timescale/timescaledb:latest-pg17 # Was: postgres:17.5
```

### 2. Run Migration

```bash
# Stop existing containers
cd dependency
docker compose down

# Remove old volumes (CAUTION: This deletes data!)
docker volume rm dependency_postgres_data

# Start with TimescaleDB
docker compose up -d

# Wait for database to be ready
docker compose logs -f postgres

# Run migration
cd ..
npm run migration:run
```

### 3. Verify Setup

```bash
# Connect to database
docker exec -it enerlink-postgres psql -U enerlink_user -d enerlink_db

# Check TimescaleDB version
SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';

# Check hypertables
SELECT * FROM timescaledb_information.hypertables;

# Check compression settings
SELECT * FROM timescaledb_information.compression_settings;

# Check retention policies
SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';

# Exit
\q
```

## Features Enabled

### 1. Hypertable

`telemetry_aggregates` table converted to hypertable:

- **Chunk Interval**: 7 days (data partitioned weekly)
- **Partition Key**: `hour_start` (timestamp column)

### 2. Compression

- **Enabled**: Automatically compresses chunks older than 7 days
- **Compression Ratio**: Typically 90-95% reduction
- **Segment By**: `meter_id` (optimizes queries per meter)
- **Order By**: `hour_start DESC` (optimizes time-range queries)

### 3. Retention Policy

- **Duration**: 5 years (1,825 days)
- **Automatic**: Old data automatically deleted
- **No Manual Archival Needed**: Built-in lifecycle management

### 4. Continuous Aggregate

`telemetry_daily_summary` materialized view:

- **Aggregation**: Daily summaries from hourly data
- **Auto-Refresh**: Updates every hour
- **Fast Queries**: Pre-computed daily statistics

## Query Examples

### Standard Queries (No Change)

```sql
-- All existing queries work the same
SELECT * FROM telemetry_aggregates
WHERE meter_id = 'METER001'
  AND hour_start >= NOW() - INTERVAL '7 days'
ORDER BY hour_start DESC;
```

### TimescaleDB-Specific Functions

```sql
-- Time bucket aggregation
SELECT
  time_bucket('1 day', hour_start) AS day,
  meter_id,
  AVG(battery_voltage_avg) as avg_voltage
FROM telemetry_aggregates
WHERE hour_start >= NOW() - INTERVAL '30 days'
GROUP BY day, meter_id
ORDER BY day DESC;

-- Use continuous aggregate for daily stats
SELECT * FROM telemetry_daily_summary
WHERE meter_id = 'METER001'
  AND day_start >= NOW() - INTERVAL '90 days'
ORDER BY day_start DESC;

-- Check compression stats
SELECT
  hypertable_name,
  total_chunks,
  number_compressed_chunks,
  before_compression_total_bytes,
  after_compression_total_bytes,
  pg_size_pretty(before_compression_total_bytes) as before_size,
  pg_size_pretty(after_compression_total_bytes) as after_size
FROM timescaledb_information.compression_settings;
```

## Performance Benefits

### Storage Efficiency

**Before (PostgreSQL):**

- 1,000 meters × 5 years = ~43.8M rows
- Storage: ~22 GB

**After (TimescaleDB with compression):**

- Same data: ~1-2 GB (90-95% reduction)
- Automatic compression after 7 days

### Query Performance

- **Time-range queries**: 10-100x faster
- **Aggregations**: Significantly faster with continuous aggregates
- **Index performance**: Better due to partitioning

### Scaling

- **Vertical**: Up to billions of rows per hypertable
- **Horizontal**: Can add distributed hypertables if needed
- **Proven**: Used by companies with petabytes of time-series data

## Monitoring

### Check Hypertable Stats

```sql
SELECT * FROM timescaledb_information.hypertable_detailed_size('telemetry_aggregates');
```

### Check Compression Stats

```sql
SELECT * FROM timescaledb_information.compressed_chunk_stats;
```

### Check Active Jobs

```sql
SELECT * FROM timescaledb_information.jobs;
```

### Check Job Execution History

```sql
SELECT * FROM timescaledb_information.job_stats
ORDER BY last_run_started_at DESC;
```

## Code Changes

### No Application Code Changes Required!

- TypeORM entities: No changes
- Services: No changes (aggregation & archival work the same)
- Controllers: No changes
- Queries: All existing SQL works

### Optional: Use TimescaleDB Functions

You can enhance queries with TimescaleDB functions:

```typescript
// Example: Use time_bucket in raw query
const dailyStats = await this.telemetryRepository.query(
  `
  SELECT 
    time_bucket('1 day', hour_start) AS day,
    meter_id,
    AVG(battery_voltage_avg) as avg_voltage
  FROM telemetry_aggregates
  WHERE meter_id = $1 AND hour_start >= $2
  GROUP BY day, meter_id
  ORDER BY day DESC
`,
  [meterId, startDate],
);
```

## Migration Checklist

- [x] Update docker-compose.yml to use TimescaleDB image
- [x] Create migration to enable extension and setup hypertable
- [x] Setup compression policy (7 days)
- [x] Setup retention policy (5 years)
- [x] Create continuous aggregate for daily summaries
- [ ] Test aggregation service (no code changes needed)
- [ ] Test archival service (optional now, but can keep for backup)
- [ ] Verify compression is working after 7 days
- [ ] Monitor query performance improvements

## Archival Service Status

With TimescaleDB retention policy, the MinIO archival service is **optional**:

### Option 1: Keep Archival (Recommended for Compliance)

- Keep archival service as backup/compliance requirement
- Data archived to MinIO before deletion
- Run every 30 days (current setting)

### Option 2: Disable Archival (Simpler)

- Rely on TimescaleDB retention policy
- Data automatically deleted after 5 years
- No CSV archives
- Simpler architecture

**Current Configuration**: Archival service still enabled (every 30 days)

## Troubleshooting

### Extension Not Found

```bash
# Verify TimescaleDB image
docker inspect enerlink-postgres | grep Image

# Should show: timescale/timescaledb:latest-pg17
```

### Migration Fails

```bash
# Check if table exists first
npm run migration:run

# If errors, check logs
docker compose logs postgres
```

### Performance Issues

```bash
# Reindex if needed
docker exec -it enerlink-postgres psql -U enerlink_user -d enerlink_db \
  -c "REINDEX TABLE telemetry_aggregates;"

# Check chunk statistics
docker exec -it enerlink-postgres psql -U enerlink_user -d enerlink_db \
  -c "SELECT * FROM timescaledb_information.chunks WHERE hypertable_name = 'telemetry_aggregates';"
```

## Resources

- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Hypertables Guide](https://docs.timescale.com/use-timescale/latest/hypertables/)
- [Compression Guide](https://docs.timescale.com/use-timescale/latest/compression/)
- [Continuous Aggregates](https://docs.timescale.com/use-timescale/latest/continuous-aggregates/)

## Migration Date

- **Implemented**: October 26, 2025
- **Migration File**: `1761470060653-SetupTimescaleDB.ts`
- **Docker Image**: `timescale/timescaledb:latest-pg17`
