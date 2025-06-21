import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  } from 'typeorm';
import { SmartMeters } from '../../SmartMeters/entities/SmartMeters.entity';

@Entity()
export class EnergyReadings {
  @PrimaryGeneratedColumn({ name: 'reading_id' })
  readingId: number;

  @Column({ type: 'varchar', name: 'meter_id' })
  meterId: string;

  @Column({ type: 'timestamp', name: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'decimal', name: 'voltage', nullable: true })
  voltage: number;

  @Column({ type: 'decimal', name: 'current_amp', nullable: true })
  currentAmp: number;

  @Column({ type: 'decimal', name: 'power_kw', nullable: true })
  powerKw: number;

  @Column({ type: 'varchar', name: 'flow_direction' })
  flowDirection: string;

  @ManyToOne(() => SmartMeters)
  @JoinColumn({ name: 'meter_id' })
  smartmeters: SmartMeters;
}
