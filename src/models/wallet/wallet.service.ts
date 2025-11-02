import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { CreateWalletsInput } from './dto/wallet.input';
import { WalletsArgs } from './dto/wallet.args';
// Removed: BlockchainApprovals (not used), TradeOrdersCache (replaced by Redis)
import { IdrsConversion } from '../idrsConversion/idrsConversion.entity';
import { MarketTrade } from '../marketTrade/marketTrade.entity';
import { User } from '../user/user.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly repo: Repository<Wallet>,
    @InjectRepository(IdrsConversion)
    private readonly IdrsConversionsRepo: Repository<IdrsConversion>,
    @InjectRepository(MarketTrade)
    private readonly MarketTradesRepo: Repository<MarketTrade>,
    // Removed: TradeOrdersCacheRepo (replaced by Redis)
    @InjectRepository(User)
    private readonly ProsumersRepo: Repository<User>,
  ) {}

  async findAll(args?: WalletsArgs): Promise<Wallet[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.walletAddress !== undefined)
      where['walletAddress'] = args.walletAddress;
    if (args && args.userId !== undefined) where['userId'] = args.userId;
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

  async findOne(walletAddress: string): Promise<Wallet> {
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

  async findByUserId(userId: string): Promise<Wallet[]> {
    const entities = await this.repo.find({
      where: { userId },
    });
    if (!entities || entities.length === 0) {
      throw new Error(`No wallets found for userId ${'$'}{userId}`);
    }
    return entities;
  }

  async create(input: CreateWalletsInput): Promise<Wallet> {
    // Convert input types to match entity types
    const createData: Partial<Wallet> = {
      walletAddress: input.walletAddress,
      userId: input.userId,
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
  ): Promise<Wallet> {
    const existing = await this.findOne(walletAddress);

    // Convert input types to match entity types
    const updateData: Partial<Wallet> = {
      walletAddress: input.walletAddress,
      userId: input.userId,
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
