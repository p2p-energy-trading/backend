import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SmartMeters } from '../../SmartMeters/entities/SmartMeters.entity';

@Entity()
export class DeviceHeartbeats {
  @PrimaryGeneratedColumn({ name: 'heartbeat_id' })
  heartbeatId: number;

  @Column({ type: 'varchar', name: 'meter_id' })
  meterId: string;

  @Column({ type: 'timestamp', name: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'varchar', name: 'uptime_seconds', nullable: true })
  uptimeSeconds: string;

  @Column({ type: 'varchar', name: 'free_heap_bytes', nullable: true })
  freeHeapBytes: string;

  @Column({ type: 'int', name: 'signal_strength', nullable: true })
  signalStrength: number;

  @Column({ type: 'varchar', name: 'additional_metrics', nullable: true })
  additionalMetrics: string;

  @ManyToOne(() => SmartMeters)
  @JoinColumn({ name: 'meter_id' })
  smartmeters: SmartMeters;
}
