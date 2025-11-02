import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Rename Prosumer to User
 *
 * This migration renames the 'prosumer' table to 'user' and updates all
 * related foreign key columns from 'prosumer_id' to 'user_id' across
 * all dependent tables.
 *
 * Affected Tables:
 * - prosumer → user (main table)
 * - wallet (prosumer_id → user_id)
 * - smart_meter (prosumer_id → user_id)
 * - transaction_log (prosumer_id → user_id)
 * - market_trade (buyer_prosumer_id → buyer_user_id, seller_prosumer_id → seller_user_id)
 * - idrs_conversion (prosumer_id → user_id)
 * - token_blacklist (prosumer_id → user_id, if exists)
 *
 * @date November 2, 2025
 */
export class RenameProsumerToUser1761992645605 implements MigrationInterface {
  name = 'RenameProsumerToUser1761992645605';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Starting migration: Rename Prosumer to User...');

    // Disable constraints temporarily for faster migration
    await queryRunner.query(`SET session_replication_role = 'replica'`);

    try {
      // ============================================
      // STEP 1: Rename main table and primary key
      // ============================================
      console.log('  📋 Step 1: Renaming main table prosumer → user...');

      await queryRunner.query(`ALTER TABLE "prosumer" RENAME TO "user"`);
      await queryRunner.query(
        `ALTER TABLE "user" RENAME COLUMN "prosumer_id" TO "user_id"`,
      );
      await queryRunner.query(
        `COMMENT ON TABLE "user" IS 'User accounts table (formerly prosumer)'`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN "user"."user_id" IS 'Unique identifier for user'`,
      );

      console.log('  ✅ Main table renamed successfully');

      // ============================================
      // STEP 2: Update wallet table
      // ============================================
      console.log('  📋 Step 2: Updating wallet table...');

      await queryRunner.query(
        `ALTER TABLE "wallet" RENAME COLUMN "prosumer_id" TO "user_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "wallet" DROP CONSTRAINT IF EXISTS "wallet_prosumer_id_fkey"`,
      );
      await queryRunner.query(
        `ALTER TABLE "wallet" DROP CONSTRAINT IF EXISTS "FK_wallet_prosumer"`,
      );
      await queryRunner.query(
        `ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_fkey" 
         FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN "wallet"."user_id" IS 'Reference to user who owns this wallet'`,
      );

      console.log('  ✅ Wallet table updated');

      // ============================================
      // STEP 3: Update smart_meter table
      // ============================================
      console.log('  📋 Step 3: Updating smart_meter table...');

      await queryRunner.query(
        `ALTER TABLE "smart_meter" RENAME COLUMN "prosumer_id" TO "user_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "smart_meter" DROP CONSTRAINT IF EXISTS "smart_meter_prosumer_id_fkey"`,
      );
      await queryRunner.query(
        `ALTER TABLE "smart_meter" DROP CONSTRAINT IF EXISTS "FK_smartmeter_prosumer"`,
      );
      await queryRunner.query(
        `ALTER TABLE "smart_meter" ADD CONSTRAINT "smart_meter_user_id_fkey" 
         FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN "smart_meter"."user_id" IS 'Reference to user who owns this meter'`,
      );

      console.log('  ✅ Smart meter table updated');

      // ============================================
      // STEP 4: Update transaction_log table
      // ============================================
      console.log('  📋 Step 4: Updating transaction_log table...');

      await queryRunner.query(
        `ALTER TABLE "transaction_log" RENAME COLUMN "prosumer_id" TO "user_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "transaction_log" DROP CONSTRAINT IF EXISTS "transaction_log_prosumer_id_fkey"`,
      );
      await queryRunner.query(
        `ALTER TABLE "transaction_log" DROP CONSTRAINT IF EXISTS "FK_transactionlog_prosumer"`,
      );
      await queryRunner.query(
        `ALTER TABLE "transaction_log" ADD CONSTRAINT "transaction_log_user_id_fkey" 
         FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN "transaction_log"."user_id" IS 'Reference to user associated with this transaction'`,
      );

      console.log('  ✅ Transaction log table updated');

      // ============================================
      // STEP 5: Update market_trade table
      // ============================================
      console.log('  📋 Step 5: Updating market_trade table...');

      await queryRunner.query(
        `ALTER TABLE "market_trade" RENAME COLUMN "buyer_prosumer_id" TO "buyer_user_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "market_trade" RENAME COLUMN "seller_prosumer_id" TO "seller_user_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "market_trade" DROP CONSTRAINT IF EXISTS "market_trade_buyer_prosumer_id_fkey"`,
      );
      await queryRunner.query(
        `ALTER TABLE "market_trade" DROP CONSTRAINT IF EXISTS "market_trade_seller_prosumer_id_fkey"`,
      );
      await queryRunner.query(
        `ALTER TABLE "market_trade" ADD CONSTRAINT "market_trade_buyer_user_id_fkey" 
         FOREIGN KEY ("buyer_user_id") REFERENCES "user"("user_id") ON DELETE CASCADE`,
      );
      await queryRunner.query(
        `ALTER TABLE "market_trade" ADD CONSTRAINT "market_trade_seller_user_id_fkey" 
         FOREIGN KEY ("seller_user_id") REFERENCES "user"("user_id") ON DELETE CASCADE`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN "market_trade"."buyer_user_id" IS 'User ID of the buyer'`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN "market_trade"."seller_user_id" IS 'User ID of the seller'`,
      );

      console.log('  ✅ Market trade table updated');

      // ============================================
      // STEP 6: Update idrs_conversion table
      // ============================================
      console.log('  📋 Step 6: Updating idrs_conversion table...');

      await queryRunner.query(
        `ALTER TABLE "idrs_conversion" RENAME COLUMN "prosumer_id" TO "user_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "idrs_conversion" DROP CONSTRAINT IF EXISTS "idrs_conversion_prosumer_id_fkey"`,
      );
      await queryRunner.query(
        `ALTER TABLE "idrs_conversion" DROP CONSTRAINT IF EXISTS "FK_idrsconversion_prosumer"`,
      );
      await queryRunner.query(
        `ALTER TABLE "idrs_conversion" ADD CONSTRAINT "idrs_conversion_user_id_fkey" 
         FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN "idrs_conversion"."user_id" IS 'Reference to user who performed this conversion'`,
      );

      console.log('  ✅ IDRS conversion table updated');

      // ============================================
      // STEP 7: Update token_blacklist table (if exists)
      // ============================================
      console.log('  📋 Step 7: Checking token_blacklist table...');

      const tokenBlacklistExists =
        await queryRunner.hasTable('token_blacklist');
      if (tokenBlacklistExists) {
        const hasColumn = await queryRunner.hasColumn(
          'token_blacklist',
          'prosumer_id',
        );
        if (hasColumn) {
          await queryRunner.query(
            `ALTER TABLE "token_blacklist" RENAME COLUMN "prosumer_id" TO "user_id"`,
          );
          await queryRunner.query(
            `ALTER TABLE "token_blacklist" DROP CONSTRAINT IF EXISTS "token_blacklist_prosumer_id_fkey"`,
          );
          await queryRunner.query(
            `ALTER TABLE "token_blacklist" ADD CONSTRAINT "token_blacklist_user_id_fkey" 
             FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE`,
          );
          console.log('  ✅ Token blacklist table updated');
        } else {
          console.log('  ℹ️  Token blacklist has no prosumer_id column');
        }
      } else {
        console.log('  ℹ️  Token blacklist table does not exist');
      }

      // ============================================
      // STEP 8: Update indexes
      // ============================================
      console.log('  📋 Step 8: Updating indexes...');

      // Drop old indexes (ignore errors if they don't exist)
      const oldIndexes = [
        'idx_wallet_prosumer_id',
        'idx_smartmeter_prosumer_id',
        'idx_transactionlog_prosumer_id',
        'idx_idrsconversion_prosumer_id',
        'idx_markettrade_buyer_prosumer',
        'idx_markettrade_seller_prosumer',
      ];

      for (const indexName of oldIndexes) {
        try {
          await queryRunner.query(`DROP INDEX IF EXISTS "${indexName}"`);
        } catch (error) {
          console.log(`  ℹ️  Index ${indexName} does not exist, skipping`);
        }
      }

      // Create new indexes
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_wallet_user_id" ON "wallet"("user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_smartmeter_user_id" ON "smart_meter"("user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_transactionlog_user_id" ON "transaction_log"("user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_idrsconversion_user_id" ON "idrs_conversion"("user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_markettrade_buyer_user" ON "market_trade"("buyer_user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_markettrade_seller_user" ON "market_trade"("seller_user_id")`,
      );

