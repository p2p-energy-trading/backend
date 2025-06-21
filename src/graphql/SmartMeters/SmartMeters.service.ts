import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SmartMeters } from './entities/SmartMeters.entity';
import { CreateSmartMetersInput } from './dto/SmartMeters.input';
import { SmartMetersArgs } from './dto/SmartMeters.args';
import { DeviceCommands } from '../DeviceCommands/entities/DeviceCommands.entity';
import { DeviceStatusSnapshots } from '../DeviceStatusSnapshots/entities/DeviceStatusSnapshots.entity';
import { EnergyReadingsDetailed } from '../EnergyReadingsDetailed/entities/EnergyReadingsDetailed.entity';
import { EnergySettlements } from '../EnergySettlements/entities/EnergySettlements.entity';
import { MqttMessageLogs } from '../MqttMessageLogs/entities/MqttMessageLogs.entity';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';

@Injectable()
export class SmartMetersService {
  constructor(
    @InjectRepository(SmartMeters)
    private readonly repo: Repository<SmartMeters>,
    @InjectRepository(DeviceCommands)
    private readonly DeviceCommandsRepo: Repository<DeviceCommands>,
    @InjectRepository(DeviceStatusSnapshots)
    private readonly DeviceStatusSnapshotsRepo: Repository<DeviceStatusSnapshots>,
    @InjectRepository(EnergyReadingsDetailed)
    private readonly EnergyReadingsDetailedRepo: Repository<EnergyReadingsDetailed>,
    @InjectRepository(EnergySettlements)
    private readonly EnergySettlementsRepo: Repository<EnergySettlements>,
    @InjectRepository(MqttMessageLogs)
    private readonly MqttMessageLogsRepo: Repository<MqttMessageLogs>,
    @InjectRepository(Prosumers)
    private readonly ProsumersRepo: Repository<Prosumers>,
  ) {}

  async findAll(args?: SmartMetersArgs): Promise<SmartMeters[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.meterId !== undefined) where['meterId'] = args.meterId;
    if (args && args.prosumerId !== undefined)
      where['prosumerId'] = args.prosumerId;
    if (args && args.meterBlockchainAddress !== undefined)
      where['meterBlockchainAddress'] = args.meterBlockchainAddress;
    if (args && args.location !== undefined) where['location'] = args.location;
    if (args && args.status !== undefined) where['status'] = args.status;
    if (args && args.createdAt !== undefined)
      where['createdAt'] = args.createdAt;
    if (args && args.lastSeen !== undefined) where['lastSeen'] = args.lastSeen;
    if (args && args.updatedAt !== undefined)
      where['updatedAt'] = args.updatedAt;
    if (args && args.mqttTopicRealtime !== undefined)
      where['mqttTopicRealtime'] = args.mqttTopicRealtime;
    if (args && args.mqttTopicSettlement !== undefined)
      where['mqttTopicSettlement'] = args.mqttTopicSettlement;
    if (args && args.settlementIntervalMinutes !== undefined)
      where['settlementIntervalMinutes'] = args.settlementIntervalMinutes;
    if (args && args.firmwareVersion !== undefined)
      where['firmwareVersion'] = args.firmwareVersion;
    if (args && args.lastSettlementAt !== undefined)
      where['lastSettlementAt'] = args.lastSettlementAt;
    if (args && args.deviceConfiguration !== undefined)
      where['deviceConfiguration'] = args.deviceConfiguration;
    if (args && args.lastHeartbeatAt !== undefined)
      where['lastHeartbeatAt'] = args.lastHeartbeatAt;
    if (args && args.deviceModel !== undefined)
      where['deviceModel'] = args.deviceModel;
    if (args && args.deviceVersion !== undefined)
      where['deviceVersion'] = args.deviceVersion;
    if (args && args.capabilities !== undefined)
      where['capabilities'] = args.capabilities;

