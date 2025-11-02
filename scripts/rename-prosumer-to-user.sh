#!/bin/bash

# Script to rename prosumer to user throughout the codebase
# This is a comprehensive refactoring affecting database columns, entities, services, DTOs, and all references

echo "🔄 Starting prosumer -> user refactoring..."
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to show progress
progress() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

# Step 1: Rename column names in entities (database mapping)
progress "Step 1: Renaming database column references (prosumer_id -> user_id)..."
find src -type f \( -name "*.entity.ts" -o -name "*.service.ts" -o -name "*.controller.ts" \) -exec sed -i "s/prosumer_id/user_id/g" {} +
success "Database column names updated"

# Step 2: Rename TypeScript property names
progress "Step 2: Renaming TypeScript properties (prosumerId -> userId)..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s/prosumerId/userId/g" {} +
success "TypeScript properties updated"

# Step 3: Rename class names
progress "Step 3: Renaming service classes (ProsumersService -> UsersService)..."
find src -type f -name "*.ts" -exec sed -i "s/ProsumersService/UsersService/g" {} +
success "Service class names updated"

progress "Step 4: Renaming module classes (ProsumersModule -> UsersModule)..."
find src -type f -name "*.ts" -exec sed -i "s/ProsumersModule/UsersModule/g" {} +
success "Module class names updated"

# Step 4: Rename DTO files and references
progress "Step 5: Renaming DTO types (Prosumers -> Users in imports and types)..."
find src -type f -name "*.ts" -exec sed -i "s/CreateProsumersInput/CreateUsersInput/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/ProsumersArgs/UsersArgs/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/ProsumersOutput/UsersOutput/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/from '\.\/dto\/Prosumers\./from '.\/dto\/Users./g" {} +
success "DTO types updated"

# Step 5: Update entity table name annotations
progress "Step 6: Updating @Entity annotations ('prosumer' -> 'user')..."
find src -type f -name "*.entity.ts" -exec sed -i "s/@Entity('prosumer')/@Entity('user')/g" {} +
success "Entity table names updated"

# Step 6: Update relation references in entities
progress "Step 7: Updating OneToMany/ManyToOne relations (prosumers -> users)..."
find src -type f -name "*.entity.ts" -exec sed -i "s/\.prosumers/.users/g" {} +
success "Entity relations updated"

# Step 7: Update interfaces and type definitions
progress "Step 8: Renaming interfaces (ValidatedProsumer -> ValidatedUser)..."
find src -type f -name "*.ts" -exec sed -i "s/ValidatedProsumer/ValidatedUser/g" {} +
success "Interface names updated"

# Step 8: Update function names
progress "Step 9: Updating function names (getProsumerIdByWallet -> getUserIdByWallet)..."
find src -type f -name "*.ts" -exec sed -i "s/getProsumerIdByWallet/getUserIdByWallet/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/getProsumeDevices/getUserDevices/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/findByProsumerId/findByUserId/g" {} +
success "Function names updated"

# Step 9: Update Redis keys
progress "Step 10: Updating Redis keys (orders:by_prosumer -> orders:by_user)..."
find src -type f -name "*.ts" -exec sed -i "s/orders:by_prosumer/orders:by_user/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/by_prosumer/by_user/g" {} +
success "Redis keys updated"

# Step 10: Update WebSocket room names
progress "Step 11: Updating WebSocket room prefixes..."
find src -type f -name "*.ts" -exec sed -i "s/prosumerAddress/userAddress/g" {} +
success "WebSocket references updated"

# Step 11: Update variable names in comments and strings (case-sensitive)
progress "Step 12: Updating variable names in comments..."
find src -type f -name "*.ts" -exec sed -i "s/buyerProsumerId/buyerUserId/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/sellerProsumerId/sellerUserId/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/firstProsumer/firstUser/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/existingProsumers/existingUsers/g" {} +
success "Variable names in comments updated"

# Step 12: Update documentation strings (keep "Prosumer" in user-facing API docs where it makes business sense)
progress "Step 13: Updating documentation (selective)..."
# Update internal documentation but keep API-facing prosumer terminology where appropriate
find src -type f -name "*.ts" -exec sed -i "s/prosumer account/user account/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/prosumer with/user with/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/prosumer ID/user ID/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/The prosumer/The user/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/a prosumer/a user/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/Prosumer information/User information/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/Prosumer credentials/User credentials/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/Prosumer name/User name/g" {} +
success "Documentation updated"

# Step 13: Update string literals (SQL, logs, error messages)
progress "Step 14: Updating string literals in code..."
find src -type f -name "*.ts" -exec sed -i "s/prosumer IDs/user IDs/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/prosumer management/user management/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/Getting prosumer/Getting user/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/Error getting prosumer/Error getting user/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/Missing prosumer/Missing user/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/'prosumer_/'user_/g" {} +
success "String literals updated"

# Step 14: Update example data in DTOs
progress "Step 15: Updating DTO examples..."
find src -type f -name "*.dto.ts" -exec sed -i "s/'prosumer_/'user_/g" {} +
success "DTO examples updated"

echo ""
success "✅ Refactoring complete!"
echo ""
warn "⚠️  IMPORTANT: Please review the following:"
echo "   1. Check that all entity relations are correctly updated"
echo "   2. Run 'npm run build' to verify TypeScript compilation"
echo "   3. Update database migration to rename actual table and columns"
echo "   4. Update any API documentation or OpenAPI specs"
echo "   5. Review test files and update assertions"
echo "   6. Check that frontend references are compatible"
echo ""
echo "📝 Next steps:"
echo "   - Rename DTO files: mv src/models/user/dto/Prosumers.*.ts -> Users.*.ts"
echo "   - Create database migration for table/column renames"
echo "   - Update app.module.ts imports"
echo "   - Run tests: npm test"
echo ""
