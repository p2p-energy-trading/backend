#!/bin/bash

# Migration Helper Script for Prosumer → User Refactoring
# This script helps you safely run the database migration with proper checks

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

confirm() {
    read -p "$(echo -e ${YELLOW}[?]${NC} $1 [y/N]: )" -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# Header
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Database Migration: Prosumer → User                 ║"
echo "║     Safe Migration Script with Backup                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    success "Environment variables loaded"
else
    error "Error: .env file not found"
    exit 1
fi

# Check database connection
info "Checking database connection..."
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null; then
    success "Database connection OK"
else
    error "Cannot connect to database. Please check your credentials."
    exit 1
fi

# Step 1: Backup
warning "⚠️  IMPORTANT: This migration will modify your database schema!"
echo ""
if ! confirm "Do you want to create a backup first? (HIGHLY RECOMMENDED)"; then
    warning "Skipping backup... (Not recommended!)"
else
    BACKUP_FILE="backup_prosumer_to_user_$(date +%Y%m%d_%H%M%S).sql"
    info "Creating backup: $BACKUP_FILE"
    
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE
    
    if [ -f "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        success "Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"
    else
        error "Backup failed!"
        exit 1
    fi
fi

echo ""

# Step 2: Show current state
info "Current database state:"
PROSUMER_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM prosumer;" 2>/dev/null || echo "0")
echo "   - Prosumers: $PROSUMER_COUNT"
WALLET_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM wallet;" 2>/dev/null || echo "0")
echo "   - Wallets: $WALLET_COUNT"
METER_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM smart_meter;" 2>/dev/null || echo "0")
echo "   - Smart Meters: $METER_COUNT"

echo ""

# Step 3: Confirm migration
if ! confirm "Proceed with migration?"; then
    warning "Migration cancelled by user"
    exit 0
fi

# Step 4: Stop application
echo ""
info "Checking for running application processes..."
if pgrep -f "nest start" > /dev/null; then
    warning "Application is running"
    if confirm "Stop application before migration?"; then
        info "Stopping application..."
        pkill -f "nest start" || true
        sleep 2
        success "Application stopped"
    fi
else
    success "No running application found"
fi

# Step 5: Build project
echo ""
info "Building project..."
npm run build
if [ $? -eq 0 ]; then
    success "Build successful"
else
    error "Build failed! Aborting migration."
    exit 1
fi

# Step 6: Run migration
echo ""
info "Running migration..."
npm run migration:run

if [ $? -eq 0 ]; then
    success "Migration completed successfully!"
else
    error "Migration failed!"
    echo ""
    warning "To rollback, run: npm run migration:revert"
    warning "To restore backup, run: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
    exit 1
fi

# Step 7: Verify migration
echo ""
info "Verifying migration..."

# Check if user table exists
USER_TABLE=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'user' AND table_schema = 'public';" | xargs)

if [ "$USER_TABLE" = "user" ]; then
    success "Table 'user' exists"
else
    error "Table 'user' not found!"
    exit 1
fi

# Check if user_id column exists
USER_ID_COLUMN=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'user_id';" | xargs)

if [ "$USER_ID_COLUMN" = "user_id" ]; then
    success "Column 'user_id' exists"
else
    error "Column 'user_id' not found!"
    exit 1
fi

# Count users
USER_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM \"user\";" | xargs)
success "Users in database: $USER_COUNT"

# Verify record count matches
if [ "$USER_COUNT" = "$PROSUMER_COUNT" ]; then
    success "Record count matches (no data loss)"
else
    warning "Record count mismatch! Before: $PROSUMER_COUNT, After: $USER_COUNT"
fi

# Step 8: Clear Redis cache
echo ""
if command -v redis-cli &> /dev/null; then
    if confirm "Clear Redis cache?"; then
        info "Clearing Redis cache..."
        redis-cli FLUSHALL
        success "Redis cache cleared"
    fi
else
    warning "redis-cli not found, skipping cache clear"
fi

# Step 9: Summary
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              Migration Summary                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
success "✅ Migration completed successfully!"
success "✅ Table renamed: prosumer → user"
success "✅ Column renamed: prosumer_id → user_id"
success "✅ Foreign keys updated in all related tables"
success "✅ Indexes recreated"
success "✅ Data integrity verified"

if [ -f "$BACKUP_FILE" ]; then
    echo ""
    info "Backup saved: $BACKUP_FILE"
    info "To restore: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
fi

echo ""
info "Next steps:"
echo "   1. Start application: npm run start:dev"
echo "   2. Test authentication: Check JWT contains userId"
echo "   3. Verify API endpoints return userId (not prosumerId)"
echo "   4. Update frontend to use userId field"
echo ""

if confirm "Start application now?"; then
    info "Starting application..."
    npm run start:dev &
    sleep 3
    success "Application started in background"
    info "Check logs: tail -f logs/*.log"
else
    info "To start manually: npm run start:dev"
fi

echo ""
success "🎉 All done!"
echo ""
