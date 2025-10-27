import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prosumers } from './user.entity';
import { CreateProsumersInput } from './dto/Prosumers.input';
import { ProsumersArgs } from './dto/Prosumers.args';
// Removed: BlockchainApprovals (not used), DeviceCommands (table dropped)
import { IdrsConversions } from '../idrsConversion/idrsConversion.entity';
import { MarketTrades } from '../marketTrade/marketTrade.entity';
import { SmartMeters } from '../smartMeter/SmartMeters.entity';
import { TradeOrdersCache } from '../tradeOrdersCache/TradeOrdersCache.entity';
import { TransactionLogs } from '../transactionLog/TransactionLogs.entity';
import { Wallets } from '../wallet/Wallets.entity';

@Injectable()
export class ProsumersService {
  constructor(
    @InjectRepository(Prosumers)
    private readonly repo: Repository<Prosumers>,
    @InjectRepository(IdrsConversions)
    private readonly IdrsConversionsRepo: Repository<IdrsConversions>,
    @InjectRepository(MarketTrades)
    private readonly MarketTradesRepo: Repository<MarketTrades>,
    @InjectRepository(SmartMeters)
    private readonly SmartMetersRepo: Repository<SmartMeters>,
    @InjectRepository(TradeOrdersCache)
    private readonly TradeOrdersCacheRepo: Repository<TradeOrdersCache>,
    @InjectRepository(TransactionLogs)
    private readonly TransactionLogsRepo: Repository<TransactionLogs>,
    @InjectRepository(Wallets)
    private readonly WalletsRepo: Repository<Wallets>,
  ) {}

  async findAll(args?: ProsumersArgs): Promise<Prosumers[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.prosumerId !== undefined)
      where['prosumerId'] = args.prosumerId;
    if (args && args.email !== undefined) where['email'] = args.email;
    if (args && args.passwordHash !== undefined)
      where['passwordHash'] = args.passwordHash;
    if (args && args.name !== undefined) where['name'] = args.name;
    if (args && args.createdAt !== undefined)
      where['createdAt'] = args.createdAt;
    if (args && args.updatedAt !== undefined)
      where['updatedAt'] = args.updatedAt;

    return this.repo.find({ where });
  }

  async findByMeterId(meterId: string): Promise<Prosumers[]> {
    const smartMeters = await this.SmartMetersRepo.find({
      where: { meterId },
      relations: ['prosumers'],
    });

    if (!smartMeters || smartMeters.length === 0) {
      throw new Error(`No smart meters found for meterId ${meterId}`);
    }

    return smartMeters.map((meter) => meter.prosumers);
  }

  async findByWalletAddress(walletAddress: string): Promise<Prosumers[]> {
    const wallets = await this.WalletsRepo.find({
      where: { walletAddress },
      relations: ['prosumers'],
    });

    if (!wallets || wallets.length === 0) {
      throw new Error(`No wallets found for walletAddress ${walletAddress}`);
    }

    return wallets.map((wallet) => wallet.prosumers);
  }

  async findOne(prosumerId: string): Promise<Prosumers> {
    const entity = await this.repo.findOne({
      where: { prosumerId },
    });
    if (!entity) {
      throw new Error(`Prosumers with prosumerId ${'$'}{prosumerId} not found`);
    }
    return entity;
  }

  async create(input: CreateProsumersInput): Promise<Prosumers> {
    // Convert input types to match entity types
    const createData: Partial<Prosumers> = {
      prosumerId: input.prosumerId,
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name,
      createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
      updatedAt: input.updatedAt ? new Date(input.updatedAt) : new Date(),
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.prosumerId);
  }

  async updatePrimaryWalletAddress(
    prosumerId: string,
    primaryWalletAddress: string,
  ): Promise<Prosumers> {
    const existing = await this.findOne(prosumerId);
    existing.primaryWalletAddress = primaryWalletAddress;

    await this.repo.save(existing);
    return this.findOne(prosumerId);
  }

  async getPrimaryWallet(prosumerId: string): Promise<Wallets | null> {
    const prosumer = await this.findOne(prosumerId);
    const primaryWalletAddress = prosumer.primaryWalletAddress;
    if (!primaryWalletAddress) {
      return null;
    }
    return this.WalletsRepo.findOne({
      where: { walletAddress: primaryWalletAddress },
    });
  }

  async update(
    prosumerId: string,
    input: CreateProsumersInput,
  ): Promise<Prosumers> {
    const existing = await this.findOne(prosumerId);

    // Convert input types to match entity types
    const updateData: Partial<Prosumers> = {
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name,
      updatedAt: input.updatedAt ? new Date(input.updatedAt) : new Date(),
      // createdAt is typically not updated, but if needed, you can uncomment the line below
      // createdAt: input.createdAt ? new Date(input.createdAt) : existing.createdAt
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(prosumerId);
  }

  async remove(prosumerId: string): Promise<boolean> {
    const result = await this.repo.delete({ prosumerId });
    return (result.affected ?? 0) > 0;
  }
}