      // Composite indexes for performance
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_wallet_user_active" ON "wallet"("user_id", "is_active") WHERE "is_active" = true`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_smartmeter_user_status" ON "smart_meter"("user_id", "status")`,
      );

      console.log('  ✅ Indexes updated successfully');

      // ============================================
      // STEP 9: Verify migration
      // ============================================
      console.log('  📋 Step 9: Verifying migration...');

      const userTable = await queryRunner.hasTable('user');
      if (!userTable) {
        throw new Error('Migration failed: user table does not exist');
      }

      const userIdColumn = await queryRunner.hasColumn('user', 'user_id');
      if (!userIdColumn) {
        throw new Error('Migration failed: user_id column does not exist');
      }

      // Count records
      const result = await queryRunner.query(`SELECT COUNT(*) FROM "user"`);
      const userCount = parseInt(result[0].count, 10);
      console.log(`  ✅ Verification complete: ${userCount} users in database`);

      console.log('✅ Migration completed successfully!');
    } finally {
      // Re-enable constraints
      await queryRunner.query(`SET session_replication_role = 'origin'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back migration: User to Prosumer...');

    // Disable constraints temporarily
    await queryRunner.query(`SET session_replication_role = 'replica'`);

    try {
      // Reverse Step 8: Drop new indexes
      console.log('  📋 Reversing indexes...');
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_wallet_user_id"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_smartmeter_user_id"`);
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_transactionlog_user_id"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_idrsconversion_user_id"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_markettrade_buyer_user"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_markettrade_seller_user"`,
      );
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_wallet_user_active"`);
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_smartmeter_user_status"`,
      );

      // Recreate old indexes
      await queryRunner.query(
        `CREATE INDEX "idx_wallet_prosumer_id" ON "wallet"("prosumer_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX "idx_smartmeter_prosumer_id" ON "smart_meter"("prosumer_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX "idx_transactionlog_prosumer_id" ON "transaction_log"("prosumer_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX "idx_idrsconversion_prosumer_id" ON "idrs_conversion"("prosumer_id")`,
      );

      // Reverse Step 7: token_blacklist
      const tokenBlacklistExists =
        await queryRunner.hasTable('token_blacklist');
      if (tokenBlacklistExists) {
        const hasColumn = await queryRunner.hasColumn(
          'token_blacklist',
          'user_id',
        );
        if (hasColumn) {
          await queryRunner.query(
            `ALTER TABLE "token_blacklist" DROP CONSTRAINT IF EXISTS "token_blacklist_user_id_fkey"`,
          );
          await queryRunner.query(
            `ALTER TABLE "token_blacklist" RENAME COLUMN "user_id" TO "prosumer_id"`,
          );
          await queryRunner.query(
            `ALTER TABLE "token_blacklist" ADD CONSTRAINT "token_blacklist_prosumer_id_fkey" 
             FOREIGN KEY ("prosumer_id") REFERENCES "prosumer"("prosumer_id")`,
          );
        }
      }

      // Reverse Step 6: idrs_conversion
      console.log('  📋 Reversing idrs_conversion...');
      await queryRunner.query(
        `ALTER TABLE "idrs_conversion" DROP CONSTRAINT IF EXISTS "idrs_conversion_user_id_fkey"`,
      );
      await queryRunner.query(
        `ALTER TABLE "idrs_conversion" RENAME COLUMN "user_id" TO "prosumer_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "idrs_conversion" ADD CONSTRAINT "idrs_conversion_prosumer_id_fkey" 
         FOREIGN KEY ("prosumer_id") REFERENCES "prosumer"("prosumer_id")`,
      );

      // Reverse Step 5: market_trade
      console.log('  📋 Reversing market_trade...');
      await queryRunner.query(
        `ALTER TABLE "market_trade" DROP CONSTRAINT IF EXISTS "market_trade_buyer_user_id_fkey"`,
      );
      await queryRunner.query(
        `ALTER TABLE "market_trade" DROP CONSTRAINT IF EXISTS "market_trade_seller_user_id_fkey"`,
      );
      await queryRunner.query(
        `ALTER TABLE "market_trade" RENAME COLUMN "buyer_user_id" TO "buyer_prosumer_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "market_trade" RENAME COLUMN "seller_user_id" TO "seller_prosumer_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "market_trade" ADD CONSTRAINT "market_trade_buyer_prosumer_id_fkey" 
         FOREIGN KEY ("buyer_prosumer_id") REFERENCES "prosumer"("prosumer_id")`,
      );
      await queryRunner.query(
        `ALTER TABLE "market_trade" ADD CONSTRAINT "market_trade_seller_prosumer_id_fkey" 
         FOREIGN KEY ("seller_prosumer_id") REFERENCES "prosumer"("prosumer_id")`,
      );

      // Reverse Step 4: transaction_log
      console.log('  📋 Reversing transaction_log...');
      await queryRunner.query(
        `ALTER TABLE "transaction_log" DROP CONSTRAINT IF EXISTS "transaction_log_user_id_fkey"`,
      );
      await queryRunner.query(
        `ALTER TABLE "transaction_log" RENAME COLUMN "user_id" TO "prosumer_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "transaction_log" ADD CONSTRAINT "transaction_log_prosumer_id_fkey" 
         FOREIGN KEY ("prosumer_id") REFERENCES "prosumer"("prosumer_id")`,
      );

      // Reverse Step 3: smart_meter
      console.log('  📋 Reversing smart_meter...');
      await queryRunner.query(
        `ALTER TABLE "smart_meter" DROP CONSTRAINT IF EXISTS "smart_meter_user_id_fkey"`,
      );
      await queryRunner.query(
        `ALTER TABLE "smart_meter" RENAME COLUMN "user_id" TO "prosumer_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "smart_meter" ADD CONSTRAINT "smart_meter_prosumer_id_fkey" 
         FOREIGN KEY ("prosumer_id") REFERENCES "prosumer"("prosumer_id")`,
      );

      // Reverse Step 2: wallet
      console.log('  📋 Reversing wallet...');
      await queryRunner.query(
        `ALTER TABLE "wallet" DROP CONSTRAINT IF EXISTS "wallet_user_id_fkey"`,
      );
      await queryRunner.query(
        `ALTER TABLE "wallet" RENAME COLUMN "user_id" TO "prosumer_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "wallet" ADD CONSTRAINT "wallet_prosumer_id_fkey" 
         FOREIGN KEY ("prosumer_id") REFERENCES "prosumer"("prosumer_id")`,
      );

      // Reverse Step 1: main table
      console.log('  📋 Reversing main table...');
      await queryRunner.query(
        `ALTER TABLE "user" RENAME COLUMN "user_id" TO "prosumer_id"`,
      );
      await queryRunner.query(`ALTER TABLE "user" RENAME TO "prosumer"`);

      console.log('✅ Rollback completed successfully!');
    } finally {
      // Re-enable constraints
      await queryRunner.query(`SET session_replication_role = 'origin'`);
    }
  }
}
