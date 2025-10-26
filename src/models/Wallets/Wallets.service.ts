import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallets } from '../Wallets/Wallets.entity';
import { CreateWalletsInput } from './dto/Wallets.input';
import { WalletsArgs } from './dto/Wallets.args';
// Removed: BlockchainApprovals (not used)
import { IdrsConversions } from '../IdrsConversions/IdrsConversions.entity';
import { MarketTrades } from '../MarketTrades/MarketTrades.entity';
import { TradeOrdersCache } from '../TradeOrdersCache/TradeOrdersCache.entity';
import { Prosumers } from '../Prosumers/Prosumers.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallets)
    private readonly repo: Repository<Wallets>,
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

  async findOne(walletAddress: string): Promise<Wallets> {
    const entity = await this.repo.findOne({
      where: { walletAddress },
    });
    if (!entity) {
      throw new Error(
        `Wallets with walletAddress ${'$'}{walletAddress} not found`,
      );
    }
    return entity;
  }

  async findByProsumerId(prosumerId: string): Promise<Wallets[]> {
    const entities = await this.repo.find({
      where: { prosumerId },
    });
    if (!entities || entities.length === 0) {
      throw new Error(`No wallets found for prosumerId ${'$'}{prosumerId}`);
    }
    return entities;
  }

  async create(input: CreateWalletsInput): Promise<Wallets> {
    // Convert input types to match entity types
    const createData: Partial<Wallets> = {
      walletAddress: input.walletAddress,
      prosumerId: input.prosumerId,
      walletName: input.walletName,
      encryptedPrivateKey: input.encryptedPrivateKey,
      importMethod: input.importMethod,
      isActive: input.isActive,
      createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
      lastUsedAt: input.lastUsedAt ? new Date(input.lastUsedAt) : undefined,
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.walletAddress);
  }

  async update(
    walletAddress: string,
    input: CreateWalletsInput,
  ): Promise<Wallets> {
    const existing = await this.findOne(walletAddress);

    // Convert input types to match entity types
    const updateData: Partial<Wallets> = {
      walletAddress: input.walletAddress,
      prosumerId: input.prosumerId,
      walletName: input.walletName,
      encryptedPrivateKey: input.encryptedPrivateKey,
      importMethod: input.importMethod,
      isActive: input.isActive,
      createdAt: input.createdAt
        ? new Date(input.createdAt)
        : existing.createdAt,
      lastUsedAt: input.lastUsedAt
        ? new Date(input.lastUsedAt)
        : existing.lastUsedAt,
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(walletAddress);
  }

  async remove(walletAddress: string): Promise<boolean> {
    const result = await this.repo.delete({ walletAddress });
    return (result.affected ?? 0) > 0;
  }
}
