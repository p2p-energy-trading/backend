import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DeviceHeartbeats } from './entities/DeviceHeartbeats.entity';
import { CreateDeviceHeartbeatsInput } from './dto/DeviceHeartbeats.input';
import { DeviceHeartbeatsArgs } from './dto/DeviceHeartbeats.args';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';

@Injectable()
export class DeviceHeartbeatsService {
  constructor(
    @InjectRepository(DeviceHeartbeats)
    private readonly repo: Repository<DeviceHeartbeats>,
    @InjectRepository(SmartMeters)
    private readonly SmartMetersRepo: Repository<SmartMeters>,
  ) {}

  async findAll(args?: DeviceHeartbeatsArgs): Promise<DeviceHeartbeats[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.heartbeatId !== undefined)
      where['heartbeatId'] = args.heartbeatId;
    if (args && args.meterId !== undefined) where['meterId'] = args.meterId;
    if (args && args.timestamp !== undefined)
      where['timestamp'] = args.timestamp;
    if (args && args.uptimeSeconds !== undefined)
      where['uptimeSeconds'] = args.uptimeSeconds;
    if (args && args.freeHeapBytes !== undefined)
      where['freeHeapBytes'] = args.freeHeapBytes;
    if (args && args.signalStrength !== undefined)
      where['signalStrength'] = args.signalStrength;
    if (args && args.additionalMetrics !== undefined)
      where['additionalMetrics'] = args.additionalMetrics;

    const relations = ['smartmeters'];
    return this.repo.find({ where, relations });
  }

  async findOne(heartbeatId: any): Promise<DeviceHeartbeats> {
    const relations = ['smartmeters'];
    const entity = await this.repo.findOne({
      where: { heartbeatId },
      relations,
    });
    if (!entity) {
      throw new Error(
        `DeviceHeartbeats with heartbeatId ${'$'}{heartbeatId} not found`,
      );
    }
    return entity;
  }

  async create(input: CreateDeviceHeartbeatsInput): Promise<DeviceHeartbeats> {
    // Convert input types to match entity types
    const createData: Partial<DeviceHeartbeats> = { ...input } as any;

    if (input.timestamp)
      (createData as any).timestamp = new Date(input.timestamp);

    // Handle smartmeters relation
    if (input.smartmetersIds && input.smartmetersIds.length > 0) {
      const smartmetersEntities = await this.SmartMetersRepo.findBy({
        meterId: In(input.smartmetersIds),
      });
      (createData as any).smartmeters = smartmetersEntities;
    }

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.heartbeatId);
  }

  async update(
    heartbeatId: any,
    input: CreateDeviceHeartbeatsInput,
  ): Promise<DeviceHeartbeats> {
    const existing = await this.findOne(heartbeatId);

    // Convert input types to match entity types
    const updateData: Partial<DeviceHeartbeats> = { ...input } as any;

    if (input.timestamp)
      (updateData as any).timestamp = new Date(input.timestamp);

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
    return this.findOne(heartbeatId);
  }

  async remove(heartbeatId: any): Promise<boolean> {
    const result = await this.repo.delete({ heartbeatId });
    return (result.affected ?? 0) > 0;
  }

  async findSmartmeters(heartbeatId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { heartbeatId },
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
