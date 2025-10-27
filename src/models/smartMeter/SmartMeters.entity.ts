import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EnergySettlements } from '../energySettlement/energySettlement.entity';
import { Prosumers } from '../prosumer/user.entity';

// Removed imports for unused entities (replaced by Redis):
// - DeviceCommands
// - DeviceStatusSnapshots
// - EnergyReadingsDetailed
// - MqttMessageLogs

@Entity()
export class SmartMeters {
  @PrimaryColumn({ type: 'varchar', name: 'meter_id' })
  meterId: string;

  @Column({ type: 'varchar', name: 'prosumer_id' })
  prosumerId: string;

  @Column({ type: 'varchar', name: 'meter_blockchain_address', nullable: true })
  meterBlockchainAddress: string;

  @Column({ type: 'varchar', name: 'location', nullable: true })
  location: string;

  @Column({ type: 'varchar', name: 'status', nullable: true })
  status: string;

  @Column({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', name: 'last_seen', nullable: true })
  lastSeen: Date;

  @Column({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar', name: 'mqtt_topic_realtime', nullable: true })
  mqttTopicRealtime: string;

  @Column({ type: 'varchar', name: 'mqtt_topic_settlement', nullable: true })
  mqttTopicSettlement: string;

  @Column({ type: 'int', name: 'settlement_interval_minutes', nullable: true })
  settlementIntervalMinutes: number;

  @Column({ type: 'varchar', name: 'firmware_version', nullable: true })
  firmwareVersion: string;

  @Column({ type: 'timestamp', name: 'last_settlement_at', nullable: true })
  lastSettlementAt: Date;

  @Column({ type: 'varchar', name: 'device_configuration', nullable: true })
  deviceConfiguration: string;

  @Column({ type: 'timestamp', name: 'last_heartbeat_at', nullable: true })
  lastHeartbeatAt: Date;

  @Column({ type: 'varchar', name: 'device_model', nullable: true })
  deviceModel: string;

  @Column({ type: 'varchar', name: 'device_version', nullable: true })
  deviceVersion: string;

  @Column({ type: 'varchar', name: 'capabilities', nullable: true })
  capabilities: string;

  // Removed OneToMany relations for unused entities (replaced by Redis):
  // - devicecommandsList
  // - devicestatussnapshotsList
  // - energyreadingsdetailedList
  // - mqttmessagelogsList

  @OneToMany(
    () => EnergySettlements,
    (EnergySettlements) => EnergySettlements.smartmeters,
  )
  energysettlementsList: EnergySettlements[];

  @ManyToOne(() => Prosumers)
  @JoinColumn({ name: 'prosumer_id' })
  prosumers: Prosumers;
}
