import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnergyReadingsDetailed } from './entities/EnergyReadingsDetailed.entity';
import { CreateEnergyReadingsDetailedInput } from './dto/EnergyReadingsDetailed.input';
import { EnergyReadingsDetailedArgs } from './dto/EnergyReadingsDetailed.args';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { GridSettlementData } from 'src/common/interfaces';

@Injectable()
export class EnergyReadingsDetailedService {
  private readonly Logger = new Logger(EnergyReadingsDetailedService.name);

  constructor(
    @InjectRepository(EnergyReadingsDetailed)
    private readonly repo: Repository<EnergyReadingsDetailed>,
    @InjectRepository(SmartMeters)
    private readonly SmartMetersRepo: Repository<SmartMeters>,
  ) {}

  // just a simple example of a method that finds the latest reading for a given meterId, no relation, take 2
  async findLatestGridImportAndExportByMeterId(
    meterId: string,
  ): Promise<GridSettlementData | null> {
    const latestReadingImport = await this.repo
      .createQueryBuilder('reading')
      .where('reading.meterId = :meterId', { meterId })
      .andWhere('(reading.subsystem = :import)', {
        import: 'GRID_IMPORT',
      })
      .orderBy('reading.timestamp', 'DESC')
      .getOne();

    const latestReadingExport = await this.repo
      .createQueryBuilder('reading')
      .where('reading.meterId = :meterId', { meterId })
      .andWhere('(reading.subsystem = :export)', {
        export: 'GRID_EXPORT',
      })
      .orderBy('reading.timestamp', 'DESC')
      .getOne();

    const settlementData: GridSettlementData = {
      meterId: latestReadingImport?.meterId || '',
      timestamp: latestReadingImport?.timestamp.toISOString() || '',
      importEnergyWh:
        latestReadingImport?.subsystem === 'GRID_IMPORT'
          ? latestReadingImport.settlementEnergyWh || 0
          : 0,
      exportEnergyWh:
        latestReadingExport?.subsystem === 'GRID_EXPORT'
          ? latestReadingExport.settlementEnergyWh || 0
          : 0,
    };

    return settlementData || null;
  }

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

  async findOne(readingId: number): Promise<EnergyReadingsDetailed> {
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
    const createData: Partial<EnergyReadingsDetailed> = {
      meterId: input.meterId,
      subsystem: input.subsystem,
      dailyEnergyWh: input.dailyEnergyWh ?? undefined,
      totalEnergyWh: input.totalEnergyWh ?? undefined,
      settlementEnergyWh: input.settlementEnergyWh ?? undefined,
      currentPowerW: input.currentPowerW ?? undefined,
      voltage: input.voltage ?? undefined,
      currentAmp: input.currentAmp ?? undefined,
      subsystemData: input.subsystemData ?? undefined,
      rawPayload: input.rawPayload,
      timestamp: input.timestamp ? new Date(input.timestamp) : new Date(), // Default to current date if not provided
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.readingId);
  }

  async update(
    readingId: number,
    input: CreateEnergyReadingsDetailedInput,
  ): Promise<EnergyReadingsDetailed> {
    const existing = await this.findOne(readingId);

    // Convert input types to match entity types
    const updateData: Partial<EnergyReadingsDetailed> = {
      meterId: input.meterId,
      subsystem: input.subsystem,
      dailyEnergyWh: input.dailyEnergyWh ?? undefined,
      totalEnergyWh: input.totalEnergyWh ?? undefined,
      settlementEnergyWh: input.settlementEnergyWh ?? undefined,
      currentPowerW: input.currentPowerW ?? undefined,
      voltage: input.voltage ?? undefined,
      currentAmp: input.currentAmp ?? undefined,
      subsystemData: input.subsystemData ?? undefined,
      rawPayload: input.rawPayload,
      timestamp: input.timestamp
        ? new Date(input.timestamp)
        : existing.timestamp, // Use existing timestamp if not provided
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(readingId);
  }

  async remove(readingId: number): Promise<boolean> {
    const result = await this.repo.delete({ readingId });
    return (result.affected ?? 0) > 0;
  }
}