    // const relations = [
    //   'devicecommandsList',
    //   'devicestatussnapshotsList',
    //   'energyreadingsdetailedList',
    //   'energysettlementsList',
    //   'mqttmessagelogsList',
    //   'prosumers',
    // ];
    // return this.repo.find({ where, relations });
    return this.repo.find({ where });
  }

  async findOne(meterId: any): Promise<SmartMeters> {
    const relations = [
      'devicecommandsList',
      'devicestatussnapshotsList',
      'energyreadingsdetailedList',
      'energysettlementsList',
      'mqttmessagelogsList',
      'prosumers',
    ];
    const entity = await this.repo.findOne({ where: { meterId }, relations });
    if (!entity) {
      throw new Error(`SmartMeters with meterId ${'$'}{meterId} not found`);
    }
    return entity;
  }

  async create(input: CreateSmartMetersInput): Promise<SmartMeters> {
    // Convert input types to match entity types
    const createData: Partial<SmartMeters> = { ...input } as any;

    if (input.createdAt)
      (createData as any).createdAt = new Date(input.createdAt);
    if (input.lastSeen) (createData as any).lastSeen = new Date(input.lastSeen);
    if (input.updatedAt)
      (createData as any).updatedAt = new Date(input.updatedAt);
    if (input.lastSettlementAt)
      (createData as any).lastSettlementAt = new Date(input.lastSettlementAt);
    if (input.lastHeartbeatAt)
      (createData as any).lastHeartbeatAt = new Date(input.lastHeartbeatAt);

    // Handle prosumers relation
    if (input.prosumersIds && input.prosumersIds.length > 0) {
      const prosumersEntities = await this.ProsumersRepo.findBy({
        prosumerId: In(input.prosumersIds),
      });
      (createData as any).prosumers = prosumersEntities;
    }

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.meterId);
  }

  async update(
    meterId: any,
    input: CreateSmartMetersInput,
  ): Promise<SmartMeters> {
    const existing = await this.findOne(meterId);

    // Convert input types to match entity types
    const updateData: Partial<SmartMeters> = { ...input } as any;

    if (input.createdAt)
      (updateData as any).createdAt = new Date(input.createdAt);
    if (input.lastSeen) (updateData as any).lastSeen = new Date(input.lastSeen);
    if (input.updatedAt)
      (updateData as any).updatedAt = new Date(input.updatedAt);
    if (input.lastSettlementAt)
      (updateData as any).lastSettlementAt = new Date(input.lastSettlementAt);
    if (input.lastHeartbeatAt)
      (updateData as any).lastHeartbeatAt = new Date(input.lastHeartbeatAt);

    // Handle prosumers relation update
    if (input.prosumersIds !== undefined) {
      if (input.prosumersIds.length > 0) {
        const prosumersEntities = await this.ProsumersRepo.findBy({
          prosumerId: In(input.prosumersIds),
        });
        (updateData as any).prosumers = prosumersEntities;
      } else {
        (updateData as any).prosumers = [];
      }
    }

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(meterId);
  }

  async remove(meterId: any): Promise<boolean> {
    const result = await this.repo.delete({ meterId });
    return (result.affected ?? 0) > 0;
  }

  async findDevicecommandsList(meterId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { meterId },
      relations: ['devicecommandsList'],
    });
    const entities = parent?.devicecommandsList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      sentAt: entity.sentAt
        ? entity.sentAt instanceof Date
          ? entity.sentAt.toISOString()
          : entity.sentAt
        : null,
      acknowledgedAt: entity.acknowledgedAt
        ? entity.acknowledgedAt instanceof Date
          ? entity.acknowledgedAt.toISOString()
          : entity.acknowledgedAt
        : null,
      timeoutAt: entity.timeoutAt
        ? entity.timeoutAt instanceof Date
          ? entity.timeoutAt.toISOString()
          : entity.timeoutAt
        : null,
    }));
  }

  async findDevicestatussnapshotsList(meterId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { meterId },
      relations: ['devicestatussnapshotsList'],
    });
    const entities = parent?.devicestatussnapshotsList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      timestamp: entity.timestamp
        ? entity.timestamp instanceof Date
          ? entity.timestamp.toISOString()
          : entity.timestamp
        : null,
    }));
  }

  async findEnergyreadingsdetailedList(meterId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { meterId },
      relations: ['energyreadingsdetailedList'],
    });
    const entities = parent?.energyreadingsdetailedList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      timestamp: entity.timestamp
        ? entity.timestamp instanceof Date
          ? entity.timestamp.toISOString()
          : entity.timestamp
        : null,
    }));
  }

  async findEnergysettlementsList(meterId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { meterId },
      relations: ['energysettlementsList'],
    });
    const entities = parent?.energysettlementsList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      periodStartTime: entity.periodStartTime
        ? entity.periodStartTime instanceof Date
          ? entity.periodStartTime.toISOString()
          : entity.periodStartTime
        : null,
      periodEndTime: entity.periodEndTime
        ? entity.periodEndTime instanceof Date
          ? entity.periodEndTime.toISOString()
          : entity.periodEndTime
        : null,
      createdAtBackend: entity.createdAtBackend
        ? entity.createdAtBackend instanceof Date
          ? entity.createdAtBackend.toISOString()
          : entity.createdAtBackend
        : null,
      confirmedAtOnChain: entity.confirmedAtOnChain
        ? entity.confirmedAtOnChain instanceof Date
          ? entity.confirmedAtOnChain.toISOString()
          : entity.confirmedAtOnChain
        : null,
    }));
  }

  async findMqttmessagelogsList(meterId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { meterId },
      relations: ['mqttmessagelogsList'],
    });
    const entities = parent?.mqttmessagelogsList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      messageTimestamp: entity.messageTimestamp
        ? entity.messageTimestamp instanceof Date
          ? entity.messageTimestamp.toISOString()
          : entity.messageTimestamp
        : null,
      processedAt: entity.processedAt
        ? entity.processedAt instanceof Date
          ? entity.processedAt.toISOString()
          : entity.processedAt
        : null,
    }));
  }

  async findProsumers(meterId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { meterId },
      relations: ['prosumers'],
    });
    const entity = parent?.prosumers;
    if (!entity) return [];
    // Convert entity to match GraphQL output format
    return [
      {
        ...entity,
        createdAt: entity.createdAt
          ? entity.createdAt instanceof Date
            ? entity.createdAt.toISOString()
            : entity.createdAt
          : null,
        updatedAt: entity.updatedAt
          ? entity.updatedAt instanceof Date
            ? entity.updatedAt.toISOString()
            : entity.updatedAt
          : null,
      },
    ];
  }
}
