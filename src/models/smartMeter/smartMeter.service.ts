import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmartMeter } from './smartMeter.entity';
import { CreateSmartMetersInput } from './dto/SmartMeters.input';
import { SmartMetersArgs } from './dto/SmartMeters.args';
// Removed unused entities:
// - DeviceCommands
// - DeviceStatusSnapshots
// - EnergyReadingsDetailed
// - MqttMessageLogs
import { EnergySettlement } from '../energySettlement/energySettlement.entity';
import { User } from '../user/user.entity';

@Injectable()
export class SmartMetersService {
  constructor(
    @InjectRepository(SmartMeter)
    private readonly repo: Repository<SmartMeter>,
    @InjectRepository(EnergySettlement)
    private readonly EnergySettlementsRepo: Repository<EnergySettlement>,
    @InjectRepository(User)
    private readonly ProsumersRepo: Repository<User>,
  ) {}

  async findAll(args?: SmartMetersArgs): Promise<SmartMeter[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.meterId !== undefined) where['meterId'] = args.meterId;
    if (args && args.userId !== undefined) where['userId'] = args.userId;
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

    return this.repo.find({ where });
  }

  async findOne(meterId: string): Promise<SmartMeter> {
    const entity = await this.repo.findOne({ where: { meterId } });
    if (!entity) {
      throw new Error(`SmartMeters with meterId ${'$'}{meterId} not found`);
    }
    return entity;
  }

  async findByUserId(userId: string): Promise<SmartMeter[]> {
    return this.repo.find({ where: { userId } });
  }

  async updateLastSeen(meterId: string): Promise<SmartMeter> {
    const meter = await this.findOne(meterId);
    meter.lastSeen = new Date();
    meter.lastHeartbeatAt = new Date();
    meter.updatedAt = new Date();
    return this.repo.save(meter);
  }

  async create(input: CreateSmartMetersInput): Promise<SmartMeter> {
    // Convert input types to match entity types
    const createData: Partial<SmartMeter> = {
      meterId: input.meterId,
      userId: input.userId,
      meterBlockchainAddress: input.meterBlockchainAddress,
      location: input.location,
      status: input.status,
      mqttTopicRealtime: input.mqttTopicRealtime,
      mqttTopicSettlement: input.mqttTopicSettlement,
      settlementIntervalMinutes: input.settlementIntervalMinutes,
      firmwareVersion: input.firmwareVersion,
      deviceConfiguration: input.deviceConfiguration,
      deviceModel: input.deviceModel,
      deviceVersion: input.deviceVersion,
      capabilities: input.capabilities,
      createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
      lastSeen: input.lastSeen ? new Date(input.lastSeen) : new Date(),
      updatedAt: input.updatedAt ? new Date(input.updatedAt) : new Date(),
      lastSettlementAt: input.lastSettlementAt
        ? new Date(input.lastSettlementAt)
        : undefined,
      lastHeartbeatAt: input.lastHeartbeatAt
        ? new Date(input.lastHeartbeatAt)
        : undefined,
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.meterId);
  }

  async update(
    meterId: string,
    input: CreateSmartMetersInput,
  ): Promise<SmartMeter> {
    const existing = await this.findOne(meterId);

    // Convert input types to match entity types
    const updateData: Partial<SmartMeter> = {
      userId: input.userId,
      meterBlockchainAddress: input.meterBlockchainAddress,
      location: input.location,
      status: input.status,
      mqttTopicRealtime: input.mqttTopicRealtime,
      mqttTopicSettlement: input.mqttTopicSettlement,
      settlementIntervalMinutes: input.settlementIntervalMinutes,
      firmwareVersion: input.firmwareVersion,
      deviceConfiguration: input.deviceConfiguration,
      deviceModel: input.deviceModel,
      deviceVersion: input.deviceVersion,
      capabilities: input.capabilities,
      createdAt: existing.createdAt, // Typically not updated
      lastSeen: input.lastSeen ? new Date(input.lastSeen) : existing.lastSeen,
      updatedAt: input.updatedAt
        ? new Date(input.updatedAt)
        : existing.updatedAt,
      lastSettlementAt: input.lastSettlementAt
        ? new Date(input.lastSettlementAt)
        : existing.lastSettlementAt,
      lastHeartbeatAt: input.lastHeartbeatAt
        ? new Date(input.lastHeartbeatAt)
        : existing.lastHeartbeatAt,
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(meterId);
  }

  async remove(meterId: string): Promise<boolean> {
    const result = await this.repo.delete({ meterId });
    return (result.affected ?? 0) > 0;
  }
}
