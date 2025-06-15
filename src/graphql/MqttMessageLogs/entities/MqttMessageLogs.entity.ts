import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EnergySettlements } from '../../EnergySettlements/entities/EnergySettlements.entity';
import { SmartMeters } from '../../SmartMeters/entities/SmartMeters.entity';

@Entity()
export class MqttMessageLogs {
  @PrimaryGeneratedColumn({ name: 'log_id' })
  logId: number;

  @Column({ type: 'varchar', name: 'meter_id' })
  meterId: string;

  @Column({ type: 'varchar', name: 'topic_type' })
  topicType: string;

  @Column({ type: 'varchar', name: 'direction' })
  direction: string;

  @Column({ type: 'varchar', name: 'mqtt_topic' })
  mqttTopic: string;

  @Column({ type: 'varchar', name: 'payload' })
  payload: string;

  @Column({ type: 'varchar', name: 'raw_message', nullable: true })
  rawMessage: string;

  @Column({ type: 'timestamp', name: 'message_timestamp' })
  messageTimestamp: Date;

  @Column({ type: 'timestamp', name: 'processed_at', nullable: true })
  processedAt: Date;

  @Column({ type: 'varchar', name: 'processing_status', nullable: true })
  processingStatus: string;

  @Column({ type: 'varchar', name: 'error_message', nullable: true })
  errorMessage: string;

  @Column({ type: 'varchar', name: 'correlation_id', nullable: true })
  correlationId: string;

  @OneToMany(
    () => EnergySettlements,
    (EnergySettlements) => EnergySettlements.mqttmessagelogs,
  )
  energysettlementsList: EnergySettlements[];

  @ManyToOne(() => SmartMeters)
  @JoinColumn({ name: 'meter_id' })
  smartmeters: SmartMeters;
}
