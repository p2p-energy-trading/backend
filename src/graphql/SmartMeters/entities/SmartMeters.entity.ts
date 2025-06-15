import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DeviceCommands } from '../../DeviceCommands/entities/DeviceCommands.entity';
import { DeviceHeartbeats } from '../../DeviceHeartbeats/entities/DeviceHeartbeats.entity';
import { DeviceStatusSnapshots } from '../../DeviceStatusSnapshots/entities/DeviceStatusSnapshots.entity';
import { EnergyReadings } from '../../EnergyReadings/entities/EnergyReadings.entity';
import { EnergyReadingsDetailed } from '../../EnergyReadingsDetailed/entities/EnergyReadingsDetailed.entity';
import { EnergySettlements } from '../../EnergySettlements/entities/EnergySettlements.entity';
import { MqttMessageLogs } from '../../MqttMessageLogs/entities/MqttMessageLogs.entity';
import { Prosumers } from '../../Prosumers/entities/Prosumers.entity';

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

  @OneToMany(
    () => DeviceCommands,
    (DeviceCommands) => DeviceCommands.smartmeters,
  )
  devicecommandsList: DeviceCommands[];

  @OneToMany(
    () => DeviceHeartbeats,
    (DeviceHeartbeats) => DeviceHeartbeats.smartmeters,
  )
  deviceheartbeatsList: DeviceHeartbeats[];

  @OneToMany(
    () => DeviceStatusSnapshots,
    (DeviceStatusSnapshots) => DeviceStatusSnapshots.smartmeters,
  )
  devicestatussnapshotsList: DeviceStatusSnapshots[];

  @OneToMany(
    () => EnergyReadings,
    (EnergyReadings) => EnergyReadings.smartmeters,
  )
  energyreadingsList: EnergyReadings[];

  @OneToMany(
    () => EnergyReadingsDetailed,
    (EnergyReadingsDetailed) => EnergyReadingsDetailed.smartmeters,
  )
  energyreadingsdetailedList: EnergyReadingsDetailed[];

  @OneToMany(
    () => EnergySettlements,
    (EnergySettlements) => EnergySettlements.smartmeters,
  )
  energysettlementsList: EnergySettlements[];

  @OneToMany(
    () => MqttMessageLogs,
    (MqttMessageLogs) => MqttMessageLogs.smartmeters,
  )
  mqttmessagelogsList: MqttMessageLogs[];

  @ManyToOne(() => Prosumers)
  @JoinColumn({ name: 'prosumer_id' })
  prosumers: Prosumers;
}
