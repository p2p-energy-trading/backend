import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetupTimescaleDB1761470060653 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enable TimescaleDB extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS timescaledb;`);

    // 2. Drop existing primary key and create composite primary key including hourStart
    // TimescaleDB requires the time column to be part of the primary key
    await queryRunner.query(`
      ALTER TABLE telemetry_aggregates DROP CONSTRAINT "PK_9e21be056b2e922b9727da6c656";
    `);

    await queryRunner.query(`
      ALTER TABLE telemetry_aggregates 
      ADD CONSTRAINT "PK_telemetry_aggregates" PRIMARY KEY (id, "hourStart");
    `);

    // 3. Convert telemetry_aggregates to hypertable
    // This must be done AFTER the table exists and primary key is fixed
    // Check if it's already a hypertable first
    const isHypertable = await queryRunner.query(`
      SELECT 1 FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'telemetry_aggregates';
    `);

    if (isHypertable.length === 0) {
      await queryRunner.query(`
        SELECT create_hypertable(
          'telemetry_aggregates', 
          'hourStart',
          chunk_time_interval => INTERVAL '7 days',
          if_not_exists => TRUE
        );
      `);
    }

    // 4. Setup compression on the hypertable
    await queryRunner.query(`
      ALTER TABLE telemetry_aggregates SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = '"meterId"',
        timescaledb.compress_orderby = '"hourStart" DESC'
      );
    `);

    // 5. Add compression policy - compress chunks older than 7 days
    await queryRunner.query(`
      SELECT add_compression_policy(
        'telemetry_aggregates', 
        INTERVAL '7 days',
        if_not_exists => TRUE
      );
    `);

    // 6. Add retention policy - automatically drop chunks older than 5 years
    await queryRunner.query(`
      SELECT add_retention_policy(
        'telemetry_aggregates', 
        INTERVAL '5 years',
        if_not_exists => TRUE
      );
    `);

    // 7. Create continuous aggregate for hourly stats (optional but recommended)
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_daily_summary
      WITH (timescaledb.continuous) AS
      SELECT 
        "meterId",
        time_bucket('1 day', "hourStart") AS day_start,
        AVG("batteryVoltageAvg") as battery_voltage_avg,
        AVG("batterySocAvg") as battery_soc_avg,
        SUM("exportEnergyTotal") as export_energy_total,
        SUM("importEnergyTotal") as import_energy_total,
        SUM("loadSmartEnergyTotal") as load_smart_energy_total,
        SUM("loadHomeEnergyTotal") as load_home_energy_total,
        SUM("solarInputEnergyTotal") as solar_input_energy_total,
        SUM("solarOutputEnergyTotal") as solar_output_energy_total,
        SUM("netSolarEnergyTotal") as net_solar_energy_total,
        SUM("netGridEnergyTotal") as net_grid_energy_total,
        AVG("wifiRssiAvg") as wifi_rssi_avg,
        SUM("mqttDisconnections") as mqtt_disconnections,
        COUNT(*) as data_points
      FROM telemetry_aggregates
      GROUP BY "meterId", day_start
      WITH NO DATA;
    `);

    // 8. Add refresh policy for continuous aggregate
    await queryRunner.query(`
      SELECT add_continuous_aggregate_policy(
        'telemetry_daily_summary',
        start_offset => INTERVAL '3 days',
        end_offset => INTERVAL '1 hour',
        schedule_interval => INTERVAL '1 hour',
        if_not_exists => TRUE
      );
    `);

    console.log('✅ TimescaleDB setup completed successfully!');
    console.log('📊 Hypertable created: telemetry_aggregates');
    console.log('🗜️  Compression enabled: auto-compress after 7 days');
    console.log('🗑️  Retention policy: auto-delete after 5 years');
    console.log('📈 Continuous aggregate: telemetry_daily_summary');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove continuous aggregate policy
    await queryRunner.query(`
      SELECT remove_continuous_aggregate_policy('telemetry_daily_summary', if_exists => TRUE);
    `);

    // Drop continuous aggregate
    await queryRunner.query(
      `DROP MATERIALIZED VIEW IF EXISTS telemetry_daily_summary;`,
    );

    // Remove retention policy
    await queryRunner.query(`
      SELECT remove_retention_policy('telemetry_aggregates', if_exists => TRUE);
    `);

    // Remove compression policy
    await queryRunner.query(`
      SELECT remove_compression_policy('telemetry_aggregates', if_exists => TRUE);
    `);

    // Note: Cannot easily revert hypertable to regular table
    // Would need to create new table and copy data
    console.log(
      '⚠️  Warning: Hypertable not reverted. Manual intervention needed if required.',
    );

    // Optionally drop extension (be careful in production!)
    // await queryRunner.query(`DROP EXTENSION IF EXISTS timescaledb CASCADE;`);
  }
}
