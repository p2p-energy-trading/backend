import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUsersInput } from './dto/Users.input';
import { UsersArgs } from './dto/Users.args';
// Removed: BlockchainApprovals (not used), DeviceCommands (table dropped), TradeOrdersCache (replaced by Redis)
import { IdrsConversion } from '../idrsConversion/idrsConversion.entity';
import { MarketTrade } from '../marketTrade/marketTrade.entity';
import { SmartMeter } from '../smartMeter/smartMeter.entity';
import { TransactionLog } from '../transactionLog/transactionLog.entity';
import { Wallet } from '../wallet/wallet.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(IdrsConversion)
    private readonly IdrsConversionsRepo: Repository<IdrsConversion>,
    @InjectRepository(MarketTrade)
    private readonly MarketTradesRepo: Repository<MarketTrade>,
    @InjectRepository(SmartMeter)
    private readonly SmartMetersRepo: Repository<SmartMeter>,
    // Removed: TradeOrdersCacheRepo (replaced by Redis)
    @InjectRepository(TransactionLog)
    private readonly TransactionLogsRepo: Repository<TransactionLog>,
    @InjectRepository(Wallet)
    private readonly WalletsRepo: Repository<Wallet>,
  ) {}

  async findAll(args?: UsersArgs): Promise<User[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.userId !== undefined) where['userId'] = args.userId;
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
      relations: ['users'],
    });

    if (!smartMeters || smartMeters.length === 0) {
      throw new Error(`No smart meters found for meterId ${meterId}`);
    }

    return smartMeters.map((meter) => meter.users);
  }

  async findByWalletAddress(walletAddress: string): Promise<User[]> {
    const wallets = await this.WalletsRepo.find({
      where: { walletAddress },
      relations: ['users'],
    });

    if (!wallets || wallets.length === 0) {
      throw new Error(`No wallets found for walletAddress ${walletAddress}`);
    }

    return wallets.map((wallet) => wallet.users);
  }

  async findOne(userId: string): Promise<User> {
    const entity = await this.repo.findOne({
      where: { userId },
    });
    if (!entity) {
      throw new Error(`User with userId ${'$'}{userId} not found`);
    }
    return entity;
  }

  async create(input: CreateUsersInput): Promise<User> {
    // Convert input types to match entity types
    const createData: Partial<User> = {
      userId: input.userId,
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name,
      createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
      updatedAt: input.updatedAt ? new Date(input.updatedAt) : new Date(),
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.userId);
  }

  async updatePrimaryWalletAddress(
    userId: string,
    primaryWalletAddress: string,
  ): Promise<User> {
    const existing = await this.findOne(userId);
    existing.primaryWalletAddress = primaryWalletAddress;

    await this.repo.save(existing);
    return this.findOne(userId);
  }

  async getPrimaryWallet(userId: string): Promise<Wallet | null> {
    const user = await this.findOne(userId);
    const primaryWalletAddress = user.primaryWalletAddress;
    if (!primaryWalletAddress) {
      return null;
    }
    return this.WalletsRepo.findOne({
      where: { walletAddress: primaryWalletAddress },
    });
  }

  async update(userId: string, input: CreateUsersInput): Promise<User> {
    const existing = await this.findOne(userId);

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
    return this.findOne(userId);
  }

  async remove(userId: string): Promise<boolean> {
    const result = await this.repo.delete({ userId });
    return (result.affected ?? 0) > 0;
  }
}
