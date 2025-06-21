import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceStatusSnapshots } from './entities/DeviceStatusSnapshots.entity';
import { CreateDeviceStatusSnapshotsInput } from './dto/DeviceStatusSnapshots.input';
import { DeviceStatusSnapshotsArgs } from './dto/DeviceStatusSnapshots.args';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';

@Injectable()
export class DeviceStatusSnapshotsService {
  constructor(
    @InjectRepository(DeviceStatusSnapshots)
    private readonly repo: Repository<DeviceStatusSnapshots>,
    @InjectRepository(SmartMeters)
    private readonly SmartMetersRepo: Repository<SmartMeters>,
  ) {}

  async findAll(
    args?: DeviceStatusSnapshotsArgs,
  ): Promise<DeviceStatusSnapshots[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.snapshotId !== undefined)
      where['snapshotId'] = args.snapshotId;
    if (args && args.meterId !== undefined) where['meterId'] = args.meterId;
    if (args && args.timestamp !== undefined)
      where['timestamp'] = args.timestamp;
    if (args && args.wifiStatus !== undefined)
      where['wifiStatus'] = args.wifiStatus;
    if (args && args.mqttStatus !== undefined)
      where['mqttStatus'] = args.mqttStatus;
    if (args && args.gridMode !== undefined) where['gridMode'] = args.gridMode;
    if (args && args.systemStatus !== undefined)
      where['systemStatus'] = args.systemStatus;
    if (args && args.componentStatus !== undefined)
      where['componentStatus'] = args.componentStatus;
    if (args && args.rawPayload !== undefined)
      where['rawPayload'] = args.rawPayload;

    const relations = ['smartmeters'];
    return this.repo.find({ where, relations });
  }

  async findOne(snapshotId: number): Promise<DeviceStatusSnapshots> {
    const relations = ['smartmeters'];
    const entity = await this.repo.findOne({
      where: { snapshotId },
      relations,
    });
    if (!entity) {
      throw new Error(
        `DeviceStatusSnapshots with snapshotId ${'$'}{snapshotId} not found`,
      );
    }
    return entity;
  }

  async create(
    input: CreateDeviceStatusSnapshotsInput,
  ): Promise<DeviceStatusSnapshots> {
    // Convert input types to match entity types
    const createData: Partial<DeviceStatusSnapshots> = { ...input } as any;

    if (input.timestamp)
      (createData as any).timestamp = new Date(input.timestamp);

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.snapshotId);
  }

  async update(
    snapshotId: number,
    input: CreateDeviceStatusSnapshotsInput,
  ): Promise<DeviceStatusSnapshots> {
    const existing = await this.findOne(snapshotId);

    // Convert input types to match entity types
    const updateData: Partial<DeviceStatusSnapshots> = { ...input } as any;

    if (input.timestamp)
      (updateData as any).timestamp = new Date(input.timestamp);

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(snapshotId);
  }

  async remove(snapshotId: number): Promise<boolean> {
    const result = await this.repo.delete({ snapshotId });
    return (result.affected ?? 0) > 0;
  }

  async findSmartmeters(snapshotId: number): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { snapshotId },
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
