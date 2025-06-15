import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MqttMessageLogs } from './entities/MqttMessageLogs.entity';
import { CreateMqttMessageLogsInput } from './dto/MqttMessageLogs.input';
import { MqttMessageLogsArgs } from './dto/MqttMessageLogs.args';
import { EnergySettlements } from '../EnergySettlements/entities/EnergySettlements.entity';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';

@Injectable()
export class MqttMessageLogsService {
  constructor(
    @InjectRepository(MqttMessageLogs)
    private readonly repo: Repository<MqttMessageLogs>,
    @InjectRepository(EnergySettlements)
    private readonly EnergySettlementsRepo: Repository<EnergySettlements>,
    @InjectRepository(SmartMeters)
    private readonly SmartMetersRepo: Repository<SmartMeters>,
  ) {}

  async findAll(args?: MqttMessageLogsArgs): Promise<MqttMessageLogs[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.logId !== undefined) where['logId'] = args.logId;
    if (args && args.meterId !== undefined) where['meterId'] = args.meterId;
    if (args && args.topicType !== undefined)
      where['topicType'] = args.topicType;
    if (args && args.direction !== undefined)
      where['direction'] = args.direction;
    if (args && args.mqttTopic !== undefined)
      where['mqttTopic'] = args.mqttTopic;
    if (args && args.payload !== undefined) where['payload'] = args.payload;
    if (args && args.rawMessage !== undefined)
      where['rawMessage'] = args.rawMessage;
    if (args && args.messageTimestamp !== undefined)
      where['messageTimestamp'] = args.messageTimestamp;
    if (args && args.processedAt !== undefined)
      where['processedAt'] = args.processedAt;
    if (args && args.processingStatus !== undefined)
      where['processingStatus'] = args.processingStatus;
    if (args && args.errorMessage !== undefined)
      where['errorMessage'] = args.errorMessage;
    if (args && args.correlationId !== undefined)
      where['correlationId'] = args.correlationId;

    const relations = ['energysettlementsList', 'smartmeters'];
    return this.repo.find({ where, relations });
  }

  async findOne(logId: any): Promise<MqttMessageLogs> {
    const relations = ['energysettlementsList', 'smartmeters'];
    const entity = await this.repo.findOne({ where: { logId }, relations });
    if (!entity) {
      throw new Error(`MqttMessageLogs with logId ${'$'}{logId} not found`);
    }
    return entity;
  }

  async create(input: CreateMqttMessageLogsInput): Promise<MqttMessageLogs> {
    // Convert input types to match entity types
    const createData: Partial<MqttMessageLogs> = {
      ...input,
      messageTimestamp: input.messageTimestamp
        ? new Date(input.messageTimestamp)
        : undefined,
      processedAt: input.processedAt ? new Date(input.processedAt) : undefined,
    };

    // Handle smartmeters relation (dont delete)
    // if (input.smartmetersIds && input.smartmetersIds.length > 0) {
    //   const smartmetersEntities = await this.SmartMetersRepo.findBy({
    //     meterId: In(input.smartmetersIds),
    //   });
    //   (createData as any).smartmeters = smartmetersEntities;
    // }

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.logId);
  }

  async update(
    logId: any,
    input: CreateMqttMessageLogsInput,
  ): Promise<MqttMessageLogs> {
    const existing = await this.findOne(logId);

    // Convert input types to match entity types
    const updateData: Partial<MqttMessageLogs> = { ...input } as any;

    if (input.messageTimestamp)
      (updateData as any).messageTimestamp = new Date(input.messageTimestamp);
    if (input.processedAt)
      (updateData as any).processedAt = new Date(input.processedAt);

    // Handle smartmeters relation update
    if (input.smartmetersIds !== undefined) {
      if (input.smartmetersIds.length > 0) {
        const smartmetersEntities = await this.SmartMetersRepo.findBy({
          meterId: In(input.smartmetersIds),
        });
        (updateData as any).smartmeters = smartmetersEntities;
      } else {
        (updateData as any).smartmeters = [];
      }
    }

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(logId);
  }

  async remove(logId: any): Promise<boolean> {
    const result = await this.repo.delete({ logId });
    return (result.affected ?? 0) > 0;
  }

  async findEnergysettlementsList(logId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { logId },
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

  async findSmartmeters(logId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { logId },
      relations: ['smartmeters'],
    });
    const entity = parent?.smartmeters;
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
        lastSeen: entity.lastSeen
          ? entity.lastSeen instanceof Date
            ? entity.lastSeen.toISOString()
            : entity.lastSeen
          : null,
        updatedAt: entity.updatedAt
          ? entity.updatedAt instanceof Date
            ? entity.updatedAt.toISOString()
            : entity.updatedAt
          : null,
        lastSettlementAt: entity.lastSettlementAt
          ? entity.lastSettlementAt instanceof Date
            ? entity.lastSettlementAt.toISOString()
            : entity.lastSettlementAt
          : null,
        lastHeartbeatAt: entity.lastHeartbeatAt
          ? entity.lastHeartbeatAt instanceof Date
            ? entity.lastHeartbeatAt.toISOString()
            : entity.lastHeartbeatAt
          : null,
      },
    ];
  }
}
