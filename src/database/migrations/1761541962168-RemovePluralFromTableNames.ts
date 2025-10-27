import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePluralFromTableNames1761541962168
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename tables to remove plural 's' suffix

    // 1. telemetry_aggregates -> telemetry_aggregate
    await queryRunner.query(
      `ALTER TABLE "telemetry_aggregates" RENAME TO "telemetry_aggregate"`,
    );

    // 2. energy_settlements -> energy_settlement
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" RENAME TO "energy_settlement"`,
    );

    // 3. idrs_conversions -> idrs_conversion
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" RENAME TO "idrs_conversion"`,
    );

    // 4. market_trades -> market_trade
    await queryRunner.query(
      `ALTER TABLE "market_trades" RENAME TO "market_trade"`,
    );

    // 5. prosumers -> prosumer
    await queryRunner.query(`ALTER TABLE "prosumers" RENAME TO "prosumer"`);

    // 6. smart_meters -> smart_meter
    await queryRunner.query(
      `ALTER TABLE "smart_meters" RENAME TO "smart_meter"`,
    );

    // 7. transaction_logs -> transaction_log
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" RENAME TO "transaction_log"`,
    );

    // 8. wallets -> wallet
    await queryRunner.query(`ALTER TABLE "wallets" RENAME TO "wallet"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: restore plural 's' suffix

    // 1. telemetry_aggregate -> telemetry_aggregates
    await queryRunner.query(
      `ALTER TABLE "telemetry_aggregate" RENAME TO "telemetry_aggregates"`,
    );

    // 2. energy_settlement -> energy_settlements
    await queryRunner.query(
      `ALTER TABLE "energy_settlement" RENAME TO "energy_settlements"`,
    );

    // 3. idrs_conversion -> idrs_conversions
    await queryRunner.query(
      `ALTER TABLE "idrs_conversion" RENAME TO "idrs_conversions"`,
    );

    // 4. market_trade -> market_trades
    await queryRunner.query(
      `ALTER TABLE "market_trade" RENAME TO "market_trades"`,
    );

    // 5. prosumer -> prosumers
    await queryRunner.query(`ALTER TABLE "prosumer" RENAME TO "prosumers"`);

    // 6. smart_meter -> smart_meters
    await queryRunner.query(
      `ALTER TABLE "smart_meter" RENAME TO "smart_meters"`,
    );

    // 7. transaction_log -> transaction_logs
    await queryRunner.query(
      `ALTER TABLE "transaction_log" RENAME TO "transaction_logs"`,
    );

    // 8. wallet -> wallets
    await queryRunner.query(`ALTER TABLE "wallet" RENAME TO "wallets"`);
  }
}
