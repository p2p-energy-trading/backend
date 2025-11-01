import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop TRADE_ORDERS_CACHE table
 *
 * This table is no longer used as the system has migrated to Redis-based
 * order caching via TradeOrdersCacheRedisService for better performance.
 *
 * The PostgreSQL-based TradeOrdersCacheService has been deprecated and
 * all order data is now stored in Redis for faster read/write operations.
 */
export class DropTradeOrdersCacheTable1730476800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the TRADE_ORDERS_CACHE table
    await queryRunner.query(
      `DROP TABLE IF EXISTS "TRADE_ORDERS_CACHE" CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the table if rollback is needed
    // Note: This will create an empty table structure, data will not be restored
    await queryRunner.query(`
      CREATE TABLE "TRADE_ORDERS_CACHE" (
        "orderId" character varying NOT NULL,
        "prosumerId" character varying NOT NULL,
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
        CONSTRAINT "PK_TRADE_ORDERS_CACHE" PRIMARY KEY ("orderId")
      )
    `);

    // Recreate indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_TRADE_ORDERS_PROSUMER" ON "TRADE_ORDERS_CACHE" ("prosumerId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_TRADE_ORDERS_STATUS" ON "TRADE_ORDERS_CACHE" ("statusOnChain")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_TRADE_ORDERS_TYPE" ON "TRADE_ORDERS_CACHE" ("orderType")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_TRADE_ORDERS_WALLET" ON "TRADE_ORDERS_CACHE" ("walletAddress")
    `);
  }
}
