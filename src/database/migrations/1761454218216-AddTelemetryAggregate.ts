import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelemetryAggregate1761454218216 implements MigrationInterface {
  name = 'AddTelemetryAggregate1761454218216';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "telemetry_aggregates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "meterId" character varying(50) NOT NULL, "hourStart" TIMESTAMP WITH TIME ZONE NOT NULL, "dataPointsCount" integer NOT NULL DEFAULT '0', "batteryVoltageAvg" numeric(10,5), "batteryVoltageMin" numeric(10,5), "batteryVoltageMax" numeric(10,5), "batterySocAvg" numeric(10,5), "batterySocMin" numeric(10,5), "batterySocMax" numeric(10,5), "batteryChargeRateAvg" numeric(10,5), "exportPowerAvg" numeric(15,5), "exportPowerMax" numeric(15,5), "exportEnergyTotal" numeric(15,5), "importPowerAvg" numeric(15,5), "importPowerMax" numeric(15,5), "importEnergyTotal" numeric(15,5), "loadSmartPowerAvg" numeric(15,5), "loadSmartPowerMax" numeric(15,5), "loadSmartEnergyTotal" numeric(15,5), "loadHomePowerAvg" numeric(15,5), "loadHomePowerMax" numeric(15,5), "loadHomeEnergyTotal" numeric(15,5), "solarInputPowerAvg" numeric(15,5), "solarInputPowerMax" numeric(15,5), "solarInputEnergyTotal" numeric(15,5), "solarOutputPowerAvg" numeric(15,5), "solarOutputPowerMax" numeric(15,5), "solarOutputEnergyTotal" numeric(15,5), "netSolarPowerAvg" numeric(15,5), "netSolarEnergyTotal" numeric(15,5), "netGridPowerAvg" numeric(15,5), "netGridEnergyTotal" numeric(15,5), "wifiRssiAvg" integer, "mqttDisconnections" integer, "freeHeapAvg" bigint, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9e21be056b2e922b9727da6c656" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f10a714a7c920cc61aab041d99" ON "telemetry_aggregates" ("hourStart") `,
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
      `DROP INDEX "public"."IDX_f10a714a7c920cc61aab041d99"`,
    );
    await queryRunner.query(`DROP TABLE "telemetry_aggregates"`);
  }
}
