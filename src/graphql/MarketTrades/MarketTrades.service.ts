import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MarketTrades } from './entities/MarketTrades.entity';
import { CreateMarketTradesInput } from './dto/MarketTrades.input';
import { MarketTradesArgs } from './dto/MarketTrades.args';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
import { Wallets } from '../Wallets/entities/Wallets.entity';

@Injectable()
export class MarketTradesService {
  constructor(
    @InjectRepository(MarketTrades)
    private readonly repo: Repository<MarketTrades>,
    @InjectRepository(Prosumers)
    private readonly ProsumersRepo: Repository<Prosumers>,
    @InjectRepository(Wallets)
    private readonly WalletsRepo: Repository<Wallets>,
  ) {}

  async findAll(args?: MarketTradesArgs): Promise<MarketTrades[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.tradeId !== undefined) where['tradeId'] = args.tradeId;
    if (args && args.buyerOrderId !== undefined)
      where['buyerOrderId'] = args.buyerOrderId;
    if (args && args.sellerOrderId !== undefined)
      where['sellerOrderId'] = args.sellerOrderId;
    if (args && args.buyerProsumerId !== undefined)
      where['buyerProsumerId'] = args.buyerProsumerId;
    if (args && args.sellerProsumerId !== undefined)
      where['sellerProsumerId'] = args.sellerProsumerId;
    if (args && args.buyerWalletAddress !== undefined)
      where['buyerWalletAddress'] = args.buyerWalletAddress;
    if (args && args.sellerWalletAddress !== undefined)
      where['sellerWalletAddress'] = args.sellerWalletAddress;
    if (args && args.tradedEtkAmount !== undefined)
      where['tradedEtkAmount'] = args.tradedEtkAmount;
    if (args && args.priceIdrsPerEtk !== undefined)
      where['priceIdrsPerEtk'] = args.priceIdrsPerEtk;
    if (args && args.totalIdrsValue !== undefined)
      where['totalIdrsValue'] = args.totalIdrsValue;
    if (args && args.blockchainTxHash !== undefined)
      where['blockchainTxHash'] = args.blockchainTxHash;
    if (args && args.tradeTimestamp !== undefined)
      where['tradeTimestamp'] = args.tradeTimestamp;
    if (args && args.gasFeeWei !== undefined)
      where['gasFeeWei'] = args.gasFeeWei;
    if (args && args.createdAt !== undefined)
      where['createdAt'] = args.createdAt;

    const relations = ['prosumers', 'wallets', 'prosumers2', 'wallets2'];
    return this.repo.find({ where, relations });
  }

  async findOne(tradeId: any): Promise<MarketTrades> {
    const relations = ['prosumers', 'wallets', 'prosumers2', 'wallets2'];
    const entity = await this.repo.findOne({ where: { tradeId }, relations });
    if (!entity) {
      throw new Error(`MarketTrades with tradeId ${'$'}{tradeId} not found`);
    }
    return entity;
  }

  async create(input: CreateMarketTradesInput): Promise<MarketTrades> {
    // Convert input types to match entity types
    const createData: Partial<MarketTrades> = { ...input } as any;

    if (input.tradeTimestamp)
      (createData as any).tradeTimestamp = new Date(input.tradeTimestamp);
    if (input.createdAt)
      (createData as any).createdAt = new Date(input.createdAt);

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
    // Handle prosumers2 relation
    if (input.prosumers2Ids && input.prosumers2Ids.length > 0) {
      const prosumers2Entities = await this.ProsumersRepo.findBy({
        prosumerId: In(input.prosumers2Ids),
      });
      (createData as any).prosumers2 = prosumers2Entities;
    }
    // Handle wallets2 relation
    if (input.wallets2Ids && input.wallets2Ids.length > 0) {
      const wallets2Entities = await this.WalletsRepo.findBy({
        walletAddress: In(input.wallets2Ids),
      });
      (createData as any).wallets2 = wallets2Entities;
    }

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.tradeId);
  }

  async update(
    tradeId: any,
    input: CreateMarketTradesInput,
  ): Promise<MarketTrades> {
    const existing = await this.findOne(tradeId);

    // Convert input types to match entity types
    const updateData: Partial<MarketTrades> = { ...input } as any;

    if (input.tradeTimestamp)
      (updateData as any).tradeTimestamp = new Date(input.tradeTimestamp);
    if (input.createdAt)
      (updateData as any).createdAt = new Date(input.createdAt);

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
    // Handle prosumers2 relation update
    if (input.prosumers2Ids !== undefined) {
      if (input.prosumers2Ids.length > 0) {
        const prosumers2Entities = await this.ProsumersRepo.findBy({
          prosumerId: In(input.prosumers2Ids),
        });
        (updateData as any).prosumers2 = prosumers2Entities;
      } else {
        (updateData as any).prosumers2 = [];
      }
    }
    // Handle wallets2 relation update
    if (input.wallets2Ids !== undefined) {
      if (input.wallets2Ids.length > 0) {
        const wallets2Entities = await this.WalletsRepo.findBy({
          walletAddress: In(input.wallets2Ids),
        });
        (updateData as any).wallets2 = wallets2Entities;
      } else {
        (updateData as any).wallets2 = [];
      }
    }

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(tradeId);
  }

  async remove(tradeId: any): Promise<boolean> {
    const result = await this.repo.delete({ tradeId });
    return (result.affected ?? 0) > 0;
  }

  async findProsumers(tradeId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { tradeId },
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

  async findWallets(tradeId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { tradeId },
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

  async findProsumers2(tradeId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { tradeId },
      relations: ['prosumers2'],
    });
    const entity = parent?.prosumers2;
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

  async findWallets2(tradeId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { tradeId },
      relations: ['wallets2'],
    });
    const entity = parent?.wallets2;
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
