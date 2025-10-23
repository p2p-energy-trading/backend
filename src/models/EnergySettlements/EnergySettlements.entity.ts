import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';
import { MqttMessageLogs } from '../MqttMessageLogs/MqttMessageLogs.entity';
import { TransactionLogs } from '../TransactionLogs/TransactionLogs.entity';

@Entity()
export class EnergySettlements {
  @PrimaryGeneratedColumn({ name: 'settlement_id' })
  settlementId: number;

  @Column({ type: 'varchar', name: 'meter_id' })
  meterId: string;

  @Column({ type: 'timestamp', name: 'period_start_time' })
  periodStartTime: Date;

  @Column({ type: 'timestamp', name: 'period_end_time' })
  periodEndTime: Date;

  @Column({ type: 'decimal', name: 'net_kwh_from_grid' })
  netKwhFromGrid: number;

  @Column({ type: 'decimal', name: 'etk_amount_credited', nullable: true })
  etkAmountCredited: number;

  @Column({ type: 'varchar', name: 'blockchain_tx_hash', nullable: true })
  blockchainTxHash: string;

  @Column({ type: 'varchar', name: 'status' })
  status: string;

  @Column({ type: 'timestamp', name: 'created_at_backend' })
  createdAtBackend: Date;

  @Column({ type: 'timestamp', name: 'confirmed_at_on_chain', nullable: true })
  confirmedAtOnChain: Date;

  @Column({ type: 'varchar', name: 'settlement_trigger' })
  settlementTrigger: string;

  @Column({ type: 'decimal', name: 'raw_export_kwh', nullable: true })
  rawExportKwh: number;

  @Column({ type: 'decimal', name: 'raw_import_kwh', nullable: true })
  rawImportKwh: number;

  @Column({ type: 'varchar', name: 'validation_status', nullable: true })
  validationStatus: string;

  @Column({ type: 'varchar', name: 'settlement_data_source', nullable: true })
  settlementDataSource: string;

  @Column({
    type: 'varchar',
    name: 'detailed_energy_breakdown',
    nullable: true,
  })
  detailedEnergyBreakdown: object;

  @Column({ type: 'varchar', name: 'mqtt_message_id', nullable: true })
  mqttMessageId: number;

  @ManyToOne(() => SmartMeters)
  @JoinColumn({ name: 'meter_id' })
  smartmeters: SmartMeters;

  @ManyToOne(() => MqttMessageLogs)
  @JoinColumn({ name: 'mqtt_message_id' })
  mqttmessagelogs: MqttMessageLogs;

  @OneToMany(
    () => TransactionLogs,
    (TransactionLogs) => TransactionLogs.energysettlements,
  )
  transactionlogsList: TransactionLogs[];
}
