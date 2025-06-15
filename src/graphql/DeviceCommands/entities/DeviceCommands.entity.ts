import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SmartMeters } from '../../SmartMeters/entities/SmartMeters.entity';
import { Prosumers } from '../../Prosumers/entities/Prosumers.entity';

@Entity()
export class DeviceCommands {
  @PrimaryGeneratedColumn({ name: 'command_id' })
  commandId: number;

  @Column({ type: 'varchar', name: 'meter_id' })
  meterId: string;

  @Column({ type: 'varchar', name: 'command_type' })
  commandType: string;

  @Column({ type: 'varchar', name: 'command_payload' })
  commandPayload: string;

  @Column({ type: 'varchar', name: 'correlation_id' })
  correlationId: string;

  @Column({ type: 'varchar', name: 'status' })
  status: string;

  @Column({ type: 'timestamp', name: 'sent_at' })
  sentAt: Date;

  @Column({ type: 'timestamp', name: 'acknowledged_at', nullable: true })
  acknowledgedAt: Date;

  @Column({ type: 'timestamp', name: 'timeout_at', nullable: true })
  timeoutAt: Date;

  @Column({ type: 'varchar', name: 'response_payload', nullable: true })
  responsePayload: string;

  @Column({ type: 'varchar', name: 'error_details', nullable: true })
  errorDetails: string;

  @Column({ type: 'varchar', name: 'sent_by_user', nullable: true })
  sentByUser: string;

  @ManyToOne(() => SmartMeters)
  @JoinColumn({ name: 'meter_id' })
  smartmeters: SmartMeters;

  @ManyToOne(() => Prosumers)
  @JoinColumn({ name: 'sent_by_user' })
  prosumers: Prosumers;
}
