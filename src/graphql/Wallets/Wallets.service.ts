import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Wallets } from './entities/Wallets.entity';
import { CreateWalletsInput } from './dto/Wallets.input';
import { WalletsArgs } from './dto/Wallets.args';
import { BlockchainApprovals } from '../BlockchainApprovals/entities/BlockchainApprovals.entity';
import { IdrsConversions } from '../IdrsConversions/entities/IdrsConversions.entity';
import { MarketTrades } from '../MarketTrades/entities/MarketTrades.entity';
import { TradeOrdersCache } from '../TradeOrdersCache/entities/TradeOrdersCache.entity';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallets)
    private readonly repo: Repository<Wallets>,
    @InjectRepository(BlockchainApprovals)
    private readonly BlockchainApprovalsRepo: Repository<BlockchainApprovals>,
    @InjectRepository(IdrsConversions)
    private readonly IdrsConversionsRepo: Repository<IdrsConversions>,
    @InjectRepository(MarketTrades)
    private readonly MarketTradesRepo: Repository<MarketTrades>,
    @InjectRepository(TradeOrdersCache)
    private readonly TradeOrdersCacheRepo: Repository<TradeOrdersCache>,
    @InjectRepository(Prosumers)
    private readonly ProsumersRepo: Repository<Prosumers>,
  ) {}

  async findAll(args?: WalletsArgs): Promise<Wallets[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.walletAddress !== undefined)
      where['walletAddress'] = args.walletAddress;
    if (args && args.prosumerId !== undefined)
      where['prosumerId'] = args.prosumerId;
    if (args && args.walletName !== undefined)
      where['walletName'] = args.walletName;
    if (args && args.encryptedPrivateKey !== undefined)
      where['encryptedPrivateKey'] = args.encryptedPrivateKey;
    if (args && args.createdAt !== undefined)
      where['createdAt'] = args.createdAt;
    if (args && args.importMethod !== undefined)
      where['importMethod'] = args.importMethod;
    if (args && args.isActive !== undefined) where['isActive'] = args.isActive;
    if (args && args.lastUsedAt !== undefined)
      where['lastUsedAt'] = args.lastUsedAt;

    return this.repo.find({ where });
  }

  async findOne(walletAddress: any): Promise<Wallets> {
    const relations = [
      'blockchainapprovalsList',
      'idrsconversionsList',
      'markettradesList',
      'markettradesList2',
      'tradeorderscacheList',
      'prosumers',
    ];
    const entity = await this.repo.findOne({
      where: { walletAddress },
      relations,
    });
    if (!entity) {
      throw new Error(
        `Wallets with walletAddress ${'$'}{walletAddress} not found`,
      );
    }
    return entity;
  }

  async create(input: CreateWalletsInput): Promise<Wallets> {
    // Convert input types to match entity types
    const createData: Partial<Wallets> = { ...input } as any;

    if (input.createdAt)
      (createData as any).createdAt = new Date(input.createdAt);
    if (input.lastUsedAt)
      (createData as any).lastUsedAt = new Date(input.lastUsedAt);

    // Handle prosumers relation
    if (input.prosumersIds && input.prosumersIds.length > 0) {
      const prosumersEntities = await this.ProsumersRepo.findBy({
        prosumerId: In(input.prosumersIds),
      });
      (createData as any).prosumers = prosumersEntities;
    }

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.walletAddress);
  }

  async update(
    walletAddress: any,
    input: CreateWalletsInput,
  ): Promise<Wallets> {
    const existing = await this.findOne(walletAddress);

    // Convert input types to match entity types
    const updateData: Partial<Wallets> = { ...input } as any;

    if (input.createdAt)
      (updateData as any).createdAt = new Date(input.createdAt);
    if (input.lastUsedAt)
      (updateData as any).lastUsedAt = new Date(input.lastUsedAt);

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
    return this.findOne(walletAddress);
  }

  async remove(walletAddress: any): Promise<boolean> {
    const result = await this.repo.delete({ walletAddress });
    return (result.affected ?? 0) > 0;
  }

  async findBlockchainapprovalsList(walletAddress: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { walletAddress },
      relations: ['blockchainapprovalsList'],
    });
    const entities = parent?.blockchainapprovalsList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      expiresAt: entity.expiresAt
        ? entity.expiresAt instanceof Date
          ? entity.expiresAt.toISOString()
          : entity.expiresAt
        : null,
      createdAt: entity.createdAt
        ? entity.createdAt instanceof Date
          ? entity.createdAt.toISOString()
          : entity.createdAt
        : null,
      confirmedAt: entity.confirmedAt
        ? entity.confirmedAt instanceof Date
          ? entity.confirmedAt.toISOString()
          : entity.confirmedAt
        : null,
    }));
  }

  async findIdrsconversionsList(walletAddress: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { walletAddress },
      relations: ['idrsconversionsList'],
    });
    const entities = parent?.idrsconversionsList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      createdAt: entity.createdAt
        ? entity.createdAt instanceof Date
          ? entity.createdAt.toISOString()
          : entity.createdAt
        : null,
      confirmedAt: entity.confirmedAt
        ? entity.confirmedAt instanceof Date
          ? entity.confirmedAt.toISOString()
          : entity.confirmedAt
        : null,
    }));
  }

  async findMarkettradesList(walletAddress: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { walletAddress },
      relations: ['markettradesList'],
    });
    const entities = parent?.markettradesList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      tradeTimestamp: entity.tradeTimestamp
        ? entity.tradeTimestamp instanceof Date
          ? entity.tradeTimestamp.toISOString()
          : entity.tradeTimestamp
        : null,
      createdAt: entity.createdAt
        ? entity.createdAt instanceof Date
          ? entity.createdAt.toISOString()
          : entity.createdAt
        : null,
    }));
  }

  async findMarkettradesList2(walletAddress: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { walletAddress },
      relations: ['markettradesList2'],
    });
    const entities = parent?.markettradesList2 || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      tradeTimestamp: entity.tradeTimestamp
        ? entity.tradeTimestamp instanceof Date
          ? entity.tradeTimestamp.toISOString()
          : entity.tradeTimestamp
        : null,
      createdAt: entity.createdAt
        ? entity.createdAt instanceof Date
          ? entity.createdAt.toISOString()
          : entity.createdAt
        : null,
    }));
  }

  async findTradeorderscacheList(walletAddress: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { walletAddress },
      relations: ['tradeorderscacheList'],
    });
    const entities = parent?.tradeorderscacheList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      createdAtOnChain: entity.createdAtOnChain
        ? entity.createdAtOnChain instanceof Date
          ? entity.createdAtOnChain.toISOString()
          : entity.createdAtOnChain
        : null,
      updatedAtCache: entity.updatedAtCache
        ? entity.updatedAtCache instanceof Date
          ? entity.updatedAtCache.toISOString()
          : entity.updatedAtCache
        : null,
    }));
  }

  async findProsumers(walletAddress: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { walletAddress },
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
