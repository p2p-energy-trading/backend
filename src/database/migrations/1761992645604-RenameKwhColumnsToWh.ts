import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameKwhColumnsToWh1761992645604 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename columns from kWh to Wh in energy_settlement table
    // Note: Data values remain the same (still in kWh), only column names change for clarity
    // Backend will convert Wh to kWh when storing (value / 1000)

    await queryRunner.query(
      `ALTER TABLE "energy_settlement" RENAME COLUMN "net_kwh_from_grid" TO "net_wh_from_grid"`,
    );

    await queryRunner.query(
      `ALTER TABLE "energy_settlement" RENAME COLUMN "raw_export_kwh" TO "raw_export_wh"`,
    );

    await queryRunner.query(
      `ALTER TABLE "energy_settlement" RENAME COLUMN "raw_import_kwh" TO "raw_import_wh"`,
    );

    // Add comments to clarify the unit
    await queryRunner.query(
      `COMMENT ON COLUMN "energy_settlement"."net_wh_from_grid" IS 'Net energy from grid in Watt-hours (Wh)'`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "energy_settlement"."raw_export_wh" IS 'Raw export energy in Watt-hours (Wh)'`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "energy_settlement"."raw_import_wh" IS 'Raw import energy in Watt-hours (Wh)'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert column names back to kWh
    await queryRunner.query(
      `ALTER TABLE "energy_settlement" RENAME COLUMN "net_wh_from_grid" TO "net_kwh_from_grid"`,
    );

    await queryRunner.query(
      `ALTER TABLE "energy_settlement" RENAME COLUMN "raw_export_wh" TO "raw_export_kwh"`,
    );

    await queryRunner.query(
      `ALTER TABLE "energy_settlement" RENAME COLUMN "raw_import_wh" TO "raw_import_kwh"`,
    );

    // Remove comments
    await queryRunner.query(
      `COMMENT ON COLUMN "energy_settlement"."net_kwh_from_grid" IS NULL`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "energy_settlement"."raw_export_kwh" IS NULL`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "energy_settlement"."raw_import_kwh" IS NULL`,
    );
  }
}
