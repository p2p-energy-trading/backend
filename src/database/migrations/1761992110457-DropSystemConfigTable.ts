import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSystemConfigTable1761992110457 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the system_config table
    await queryRunner.query(`DROP TABLE IF EXISTS "system_config" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the system_config table if rollback is needed
    await queryRunner.query(`
      CREATE TABLE "system_config" (
        "config_key" character varying NOT NULL,
        "config_value" text NOT NULL,
        "description" character varying,
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_system_config" PRIMARY KEY ("config_key")
      )
    `);

    // Insert default configuration values if needed
    await queryRunner.query(`
      INSERT INTO "system_config" ("config_key", "config_value", "description", "updated_at")
      VALUES
        ('ETK_CONTRACT_ADDRESS', '0x0000000000000000000000000000000000000000', 'Energy Token Contract Address', now()),
        ('IDRS_CONTRACT_ADDRESS', '0x0000000000000000000000000000000000000000', 'IDRS Token Contract Address', now()),
        ('MARKET_CONTRACT_ADDRESS', '0x0000000000000000000000000000000000000000', 'Market Contract Address', now()),
        ('ENERGY_CONVERTER_CONTRACT_ADDRESS', '0x0000000000000000000000000000000000000000', 'Energy Converter Contract Address', now()),
        ('SETTLEMENT_INTERVAL_MINUTES', '5', 'Settlement interval in minutes', now()),
        ('KWH_TO_ETK_RATIO', '1', 'kWh to ETK conversion ratio', now())
    `);
  }
}
