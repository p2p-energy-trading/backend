import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateProsumersInput } from './dto/Prosumers.input';
import { ProsumersArgs } from './dto/Prosumers.args';
// Removed: BlockchainApprovals (not used), DeviceCommands (table dropped)
import { IdrsConversion } from '../idrsConversion/idrsConversion.entity';
import { MarketTrade } from '../marketTrade/marketTrade.entity';
import { SmartMeter } from '../smartMeter/smartMeter.entity';
import { TradeOrdersCache } from '../tradeOrderCache/tradeOrderCache.entity';
import { TransactionLog } from '../transactionLog/transactionLog.entity';
import { Wallet } from '../wallet/wallet.entity';

@Injectable()
export class ProsumersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(IdrsConversion)
    private readonly IdrsConversionsRepo: Repository<IdrsConversion>,
    @InjectRepository(MarketTrade)
    private readonly MarketTradesRepo: Repository<MarketTrade>,
    @InjectRepository(SmartMeter)
    private readonly SmartMetersRepo: Repository<SmartMeter>,
    @InjectRepository(TradeOrdersCache)
    private readonly TradeOrdersCacheRepo: Repository<TradeOrdersCache>,
    @InjectRepository(TransactionLog)
    private readonly TransactionLogsRepo: Repository<TransactionLog>,
    @InjectRepository(Wallet)
    private readonly WalletsRepo: Repository<Wallet>,
  ) {}

  async findAll(args?: ProsumersArgs): Promise<User[]> {
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

  async findByMeterId(meterId: string): Promise<User[]> {
    const smartMeters = await this.SmartMetersRepo.find({
      where: { meterId },
      relations: ['prosumers'],
    });

    if (!smartMeters || smartMeters.length === 0) {
      throw new Error(`No smart meters found for meterId ${meterId}`);
    }

    return smartMeters.map((meter) => meter.prosumers);
  }

  async findByWalletAddress(walletAddress: string): Promise<User[]> {
    const wallets = await this.WalletsRepo.find({
      where: { walletAddress },
      relations: ['prosumers'],
    });

    if (!wallets || wallets.length === 0) {
      throw new Error(`No wallets found for walletAddress ${walletAddress}`);
    }

    return wallets.map((wallet) => wallet.prosumers);
  }

  async findOne(prosumerId: string): Promise<User> {
    const entity = await this.repo.findOne({
      where: { prosumerId },
    });
    if (!entity) {
      throw new Error(`Prosumers with prosumerId ${'$'}{prosumerId} not found`);
    }
    return entity;
  }

  async create(input: CreateProsumersInput): Promise<User> {
    // Convert input types to match entity types
    const createData: Partial<User> = {
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
  ): Promise<User> {
    const existing = await this.findOne(prosumerId);
    existing.primaryWalletAddress = primaryWalletAddress;

    await this.repo.save(existing);
    return this.findOne(prosumerId);
  }

  async getPrimaryWallet(prosumerId: string): Promise<Wallet | null> {
    const prosumer = await this.findOne(prosumerId);
    const primaryWalletAddress = prosumer.primaryWalletAddress;
    if (!primaryWalletAddress) {
      return null;
    }
    return this.WalletsRepo.findOne({
      where: { walletAddress: primaryWalletAddress },
    });
  }

  async update(prosumerId: string, input: CreateProsumersInput): Promise<User> {
    const existing = await this.findOne(prosumerId);

    // Convert input types to match entity types
    const updateData: Partial<User> = {
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
