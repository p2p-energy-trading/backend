import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TradeOrdersCache } from './TradeOrdersCache.entity';
import { CreateTradeOrdersCacheInput } from './dto/TradeOrdersCache.input';
import { TradeOrdersCacheArgs } from './dto/TradeOrdersCache.args';
import { Prosumers } from '../prosumer/user.entity';
import { Wallets } from '../wallet/Wallets.entity';
import { TransactionLogs } from '../transactionLog/TransactionLogs.entity';

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
    if (args && args.prosumerId !== undefined)
      where['prosumerId'] = args.prosumerId;
    if (args && args.walletAddress !== undefined)
      where['walletAddress'] = args.walletAddress;
    if (args && args.orderType !== undefined)
      where['orderType'] = args.orderType;
    if (args && args.pair !== undefined) where['pair'] = args.pair;
    if (args && args.amountEtk !== undefined)
      where['amountEtk'] = args.amountEtk;
    if (args && args.priceIdrsPerEtk !== undefined)
      where['priceIdrsPerEtk'] = args.priceIdrsPerEtk;
    if (args && args.totalIdrsValue !== undefined)
      where['totalIdrsValue'] = args.totalIdrsValue;
    if (args && args.statusOnChain !== undefined)
      where['statusOnChain'] = args.statusOnChain;
    if (args && args.createdAtOnChain !== undefined)
      where['createdAtOnChain'] = args.createdAtOnChain;
    if (args && args.updatedAtCache !== undefined)
      where['updatedAtCache'] = args.updatedAtCache;
    if (args && args.blockchainTxHashPlaced !== undefined)
      where['blockchainTxHashPlaced'] = args.blockchainTxHashPlaced;
    if (args && args.blockchainTxHashFilled !== undefined)
      where['blockchainTxHashFilled'] = args.blockchainTxHashFilled;

    return this.repo.find({ where });
  }

  async findOpenOrPartiallyFilledOrders() {
    return this.repo.find({
      where: {
        statusOnChain: In(['OPEN', 'PARTIALLY_FILLED']),
      },
    });
  }

  async findOne(orderId: string): Promise<TradeOrdersCache> {
    const relations = ['prosumers', 'wallets', 'transactionlogsList'];
    const entity = await this.repo.findOne({ where: { orderId }, relations });
    if (!entity) {
      throw new Error(
        `TradeOrdersCache with orderId ${'$'}{orderId} not found`,
      );
    }
    return entity;
  }

  async create(input: CreateTradeOrdersCacheInput): Promise<TradeOrdersCache> {
    // Convert input types to match entity types
    const createData: Partial<TradeOrdersCache> = {
      orderId: input.orderId,
      prosumerId: input.prosumerId,
      walletAddress: input.walletAddress,
      orderType: input.orderType,
      pair: input.pair,
      amountEtk: input.amountEtk,
      priceIdrsPerEtk: input.priceIdrsPerEtk,
      totalIdrsValue: input.totalIdrsValue,
      statusOnChain: input.statusOnChain,
      blockchainTxHashPlaced: input.blockchainTxHashPlaced,
      blockchainTxHashFilled: input.blockchainTxHashFilled,
      createdAtOnChain: input.createdAtOnChain
        ? new Date(input.createdAtOnChain)
        : new Date(),
      updatedAtCache: input.updatedAtCache
        ? new Date(input.updatedAtCache)
        : new Date(),
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.orderId);
  }

  async update(
    orderId: string,
    input: CreateTradeOrdersCacheInput,
  ): Promise<TradeOrdersCache> {
    const existing = await this.findOne(orderId);

    // Convert input types to match entity types
    const updateData: Partial<TradeOrdersCache> = {
      prosumerId: input.prosumerId,
      walletAddress: input.walletAddress,
      orderType: input.orderType,
      pair: input.pair,
      amountEtk: input.amountEtk,
      priceIdrsPerEtk: input.priceIdrsPerEtk,
      totalIdrsValue: input.totalIdrsValue,
      statusOnChain: input.statusOnChain,
      blockchainTxHashPlaced: input.blockchainTxHashPlaced,
      blockchainTxHashFilled: input.blockchainTxHashFilled,
      blockchainTxHashCancelled: input.blockchainTxHashCancelled,
      createdAtOnChain: input.createdAtOnChain
        ? new Date(input.createdAtOnChain)
        : new Date(),
      updatedAtCache: input.updatedAtCache
        ? new Date(input.updatedAtCache)
        : new Date(),
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(orderId);
  }

  async remove(orderId: string): Promise<boolean> {
    const result = await this.repo.delete({ orderId });
    return (result.affected ?? 0) > 0;
  }
}
