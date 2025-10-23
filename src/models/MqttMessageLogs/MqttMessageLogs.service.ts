import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MqttMessageLogs } from '../MqttMessageLogs/MqttMessageLogs.entity';
import { CreateMqttMessageLogsInput } from './dto/MqttMessageLogs.input';
import { MqttMessageLogsArgs } from './dto/MqttMessageLogs.args';
import { EnergySettlements } from '../EnergySettlements/EnergySettlements.entity';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';

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

  async findOne(logId: number): Promise<MqttMessageLogs> {
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
      meterId: input.meterId,
      topicType: input.topicType,
      direction: input.direction,
      mqttTopic: input.mqttTopic,
      payload: input.payload,
      rawMessage: input.rawMessage,
      processingStatus: input.processingStatus,
      errorMessage: input.errorMessage,
      correlationId: input.correlationId,
      messageTimestamp: input.messageTimestamp
        ? new Date(input.messageTimestamp)
        : new Date(), // Default to now if not provided
      processedAt: input.processedAt ? new Date(input.processedAt) : undefined,
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.logId);
  }

  async update(
    logId: number,
    input: CreateMqttMessageLogsInput,
  ): Promise<MqttMessageLogs> {
    const existing = await this.findOne(logId);

    // Convert input types to match entity types
    const updateData: Partial<MqttMessageLogs> = {
      meterId: input.meterId,
      topicType: input.topicType,
      direction: input.direction,
      mqttTopic: input.mqttTopic,
      payload: input.payload,
      rawMessage: input.rawMessage,
      processingStatus: input.processingStatus,
      errorMessage: input.errorMessage,
      correlationId: input.correlationId,
      messageTimestamp: input.messageTimestamp
        ? new Date(input.messageTimestamp)
        : existing.messageTimestamp, // Keep existing if not provided
      processedAt: input.processedAt
        ? new Date(input.processedAt)
        : existing.processedAt, // Keep existing if not provided
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(logId);
  }

  async remove(logId: number): Promise<boolean> {
    const result = await this.repo.delete({ logId });
    return (result.affected ?? 0) > 0;
  }
}
