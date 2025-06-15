import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EnergyReadingsDetailed } from './entities/EnergyReadingsDetailed.entity';
import { CreateEnergyReadingsDetailedInput } from './dto/EnergyReadingsDetailed.input';
import { EnergyReadingsDetailedArgs } from './dto/EnergyReadingsDetailed.args';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';

@Injectable()
export class EnergyReadingsDetailedService {
  constructor(
    @InjectRepository(EnergyReadingsDetailed)
    private readonly repo: Repository<EnergyReadingsDetailed>,
    @InjectRepository(SmartMeters)
    private readonly SmartMetersRepo: Repository<SmartMeters>,
  ) {}

  async findAll(
    args?: EnergyReadingsDetailedArgs,
  ): Promise<EnergyReadingsDetailed[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.readingId !== undefined)
      where['readingId'] = args.readingId;
    if (args && args.meterId !== undefined) where['meterId'] = args.meterId;
    if (args && args.timestamp !== undefined)
      where['timestamp'] = args.timestamp;
    if (args && args.subsystem !== undefined)
      where['subsystem'] = args.subsystem;
    if (args && args.dailyEnergyWh !== undefined)
      where['dailyEnergyWh'] = args.dailyEnergyWh;
    if (args && args.totalEnergyWh !== undefined)
      where['totalEnergyWh'] = args.totalEnergyWh;
    if (args && args.settlementEnergyWh !== undefined)
      where['settlementEnergyWh'] = args.settlementEnergyWh;
    if (args && args.currentPowerW !== undefined)
      where['currentPowerW'] = args.currentPowerW;
    if (args && args.voltage !== undefined) where['voltage'] = args.voltage;
    if (args && args.currentAmp !== undefined)
      where['currentAmp'] = args.currentAmp;
    if (args && args.subsystemData !== undefined)
      where['subsystemData'] = args.subsystemData;
    if (args && args.rawPayload !== undefined)
      where['rawPayload'] = args.rawPayload;

    const relations = ['smartmeters'];
    return this.repo.find({ where, relations });
  }

  async findOne(readingId: any): Promise<EnergyReadingsDetailed> {
    const relations = ['smartmeters'];
    const entity = await this.repo.findOne({ where: { readingId }, relations });
    if (!entity) {
      throw new Error(
        `EnergyReadingsDetailed with readingId ${'$'}{readingId} not found`,
      );
    }
    return entity;
  }

  async create(
    input: CreateEnergyReadingsDetailedInput,
  ): Promise<EnergyReadingsDetailed> {
    // Convert input types to match entity types
    const createData: Partial<EnergyReadingsDetailed> = { ...input } as any;

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
    return this.findOne(savedEntity.readingId);
  }

  async update(
    readingId: any,
    input: CreateEnergyReadingsDetailedInput,
  ): Promise<EnergyReadingsDetailed> {
    const existing = await this.findOne(readingId);

    // Convert input types to match entity types
    const updateData: Partial<EnergyReadingsDetailed> = { ...input } as any;

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
    return this.findOne(readingId);
  }

  async remove(readingId: any): Promise<boolean> {
    const result = await this.repo.delete({ readingId });
    return (result.affected ?? 0) > 0;
  }

  async findSmartmeters(readingId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { readingId },
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
