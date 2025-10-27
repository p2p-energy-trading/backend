import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Hourly aggregated telemetry data for efficient storage and querying
 * Retention: 1 year, then archived to CSV in blob storage
 */
@Entity('telemetry_aggregate')
@Index(['meterId', 'hourStart']) // For efficient time-range queries
@Index(['hourStart']) // For archival queries
export class TelemetryAggregate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  meterId: string;

  @Column({ type: 'timestamp with time zone' })
  hourStart: Date; // Start of the hour (e.g., 2025-10-26 04:00:00)

  @Column({ type: 'int', default: 0 })
  dataPointsCount: number; // Number of samples aggregated

  // Battery metrics
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
    default: null,
  })
  batteryVoltageAvg: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
    default: null,
  })
  batteryVoltageMin: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
    default: null,
  })
  batteryVoltageMax: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
    default: null,
  })
  batterySocAvg: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
    default: null,
  })
  batterySocMin: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
    default: null,
  })
  batterySocMax: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
    default: null,
  })
  batteryChargeRateAvg: number | null;

  // Export metrics (energy sold to grid)
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  exportPowerAvg: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  exportPowerMax: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  exportEnergyTotal: number | null; // Total Wh exported in this hour

  // Import metrics (energy bought from grid)
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  importPowerAvg: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  importPowerMax: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  importEnergyTotal: number | null; // Total Wh imported in this hour

  // Load Smart Meter metrics
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  loadSmartPowerAvg: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  loadSmartPowerMax: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  loadSmartEnergyTotal: number | null;

  // Load Home metrics
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  loadHomePowerAvg: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  loadHomePowerMax: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  loadHomeEnergyTotal: number | null;

  // Solar Input metrics
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  solarInputPowerAvg: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  solarInputPowerMax: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  solarInputEnergyTotal: number | null;

  // Solar Output metrics
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  solarOutputPowerAvg: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  solarOutputPowerMax: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  solarOutputEnergyTotal: number | null;

  // Net Solar (generation - load)
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  netSolarPowerAvg: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  netSolarEnergyTotal: number | null;

  // Net Grid (export - import)
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  netGridPowerAvg: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 5,
    nullable: true,
    default: null,
  })
  netGridEnergyTotal: number | null;

  // Connectivity metrics
  @Column({ type: 'int', nullable: true, default: null })
  wifiRssiAvg: number | null;

  @Column({ type: 'int', nullable: true, default: null })
  mqttDisconnections: number | null; // Count of MQTT disconnections in this hour

  @Column({ type: 'bigint', nullable: true, default: null })
  freeHeapAvg: number | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
