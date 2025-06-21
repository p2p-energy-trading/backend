import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TradeOrdersCache } from './entities/TradeOrdersCache.entity';
import { CreateTradeOrdersCacheInput } from './dto/TradeOrdersCache.input';
import { TradeOrdersCacheArgs } from './dto/TradeOrdersCache.args';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
import { Wallets } from '../Wallets/entities/Wallets.entity';
import { TransactionLogs } from '../TransactionLogs/entities/TransactionLogs.entity';

@Injectable()
export class TradeOrdersCacheService {
  constructor(
    @InjectRepository(TradeOrdersCache)
    private readonly repo: Repository<TradeOrdersCache>,
    @InjectRepository(Prosumers)
    private readonly ProsumersRepo: Repository<Prosumers>,
    @InjectRepository(Wallets)
    private readonly WalletsRepo: Repository<Wallets>,
    @InjectRepository(TransactionLogs)
    private readonly TransactionLogsRepo: Repository<TransactionLogs>,
  ) {}

  async findAll(args?: TradeOrdersCacheArgs): Promise<TradeOrdersCache[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.orderId !== undefined) where['orderId'] = args.orderId;
    if (args && args.prosumerId !== undefined) where['prosumerId'] = args.prosumerId;
    if (args && args.walletAddress !== undefined) where['walletAddress'] = args.walletAddress;
    if (args && args.orderType !== undefined) where['orderType'] = args.orderType;
    if (args && args.pair !== undefined) where['pair'] = args.pair;
    if (args && args.amountEtk !== undefined) where['amountEtk'] = args.amountEtk;
    if (args && args.priceIdrsPerEtk !== undefined) where['priceIdrsPerEtk'] = args.priceIdrsPerEtk;
    if (args && args.totalIdrsValue !== undefined) where['totalIdrsValue'] = args.totalIdrsValue;
    if (args && args.statusOnChain !== undefined) where['statusOnChain'] = args.statusOnChain;
    if (args && args.createdAtOnChain !== undefined) where['createdAtOnChain'] = args.createdAtOnChain;
    if (args && args.updatedAtCache !== undefined) where['updatedAtCache'] = args.updatedAtCache;
    if (args && args.blockchainTxHashPlaced !== undefined) where['blockchainTxHashPlaced'] = args.blockchainTxHashPlaced;
    if (args && args.blockchainTxHashFilled !== undefined) where['blockchainTxHashFilled'] = args.blockchainTxHashFilled;
    
    const relations = ['prosumers', 'wallets', 'transactionlogsList'];
    return this.repo.find({ where, relations });
  }

  async findOne(orderId: any): Promise<TradeOrdersCache> {
    const relations = ['prosumers', 'wallets', 'transactionlogsList'];
    const entity = await this.repo.findOne({ where: { orderId }, relations });
    if (!entity) {
      throw new Error(`TradeOrdersCache with orderId ${'$'}{orderId} not found`);
    }
    return entity;
  }

  async create(input: CreateTradeOrdersCacheInput): Promise<TradeOrdersCache> {
    // Convert input types to match entity types
    const createData: Partial<TradeOrdersCache> = { ...input } as any;
    
    if (input.createdAtOnChain) (createData as any).createdAtOnChain = new Date(input.createdAtOnChain);
    if (input.updatedAtCache) (createData as any).updatedAtCache = new Date(input.updatedAtCache);

    // Handle prosumers relation
    if (input.prosumersIds && input.prosumersIds.length > 0) {
      const prosumersEntities = await this.ProsumersRepo.findBy({ prosumerId: In(input.prosumersIds) });
      (createData as any).prosumers = prosumersEntities;
    }
    // Handle wallets relation
    if (input.walletsIds && input.walletsIds.length > 0) {
      const walletsEntities = await this.WalletsRepo.findBy({ walletAddress: In(input.walletsIds) });
      (createData as any).wallets = walletsEntities;
    }

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.orderId);
  }

  async update(orderId: any, input: CreateTradeOrdersCacheInput): Promise<TradeOrdersCache> {
    const existing = await this.findOne(orderId);
    
    // Convert input types to match entity types
    const updateData: Partial<TradeOrdersCache> = { ...input } as any;
    
    if (input.createdAtOnChain) (updateData as any).createdAtOnChain = new Date(input.createdAtOnChain);
    if (input.updatedAtCache) (updateData as any).updatedAtCache = new Date(input.updatedAtCache);

    // Handle prosumers relation update
    if (input.prosumersIds !== undefined) {
      if (input.prosumersIds.length > 0) {
        const prosumersEntities = await this.ProsumersRepo.findBy({ prosumerId: In(input.prosumersIds) });
        (updateData as any).prosumers = prosumersEntities;
      } else {
        (updateData as any).prosumers = [];
      }
    }
    // Handle wallets relation update
    if (input.walletsIds !== undefined) {
      if (input.walletsIds.length > 0) {
        const walletsEntities = await this.WalletsRepo.findBy({ walletAddress: In(input.walletsIds) });
        (updateData as any).wallets = walletsEntities;
      } else {
        (updateData as any).wallets = [];
      }
    }

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(orderId);
  }

  async remove(orderId: any): Promise<boolean> {
    const result = await this.repo.delete({ orderId });
    return (result.affected ?? 0) > 0;
  }

  async findProsumers(orderId: any): Promise<any[]> {
    const parent = await this.repo.findOne({ where: { orderId }, relations: ['prosumers'] });
    const entity = parent?.prosumers;
    if (!entity) return [];
    // Convert entity to match GraphQL output format
    return [{
      ...entity,
      createdAt: entity.createdAt ? (entity.createdAt instanceof Date ? entity.createdAt.toISOString() : entity.createdAt) : null,
      updatedAt: entity.updatedAt ? (entity.updatedAt instanceof Date ? entity.updatedAt.toISOString() : entity.updatedAt) : null,
    }];
  }

  async findWallets(orderId: any): Promise<any[]> {
    const parent = await this.repo.findOne({ where: { orderId }, relations: ['wallets'] });
    const entity = parent?.wallets;
    if (!entity) return [];
    // Convert entity to match GraphQL output format
    return [{
      ...entity,
      createdAt: entity.createdAt ? (entity.createdAt instanceof Date ? entity.createdAt.toISOString() : entity.createdAt) : null,
      lastUsedAt: entity.lastUsedAt ? (entity.lastUsedAt instanceof Date ? entity.lastUsedAt.toISOString() : entity.lastUsedAt) : null,
    }];
  }

  async findTransactionlogsList(orderId: any): Promise<any[]> {
    const parent = await this.repo.findOne({ where: { orderId }, relations: ['transactionlogsList'] });
    const entities = parent?.transactionlogsList || [];
    // Convert entities to match GraphQL output format
    return entities.map(entity => ({
      ...entity,
      transactionTimestamp: entity.transactionTimestamp ? (entity.transactionTimestamp instanceof Date ? entity.transactionTimestamp.toISOString() : entity.transactionTimestamp) : null,
    }));
  }
}
