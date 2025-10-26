import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop unused tables that have been replaced by Redis-based telemetry system
 *
 * Tables being dropped:
 * 1. energy_readings_detailed - Replaced by Redis latest data
 * 2. mqtt_message_logs - MQTT logging now optional/disabled
 * 3. device_status_snapshots - Status data now in Redis
 * 4. device_commands - Command tracking now optional/simplified
 *
 * Note: This is a destructive operation. Make sure to backup data if needed.
 */
export class DropUnusedTables1761473245402 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse dependency order

    // 1. Drop energy_readings_detailed table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "energy_readings_detailed" CASCADE;
    `);

    // 2. Drop mqtt_message_logs table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "mqtt_message_logs" CASCADE;
    `);

    // 3. Drop device_status_snapshots table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "device_status_snapshots" CASCADE;
    `);

    // 4. Drop device_commands table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "device_commands" CASCADE;
    `);

    console.log('✅ Dropped unused tables successfully');
    console.log('   - energy_readings_detailed');
    console.log('   - mqtt_message_logs');
    console.log('   - device_status_snapshots');
    console.log('   - device_commands');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Recreate tables with basic structure
    // Note: Data will be lost, this is for structure rollback only

    // 1. Recreate device_commands
    await queryRunner.query(`
      CREATE TABLE "device_commands" (
        "command_id" SERIAL PRIMARY KEY,
        "meter_id" VARCHAR(50) NOT NULL,
        "command_type" VARCHAR(50) NOT NULL,
        "command_payload" JSONB NOT NULL,
        "correlation_id" VARCHAR(100),
        "status" VARCHAR(20) DEFAULT 'PENDING',
        "sent_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "acknowledged_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX "IDX_device_commands_meter" ON "device_commands" ("meter_id");
      CREATE INDEX "IDX_device_commands_correlation" ON "device_commands" ("correlation_id");
    `);

    // 2. Recreate device_status_snapshots
    await queryRunner.query(`
      CREATE TABLE "device_status_snapshots" (
        "snapshot_id" SERIAL PRIMARY KEY,
        "meter_id" VARCHAR(50) NOT NULL,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status_data" JSONB NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX "IDX_device_status_meter_timestamp" ON "device_status_snapshots" ("meter_id", "timestamp");
    `);

    // 3. Recreate mqtt_message_logs
    await queryRunner.query(`
      CREATE TABLE "mqtt_message_logs" (
        "log_id" SERIAL PRIMARY KEY,
        "meter_id" VARCHAR(50),
        "topic_type" VARCHAR(50),
        "direction" VARCHAR(20),
        "mqtt_topic" VARCHAR(255) NOT NULL,
        "payload" JSONB,
        "raw_message" TEXT,
        "message_timestamp" TIMESTAMP WITH TIME ZONE,
        "processed_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "processing_status" VARCHAR(20) DEFAULT 'SUCCESS',
        "error_message" TEXT,
        "correlation_id" VARCHAR(100)
      );
      CREATE INDEX "IDX_mqtt_logs_meter" ON "mqtt_message_logs" ("meter_id");
      CREATE INDEX "IDX_mqtt_logs_timestamp" ON "mqtt_message_logs" ("message_timestamp");
    `);

    // 4. Recreate energy_readings_detailed
    await queryRunner.query(`
      CREATE TABLE "energy_readings_detailed" (
        "reading_id" SERIAL PRIMARY KEY,
        "meter_id" VARCHAR(50) NOT NULL,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
        "subsystem" VARCHAR(50) NOT NULL,
        "voltage_v" NUMERIC(10, 5),
        "current_ma" NUMERIC(10, 5),
        "current_power_w" NUMERIC(15, 5),
        "daily_energy_wh" NUMERIC(15, 5),
        "total_energy_wh" NUMERIC(15, 5),
        "settlement_energy_wh" NUMERIC(15, 5),
        "subsystem_data" JSONB,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX "IDX_energy_detailed_meter_timestamp" ON "energy_readings_detailed" ("meter_id", "timestamp");
      CREATE INDEX "IDX_energy_detailed_subsystem" ON "energy_readings_detailed" ("subsystem");
    `);

    console.log('⚠️  Tables recreated (empty - data not restored)');
  }
}
