import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceStatusSnapshots } from '../DeviceStatusSnapshots/DeviceStatusSnapshots.entity';
import { CreateDeviceStatusSnapshotsInput } from './dto/DeviceStatusSnapshots.input';
import { DeviceStatusSnapshotsArgs } from './dto/DeviceStatusSnapshots.args';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';

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

    return this.repo.find({ where });
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
    const createData: Partial<DeviceStatusSnapshots> = {
      meterId: input.meterId,
      wifiStatus: input.wifiStatus,
      mqttStatus: input.mqttStatus,
      gridMode: input.gridMode,
      systemStatus: input.systemStatus,
      componentStatus: input.componentStatus,
      rawPayload: input.rawPayload,
      timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
    };

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
    const updateData: Partial<DeviceStatusSnapshots> = {
      meterId: input.meterId,
      wifiStatus: input.wifiStatus,
      mqttStatus: input.mqttStatus,
      gridMode: input.gridMode,
      systemStatus: input.systemStatus,
      componentStatus: input.componentStatus,
      rawPayload: input.rawPayload,
      timestamp: input.timestamp
        ? new Date(input.timestamp)
        : existing.timestamp,
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(snapshotId);
  }

  async remove(snapshotId: number): Promise<boolean> {
    const result = await this.repo.delete({ snapshotId });
    return (result.affected ?? 0) > 0;
  }
}
