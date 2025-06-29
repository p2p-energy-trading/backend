-- Performance Optimization Indexes for Real-Time Energy Dashboard
-- Run these indexes to maximize query performance

-- 1. Primary composite index for meter + timestamp queries
-- This is the most critical index for our optimized queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_energy_readings_detailed_meter_timestamp 
ON energy_readings_detailed ("meter_id", timestamp DESC);

-- 2. Index for subsystem filtering (used in WHERE clauses)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_energy_readings_detailed_subsystem 
ON energy_readings_detailed (subsystem);

-- 3. Combined index optimized for window function queries
-- Supports the DENSE_RANK and ROW_NUMBER operations efficiently
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_energy_readings_detailed_window_func 
ON energy_readings_detailed ("meter_id", timestamp DESC, subsystem, "reading_id");

-- 4. Index for settlement-related queries (if needed)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_energy_readings_detailed_settlement 
ON energy_readings_detailed ("meter_id", "settlement_energy_wh") 
WHERE "settlement_energy_wh" IS NOT NULL;

-- 5. ULTRA-OPTIMIZED index specifically for the energy chart query
-- This index is perfectly tailored for findDailyEnergyTotalsForChart method
-- It supports DISTINCT ON (DATE("timestamp"), "meter_id", subsystem) with optimal ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_energy_readings_detailed_chart_optimized 
ON energy_readings_detailed (
    "meter_id", 
    subsystem, 
    (DATE("timestamp")), 
    timestamp DESC,
    "daily_energy_wh"
) 
WHERE subsystem IN ('SOLAR', 'LOAD', 'GRID_EXPORT', 'GRID_IMPORT') 
    AND "daily_energy_wh" IS NOT NULL 
    AND "daily_energy_wh" > 0;

-- Alternative partial index if the above is too specific
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_energy_readings_detailed_chart_simple 
-- ON energy_readings_detailed ((DATE("timestamp")), "meter_id", subsystem, timestamp DESC)
-- WHERE subsystem IN ('SOLAR', 'LOAD', 'GRID_EXPORT', 'GRID_IMPORT') 
--     AND "daily_energy_wh" IS NOT NULL;

-- Verify indexes were created
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'energy_readings_detailed'
    AND indexname LIKE 'idx_energy_readings_detailed_%'
ORDER BY indexname;

-- Query to check index usage (run after testing the optimized endpoints)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE tablename = 'energy_readings_detailed'
ORDER BY idx_scan DESC;
