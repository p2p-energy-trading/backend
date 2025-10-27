import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTelemetryTable1761541252880 implements MigrationInterface {
  name = 'DropTelemetryTable1761541252880';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop telemetry_data table (replaced by Redis + telemetry_aggregates)
    await queryRunner.query(`DROP TABLE IF EXISTS "telemetry_data"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate telemetry_data table if rollback is needed
    await queryRunner.query(`
            CREATE TABLE "telemetry_data" (
                "id" SERIAL NOT NULL,
                "meterId" character varying NOT NULL,
                "datetime" TIMESTAMP NOT NULL,
                "data" jsonb NOT NULL,
                CONSTRAINT "PK_5869a8f8f281ae50220a1ffdb51" PRIMARY KEY ("id")
            )
        `);

    // Recreate index for performance
    await queryRunner.query(`
            CREATE INDEX "IDX_telemetry_data_meter_datetime" 
            ON "telemetry_data" ("meterId", "datetime")
        `);
  }
}
