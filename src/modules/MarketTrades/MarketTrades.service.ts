import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    return this.repo.find({ where });
  }

  async findOne(tradeId: number): Promise<MarketTrades> {
    const relations = ['prosumers', 'wallets', 'prosumers2', 'wallets2'];
    const entity = await this.repo.findOne({ where: { tradeId }, relations });
    if (!entity) {
      throw new Error(`MarketTrades with tradeId ${'$'}{tradeId} not found`);
    }
    return entity;
  }

  async create(input: CreateMarketTradesInput): Promise<MarketTrades> {
    // Convert input types to match entity types
    const createData: Partial<MarketTrades> = {
      buyerOrderId: input.buyerOrderId,
      sellerOrderId: input.sellerOrderId,
      buyerProsumerId: input.buyerProsumerId,
      sellerProsumerId: input.sellerProsumerId,
      buyerWalletAddress: input.buyerWalletAddress,
      sellerWalletAddress: input.sellerWalletAddress,
      tradedEtkAmount: input.tradedEtkAmount,
      priceIdrsPerEtk: input.priceIdrsPerEtk,
      totalIdrsValue: input.totalIdrsValue,
      blockchainTxHash: input.blockchainTxHash,
      gasFeeWei: input.gasFeeWei,
      createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
      tradeTimestamp: input.tradeTimestamp
        ? new Date(input.tradeTimestamp)
        : new Date(),
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.tradeId);
  }

  async update(
    tradeId: number,
    input: CreateMarketTradesInput,
  ): Promise<MarketTrades> {
    const existing = await this.findOne(tradeId);

    // Convert input types to match entity types
    const updateData: Partial<MarketTrades> = {
      buyerOrderId: input.buyerOrderId,
      sellerOrderId: input.sellerOrderId,
      buyerProsumerId: input.buyerProsumerId,
      sellerProsumerId: input.sellerProsumerId,
      buyerWalletAddress: input.buyerWalletAddress,
      sellerWalletAddress: input.sellerWalletAddress,
      tradedEtkAmount: input.tradedEtkAmount,
      priceIdrsPerEtk: input.priceIdrsPerEtk,
      totalIdrsValue: input.totalIdrsValue,
      blockchainTxHash: input.blockchainTxHash,
      gasFeeWei: input.gasFeeWei,
      tradeTimestamp: input.tradeTimestamp
        ? new Date(input.tradeTimestamp)
        : existing.tradeTimestamp,
      createdAt: input.createdAt
        ? new Date(input.createdAt)
        : existing.createdAt,
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(tradeId);
  }

  async remove(tradeId: number): Promise<boolean> {
    const result = await this.repo.delete({ tradeId });
    return (result.affected ?? 0) > 0;
  }
}
