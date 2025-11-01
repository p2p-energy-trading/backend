import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SmartMeter } from '../smartMeter/smartMeter.entity';
import { TransactionLog } from '../transactionLog/transactionLog.entity';

// Removed import for unused entity (replaced by Redis):
// - MqttMessageLogs

@Entity('energy_settlement')
export class EnergySettlement {
  @PrimaryGeneratedColumn({ name: 'settlement_id' })
  settlementId: number;

  @Column({ type: 'varchar', name: 'meter_id' })
  meterId: string;

  @Column({ type: 'timestamp', name: 'period_start_time' })
  periodStartTime: Date;

  @Column({ type: 'timestamp', name: 'period_end_time' })
  periodEndTime: Date;

  @Column({ type: 'decimal', name: 'net_wh_from_grid' })
  netWhFromGrid: number;

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

  @Column({ type: 'decimal', name: 'raw_export_wh', nullable: true })
  rawExportWh: number;

  @Column({ type: 'decimal', name: 'raw_import_wh', nullable: true })
  rawImportWh: number;

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

  @ManyToOne(() => SmartMeter)
  @JoinColumn({ name: 'meter_id' })
  smartmeters: SmartMeter;

  // Removed ManyToOne relation for unused entity (replaced by Redis):
  // @ManyToOne(() => MqttMessageLogs)
  // @JoinColumn({ name: 'mqtt_message_id' })
  // mqttmessagelogs: MqttMessageLogs;

  @OneToMany(
    () => TransactionLog,
    (TransactionLogs) => TransactionLogs.energysettlements,
  )
  transactionlogsList: TransactionLog[];
}
