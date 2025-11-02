import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop trade_orders_cache table
 *
 * This table is no longer used as the system has migrated to Redis-based
 * order caching via TradeOrdersCacheRedisService for better performance.
 *
 * The PostgreSQL-based TradeOrdersCacheService has been deprecated and
 * all order data is now stored in Redis for faster read/write operations.
 */
export class DropTradeOrdersCacheTable1761576800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the trade_orders_cache table
    await queryRunner.query(
      `DROP TABLE IF EXISTS "trade_orders_cache" CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the table if rollback is needed
    // Note: This will create an empty table structure, data will not be restored
    await queryRunner.query(`
      CREATE TABLE "trade_orders_cache" (
        "orderId" character varying NOT NULL,
        "userId" character varying NOT NULL,
        "walletAddress" character varying NOT NULL,
        "orderType" character varying NOT NULL,
        "pair" character varying NOT NULL,
        "amountEtk" numeric(18,8) NOT NULL,
        "priceIdrsPerEtk" numeric(18,8) NOT NULL,
        "totalIdrsValue" numeric(18,8) NOT NULL,
        "statusOnChain" character varying NOT NULL,
        "createdAtOnChain" TIMESTAMP NOT NULL,
        "updatedAtCache" TIMESTAMP NOT NULL DEFAULT now(),
        "blockchainTxHashPlaced" character varying,
        "blockchainTxHashFilled" character varying,
        "blockchainTxHashCancelled" character varying,
        CONSTRAINT "PK_trade_orders_cache" PRIMARY KEY ("orderId")
      )
    `);

    // Recreate indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_TRADE_ORDERS_PROSUMER" ON "trade_orders_cache" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_TRADE_ORDERS_STATUS" ON "trade_orders_cache" ("statusOnChain")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_TRADE_ORDERS_TYPE" ON "trade_orders_cache" ("orderType")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_TRADE_ORDERS_WALLET" ON "trade_orders_cache" ("walletAddress")
    `);
  }
}
