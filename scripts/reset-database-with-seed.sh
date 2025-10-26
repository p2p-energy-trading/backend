#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if SQL file argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: SQL file path required${NC}"
    echo "Usage: npm run db:reset <path-to-sql-file>"
    echo "Example: npm run db:reset enerlink_db_2025-10-26_012049.sql"
    exit 1
fi

SQL_FILE=$1

echo -e "${YELLOW}🔄 Full Database Reset with Migration & Seeding${NC}"
echo "=================================================="
echo ""

# Step 1: Reset database with SQL import
echo -e "${YELLOW}Step 1/3: Resetting database and importing SQL...${NC}"
bash scripts/reset-database.sh "$SQL_FILE"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Database reset failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2/3: Running migrations...${NC}"

# Step 2: Run migrations
npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations completed successfully${NC}"
else
    echo -e "${YELLOW}⚠️  No pending migrations or migration failed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3/3: Running seeder...${NC}"

# Step 3: Run seeder
npx ts-node -r tsconfig-paths/register src/database/seed.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Seeding completed successfully${NC}"
else
    echo -e "${RED}❌ Seeding failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✨ Database reset, migration, and seeding completed!${NC}"
echo ""
echo "Next step:"
echo "  Start application: npm run start:dev"
