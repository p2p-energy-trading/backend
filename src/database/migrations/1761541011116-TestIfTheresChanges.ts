import { MigrationInterface, QueryRunner } from 'typeorm';

export class TestIfTheresChanges1761541011116 implements MigrationInterface {
  name = 'TestIfTheresChanges1761541011116';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "mqtt_message_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "mqtt_message_id" character varying`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6f42afcdb47cb7077f4074198d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_aggregates" DROP CONSTRAINT "PK_telemetry_aggregates"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_aggregates" ADD CONSTRAINT "PK_telemetry_aggregates" PRIMARY KEY ("id", "hourStart")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6f42afcdb47cb7077f4074198d" ON "telemetry_aggregates" ("meterId", "hourStart") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6f42afcdb47cb7077f4074198d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_aggregates" DROP CONSTRAINT "PK_telemetry_aggregates"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_aggregates" ADD CONSTRAINT "PK_telemetry_aggregates" PRIMARY KEY ("id", "hourStart")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6f42afcdb47cb7077f4074198d" ON "telemetry_aggregates" ("hourStart", "meterId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "mqtt_message_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "mqtt_message_id" integer`,
    );
  }
}
