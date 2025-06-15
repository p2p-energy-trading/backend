import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { IdrsConversions } from './entities/IdrsConversions.entity';
import { CreateIdrsConversionsInput } from './dto/IdrsConversions.input';
import { IdrsConversionsArgs } from './dto/IdrsConversions.args';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
import { Wallets } from '../Wallets/entities/Wallets.entity';

@Injectable()
export class IdrsConversionsService {
  constructor(
    @InjectRepository(IdrsConversions)
    private readonly repo: Repository<IdrsConversions>,
    @InjectRepository(Prosumers)
    private readonly ProsumersRepo: Repository<Prosumers>,
    @InjectRepository(Wallets)
    private readonly WalletsRepo: Repository<Wallets>,
  ) {}

  async findAll(args?: IdrsConversionsArgs): Promise<IdrsConversions[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.conversionId !== undefined)
      where['conversionId'] = args.conversionId;
    if (args && args.prosumerId !== undefined)
      where['prosumerId'] = args.prosumerId;
    if (args && args.walletAddress !== undefined)
      where['walletAddress'] = args.walletAddress;
    if (args && args.conversionType !== undefined)
      where['conversionType'] = args.conversionType;
    if (args && args.idrAmount !== undefined)
      where['idrAmount'] = args.idrAmount;
    if (args && args.idrsAmount !== undefined)
      where['idrsAmount'] = args.idrsAmount;
    if (args && args.exchangeRate !== undefined)
      where['exchangeRate'] = args.exchangeRate;
    if (args && args.blockchainTxHash !== undefined)
      where['blockchainTxHash'] = args.blockchainTxHash;
    if (args && args.status !== undefined) where['status'] = args.status;
    if (args && args.simulationNote !== undefined)
      where['simulationNote'] = args.simulationNote;
    if (args && args.createdAt !== undefined)
      where['createdAt'] = args.createdAt;
    if (args && args.confirmedAt !== undefined)
      where['confirmedAt'] = args.confirmedAt;

    const relations = ['prosumers', 'wallets'];
    return this.repo.find({ where, relations });
  }

  async findOne(conversionId: any): Promise<IdrsConversions> {
    const relations = ['prosumers', 'wallets'];
    const entity = await this.repo.findOne({
      where: { conversionId },
      relations,
    });
    if (!entity) {
      throw new Error(
        `IdrsConversions with conversionId ${'$'}{conversionId} not found`,
      );
    }
    return entity;
  }

  async create(input: CreateIdrsConversionsInput): Promise<IdrsConversions> {
    // Convert input types to match entity types
    const createData: Partial<IdrsConversions> = { ...input } as any;

    if (input.createdAt)
      (createData as any).createdAt = new Date(input.createdAt);
    if (input.confirmedAt)
      (createData as any).confirmedAt = new Date(input.confirmedAt);

    // Handle prosumers relation
    if (input.prosumersIds && input.prosumersIds.length > 0) {
      const prosumersEntities = await this.ProsumersRepo.findBy({
        prosumerId: In(input.prosumersIds),
      });
      (createData as any).prosumers = prosumersEntities;
    }
    // Handle wallets relation
    if (input.walletsIds && input.walletsIds.length > 0) {
      const walletsEntities = await this.WalletsRepo.findBy({
        walletAddress: In(input.walletsIds),
      });
      (createData as any).wallets = walletsEntities;
    }

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.conversionId);
  }

  async update(
    conversionId: any,
    input: CreateIdrsConversionsInput,
  ): Promise<IdrsConversions> {
    const existing = await this.findOne(conversionId);

    // Convert input types to match entity types
    const updateData: Partial<IdrsConversions> = { ...input } as any;

    if (input.createdAt)
      (updateData as any).createdAt = new Date(input.createdAt);
    if (input.confirmedAt)
      (updateData as any).confirmedAt = new Date(input.confirmedAt);

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
    // Handle wallets relation update
    if (input.walletsIds !== undefined) {
      if (input.walletsIds.length > 0) {
        const walletsEntities = await this.WalletsRepo.findBy({
          walletAddress: In(input.walletsIds),
        });
        (updateData as any).wallets = walletsEntities;
      } else {
        (updateData as any).wallets = [];
      }
    }

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(conversionId);
  }

  async remove(conversionId: any): Promise<boolean> {
    const result = await this.repo.delete({ conversionId });
    return (result.affected ?? 0) > 0;
  }

  async findProsumers(conversionId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { conversionId },
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

  async findWallets(conversionId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { conversionId },
      relations: ['wallets'],
    });
    const entity = parent?.wallets;
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
        lastUsedAt: entity.lastUsedAt
          ? entity.lastUsedAt instanceof Date
            ? entity.lastUsedAt.toISOString()
            : entity.lastUsedAt
          : null,
      },
    ];
  }
}
