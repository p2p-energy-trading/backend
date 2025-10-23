import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';

@Entity()
export class DeviceStatusSnapshots {
  @PrimaryGeneratedColumn({ name: 'snapshot_id' })
  snapshotId: number;

  @Column({ type: 'varchar', name: 'meter_id' })
  meterId: string;

  @Column({ type: 'timestamp', name: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'varchar', name: 'wifi_status', nullable: true })
  wifiStatus: string;

  @Column({ type: 'varchar', name: 'mqtt_status', nullable: true })
  mqttStatus: string;

  @Column({ type: 'varchar', name: 'grid_mode', nullable: true })
  gridMode: string;

  @Column({ type: 'varchar', name: 'system_status', nullable: true })
  systemStatus: string;

  @Column({ type: 'varchar', name: 'component_status', nullable: true })
  componentStatus: string;

  @Column({ type: 'varchar', name: 'raw_payload' })
  rawPayload: string;

  @ManyToOne(() => SmartMeters)
  @JoinColumn({ name: 'meter_id' })
  smartmeters: SmartMeters;
}
