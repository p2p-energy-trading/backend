#!/bin/bash

# Load environment variables with proper parsing
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | sed 's/ *= */=/g' | sed "s/'//g" | sed 's/"//g' | xargs)
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🗑️  Database Reset Script${NC}"
echo "================================"
echo ""

# Check if SQL file argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: SQL file path required${NC}"
    echo "Usage: ./scripts/reset-database.sh <path-to-sql-file>"
    echo "Example: ./scripts/reset-database.sh database/enerlink_db_2025-10-26_012049.sql"
    exit 1
fi

SQL_FILE=$1

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ Error: SQL file not found: $SQL_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  SQL File: $SQL_FILE"
echo ""

# Confirmation
read -p "⚠️  This will DROP the entire database and recreate it. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Step 1: Terminating active connections...${NC}"

# Terminate all connections to the target database
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();" 2>&1 | grep -v "^$"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Active connections terminated${NC}"
else
    echo -e "${YELLOW}⚠️  No active connections or failed to terminate${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Dropping existing database...${NC}"

# Drop database (connect to postgres database to drop target database)
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database dropped successfully${NC}"
else
    echo -e "${RED}❌ Failed to drop database${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Creating new database...${NC}"

# Create database
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE \"$DB_NAME\" WITH ENCODING='UTF8';" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create database${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Importing SQL file...${NC}"

# Import SQL file
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SQL_FILE 2>&1 | grep -v "^$"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SQL file imported successfully${NC}"
else
    echo -e "${RED}❌ Failed to import SQL file${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✨ Database reset completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify database: npm run typeorm schema:log"
echo "  2. Start application: npm run start:dev"
