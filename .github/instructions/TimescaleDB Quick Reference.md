# TimescaleDB Quick Reference

## 🚀 Quick Start

### 1. Deploy TimescaleDB

```bash
cd dependency
docker compose down
docker volume rm dependency_postgres_data  # ⚠️  DELETES DATA!
docker compose up -d
```

### 2. Run Migration

```bash
npm run migration:run
```

### 3. Verify

```bash
docker exec -it enerlink-postgres psql -U enerlink_user -d enerlink_db -c "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';"
```

---

## 📊 Key Concepts

### Hypertable

- Regular table with time-series superpowers
- Automatically partitioned by time
- `telemetry_aggregates` → chunks of 7 days each

### Compression

- Automatic after 7 days
- 90-95% storage reduction
- Transparent to queries

### Retention Policy

- Automatic deletion after 5 years
- No manual intervention needed
- Replaces archival cron (optional now)

### Continuous Aggregate

- `telemetry_daily_summary` → pre-computed daily stats
- Auto-refreshes every hour
- Much faster than aggregating on-the-fly

---

## 🔍 Useful Queries

### Check Hypertable Status

```sql
SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name = 'telemetry_aggregates';
```

### Check Compression Stats

```sql
SELECT
  pg_size_pretty(before_compression_total_bytes) as before,
  pg_size_pretty(after_compression_total_bytes) as after,
  ROUND(100 - (after_compression_total_bytes::numeric / before_compression_total_bytes::numeric * 100), 2) as compression_ratio
FROM timescaledb_information.compressed_hypertable_stats
WHERE hypertable_name = 'telemetry_aggregates';
```

### Check Chunks

```sql
SELECT chunk_name, range_start, range_end, is_compressed
FROM timescaledb_information.chunks
WHERE hypertable_name = 'telemetry_aggregates'
ORDER BY range_start DESC
LIMIT 10;
```

### Manual Compression (if needed)

```sql
SELECT compress_chunk(i, if_not_compressed => true)
FROM show_chunks('telemetry_aggregates', older_than => INTERVAL '7 days') i;
```

### Check Jobs Status

```sql
SELECT job_id, application_name, schedule_interval, next_start
FROM timescaledb_information.jobs;
```

---

## 📈 Performance Tips

### Use time_bucket for Aggregations

```sql
-- Instead of GROUP BY hour/day manually, use time_bucket
SELECT
  time_bucket('1 hour', hour_start) AS hour,
  AVG(battery_voltage_avg)
FROM telemetry_aggregates
WHERE meter_id = 'METER001'
GROUP BY hour;
```

### Use Continuous Aggregates

```sql
-- Much faster than aggregating raw data
SELECT * FROM telemetry_daily_summary
WHERE meter_id = 'METER001'
  AND day_start >= NOW() - INTERVAL '30 days';
```

### Index Optimization

```sql
-- TimescaleDB already creates optimal indexes
-- But you can add custom indexes if needed
CREATE INDEX IF NOT EXISTS idx_meter_voltage
ON telemetry_aggregates (meter_id, battery_voltage_avg)
WHERE battery_voltage_avg < 3.0;
```

---

## 🛠️ Maintenance

### Reindex (rarely needed)

```sql
REINDEX TABLE telemetry_aggregates;
```

### Decompress Chunk (if needed)

```sql
SELECT decompress_chunk('_timescaledb_internal._hyper_X_Y_chunk');
```

### Manually Drop Old Data

```sql
-- If retention policy not working
SELECT drop_chunks('telemetry_aggregates', older_than => INTERVAL '5 years');
```

---

## 🔧 Troubleshooting

### Extension Not Loaded

```bash
docker exec -it enerlink-postgres psql -U enerlink_user -d enerlink_db -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

### Check Logs

```bash
docker compose logs postgres | grep -i timescale
```

### Verify Policies

```sql
SELECT * FROM timescaledb_information.jobs;
SELECT * FROM timescaledb_information.job_stats ORDER BY last_run_started_at DESC;
```

---

## 📦 Storage Estimates

| Meters | Duration | Rows | PostgreSQL | TimescaleDB (Compressed) |
| ------ | -------- | ---- | ---------- | ------------------------ |
| 100    | 5 years  | 4.4M | ~2.2 GB    | ~110-220 MB              |
| 500    | 5 years  | 22M  | ~11 GB     | ~550 MB - 1.1 GB         |
| 1,000  | 5 years  | 44M  | ~22 GB     | ~1.1-2.2 GB              |
| 5,000  | 5 years  | 220M | ~110 GB    | ~5.5-11 GB               |

**Compression ratio**: Typically 90-95% reduction after 7 days

---

## 🎯 Architecture Decision

### With TimescaleDB:

```
Redis (2h) → TimescaleDB (5y, auto-compress, auto-retain) → [Optional: MinIO backup]
```

### Benefits:

- ✅ 90-95% storage reduction
- ✅ 10-100x faster queries
- ✅ Automatic data lifecycle
- ✅ No manual intervention
- ✅ SQL compatible (no code changes)

### When to Archive to MinIO:

- ✅ Compliance requirements
- ✅ Long-term audit trail (>5 years)
- ✅ Data recovery backup
- ❌ Not needed for normal operations

---

## 📚 Resources

- [TimescaleDB Docs](https://docs.timescale.com/)
- [Best Practices](https://docs.timescale.com/use-timescale/latest/schema-management/best-practices/)
- [Compression Guide](https://docs.timescale.com/use-timescale/latest/compression/)
