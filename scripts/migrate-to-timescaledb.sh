#!/bin/bash

# TimescaleDB Migration Script
# This script migrates from PostgreSQL to TimescaleDB

set -e  # Exit on error

echo "🚀 EnerLink TimescaleDB Migration Script"
echo "=========================================="
echo ""

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Confirm with user
echo "⚠️  WARNING: This will recreate the database!"
echo "   All existing data will be lost."
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "📋 Step 1: Stopping existing containers..."
cd dependency
docker compose down

echo ""
echo "🗑️  Step 2: Removing old PostgreSQL volume..."
docker volume rm dependency_postgres_data 2>/dev/null || true
echo "✅ Old volume removed"

echo ""
echo "🐳 Step 3: Starting TimescaleDB container..."
docker compose up -d postgres

echo ""
echo "⏳ Step 4: Waiting for database to be ready..."
sleep 5

# Wait for PostgreSQL to be ready
max_attempts=30
attempt=0
until docker exec enerlink-postgres pg_isready -U enerlink_user > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Database failed to start after $max_attempts attempts"
        exit 1
    fi
    echo "   Waiting... (attempt $attempt/$max_attempts)"
    sleep 2
done

echo "✅ Database is ready!"

echo ""
echo "🔧 Step 5: Verifying TimescaleDB extension..."
version=$(docker exec enerlink-postgres psql -U enerlink_user -d enerlink_db -tAc "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';" 2>/dev/null || echo "not_installed")

if [ "$version" = "not_installed" ]; then
    echo "📦 Installing TimescaleDB extension..."
    docker exec enerlink-postgres psql -U enerlink_user -d enerlink_db -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
fi

version=$(docker exec enerlink-postgres psql -U enerlink_user -d enerlink_db -tAc "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';")
echo "✅ TimescaleDB version: $version"

echo ""
echo "📊 Step 6: Starting other services..."
cd ..
cd dependency
docker compose up -d

echo ""
echo "⏳ Step 7: Waiting for all services to be healthy..."
sleep 5

# Check service health
services=("enerlink-postgres" "enerlink-redis" "enerlink-minio")
for service in "${services[@]}"; do
    if docker ps --filter "name=$service" --filter "status=running" | grep -q "$service"; then
        echo "✅ $service is running"
    else
        echo "❌ $service is not running"
    fi
done

echo ""
echo "🔄 Step 8: Importing database structure..."
cd ..
echo "   Importing from dependency/initial_db_enerlink_2025-10-26_012049.sql..."
docker exec -i enerlink-postgres psql -U enerlink_user -d enerlink_db < dependency/initial_db_enerlink_2025-10-26_012049.sql
echo "✅ Database structure imported!"

echo ""
echo "🔄 Step 9: Running TimescaleDB migrations..."
npm run migration:run

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "📊 Next steps:"
echo "   1. Start backend: npm run start:dev"
echo "   2. Verify hypertable: docker exec -it enerlink-postgres psql -U enerlink_user -d enerlink_db -c \"SELECT * FROM timescaledb_information.hypertables;\""
echo "   3. Check compression: docker exec -it enerlink-postgres psql -U enerlink_user -d enerlink_db -c \"SELECT * FROM timescaledb_information.compression_settings;\""
echo ""
echo "📚 Documentation: .github/instructions/TimescaleDB Migration Guide.md"
echo "🔍 Quick Reference: .github/instructions/TimescaleDB Quick Reference.md"
