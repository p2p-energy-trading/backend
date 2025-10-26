#!/bin/bash

# Rollback from TimescaleDB to PostgreSQL
# Use this if you need to revert to standard PostgreSQL

set -e

echo "⚠️  TimescaleDB Rollback Script"
echo "================================"
echo ""
echo "This will revert from TimescaleDB back to standard PostgreSQL"
echo "All data will be lost!"
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Rollback cancelled"
    exit 0
fi

echo ""
echo "📋 Step 1: Stopping containers..."
cd dependency
docker compose down

echo ""
echo "🗑️  Step 2: Removing volumes..."
docker volume rm dependency_postgres_data 2>/dev/null || true

echo ""
echo "📝 Step 3: Updating docker-compose.yml..."
# Backup current file
cp docker-compose.yml docker-compose.yml.timescale.bak

# Replace TimescaleDB with PostgreSQL
sed -i 's|image: timescale/timescaledb:latest-pg17|image: postgres:17.5|g' docker-compose.yml

echo "✅ docker-compose.yml updated (backup saved as docker-compose.yml.timescale.bak)"

echo ""
echo "🐳 Step 4: Starting PostgreSQL container..."
docker compose up -d postgres

echo ""
echo "⏳ Step 5: Waiting for database..."
sleep 5

max_attempts=30
attempt=0
until docker exec enerlink-postgres pg_isready -U enerlink_user > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Database failed to start"
        exit 1
    fi
    echo "   Waiting... (attempt $attempt/$max_attempts)"
    sleep 2
done

echo "✅ PostgreSQL is ready"

echo ""
echo "🔄 Step 6: Starting other services..."
docker compose up -d

echo ""
echo "📊 Step 7: Running migrations..."
cd ..
npm run migration:run

echo ""
echo "✅ Rollback completed!"
echo ""
echo "⚠️  Note: You may need to revert the TimescaleDB migration manually:"
echo "   npm run migration:revert"
echo ""
echo "To restore TimescaleDB, run: bash scripts/migrate-to-timescaledb.sh"
