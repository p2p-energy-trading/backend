import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';

@Entity()
export class EnergyReadingsDetailed {
  @PrimaryGeneratedColumn({ name: 'reading_id' })
  readingId: number;

  @Column({ type: 'varchar', name: 'meter_id' })
  meterId: string;

  @Column({ type: 'timestamp', name: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'varchar', name: 'subsystem' })
  subsystem: string;

  @Column({ type: 'decimal', name: 'daily_energy_wh', nullable: true })
  dailyEnergyWh: number;

  @Column({ type: 'decimal', name: 'total_energy_wh', nullable: true })
  totalEnergyWh: number;

  @Column({ type: 'decimal', name: 'settlement_energy_wh', nullable: true })
  settlementEnergyWh: number;

  @Column({ type: 'decimal', name: 'current_power_w', nullable: true })
  currentPowerW: number;

  @Column({ type: 'decimal', name: 'voltage', nullable: true })
  voltage: number;

  @Column({ type: 'decimal', name: 'current_amp', nullable: true })
  currentAmp: number;

  @Column({ type: 'varchar', name: 'subsystem_data', nullable: true })
  subsystemData: string;

  @Column({ type: 'varchar', name: 'raw_payload' })
  rawPayload: string;

  @ManyToOne(() => SmartMeters)
  @JoinColumn({ name: 'meter_id' })
  smartmeters: SmartMeters;
}
