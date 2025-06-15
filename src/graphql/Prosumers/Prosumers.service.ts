import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Prosumers } from './entities/Prosumers.entity';
import { CreateProsumersInput } from './dto/Prosumers.input';
import { ProsumersArgs } from './dto/Prosumers.args';
import { BlockchainApprovals } from '../BlockchainApprovals/entities/BlockchainApprovals.entity';
import { DeviceCommands } from '../DeviceCommands/entities/DeviceCommands.entity';
import { IdrsConversions } from '../IdrsConversions/entities/IdrsConversions.entity';
import { MarketTrades } from '../MarketTrades/entities/MarketTrades.entity';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { TradeOrdersCache } from '../TradeOrdersCache/entities/TradeOrdersCache.entity';
import { TransactionLogs } from '../TransactionLogs/entities/TransactionLogs.entity';
import { Wallets } from '../Wallets/entities/Wallets.entity';

@Injectable()
export class ProsumersService {
  constructor(
    @InjectRepository(Prosumers)
    private readonly repo: Repository<Prosumers>,
    @InjectRepository(BlockchainApprovals)
    private readonly BlockchainApprovalsRepo: Repository<BlockchainApprovals>,
    @InjectRepository(DeviceCommands)
    private readonly DeviceCommandsRepo: Repository<DeviceCommands>,
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

    const relations = [
      'blockchainapprovalsList',
      'devicecommandsList',
      'idrsconversionsList',
      'markettradesList',
      'markettradesList2',
      'smartmetersList',
      'tradeorderscacheList',
      'transactionlogsList',
      'walletsList',
    ];
    return this.repo.find({ where, relations });
  }

  async findOne(prosumerId: any): Promise<Prosumers> {
    const relations = [
      'blockchainapprovalsList',
      'devicecommandsList',
      'idrsconversionsList',
      'markettradesList',
      'markettradesList2',
      'smartmetersList',
      'tradeorderscacheList',
      'transactionlogsList',
      'walletsList',
    ];
    const entity = await this.repo.findOne({
      where: { prosumerId },
      relations,
    });
    if (!entity) {
      throw new Error(`Prosumers with prosumerId ${'$'}{prosumerId} not found`);
    }
    return entity;
  }

  async create(input: CreateProsumersInput): Promise<Prosumers> {
    // Convert input types to match entity types
    const createData: Partial<Prosumers> = { ...input } as any;

    if (input.createdAt)
      (createData as any).createdAt = new Date(input.createdAt);
    if (input.updatedAt)
      (createData as any).updatedAt = new Date(input.updatedAt);

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.prosumerId);
  }

  async update(
    prosumerId: any,
    input: CreateProsumersInput,
  ): Promise<Prosumers> {
    const existing = await this.findOne(prosumerId);

    // Convert input types to match entity types
    const updateData: Partial<Prosumers> = { ...input } as any;

    if (input.createdAt)
      (updateData as any).createdAt = new Date(input.createdAt);
    if (input.updatedAt)
      (updateData as any).updatedAt = new Date(input.updatedAt);

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(prosumerId);
  }

  async remove(prosumerId: any): Promise<boolean> {
    const result = await this.repo.delete({ prosumerId });
    return (result.affected ?? 0) > 0;
  }

  async findBlockchainapprovalsList(prosumerId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { prosumerId },
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

  async findDevicecommandsList(prosumerId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { prosumerId },
      relations: ['devicecommandsList'],
    });
    const entities = parent?.devicecommandsList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      sentAt: entity.sentAt
        ? entity.sentAt instanceof Date
          ? entity.sentAt.toISOString()
          : entity.sentAt
        : null,
      acknowledgedAt: entity.acknowledgedAt
        ? entity.acknowledgedAt instanceof Date
          ? entity.acknowledgedAt.toISOString()
          : entity.acknowledgedAt
        : null,
      timeoutAt: entity.timeoutAt
        ? entity.timeoutAt instanceof Date
          ? entity.timeoutAt.toISOString()
          : entity.timeoutAt
        : null,
    }));
  }

  async findIdrsconversionsList(prosumerId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { prosumerId },
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

  async findMarkettradesList(prosumerId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { prosumerId },
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

  async findMarkettradesList2(prosumerId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { prosumerId },
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

  async findSmartmetersList(prosumerId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { prosumerId },
      relations: ['smartmetersList'],
    });
    const entities = parent?.smartmetersList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      createdAt: entity.createdAt
        ? entity.createdAt instanceof Date
          ? entity.createdAt.toISOString()
          : entity.createdAt
        : null,
      lastSeen: entity.lastSeen
        ? entity.lastSeen instanceof Date
          ? entity.lastSeen.toISOString()
          : entity.lastSeen
        : null,
      updatedAt: entity.updatedAt
        ? entity.updatedAt instanceof Date
          ? entity.updatedAt.toISOString()
          : entity.updatedAt
        : null,
      lastSettlementAt: entity.lastSettlementAt
        ? entity.lastSettlementAt instanceof Date
          ? entity.lastSettlementAt.toISOString()
          : entity.lastSettlementAt
        : null,
      lastHeartbeatAt: entity.lastHeartbeatAt
        ? entity.lastHeartbeatAt instanceof Date
          ? entity.lastHeartbeatAt.toISOString()
          : entity.lastHeartbeatAt
        : null,
    }));
  }

  async findTradeorderscacheList(prosumerId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { prosumerId },
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

  async findTransactionlogsList(prosumerId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { prosumerId },
      relations: ['transactionlogsList'],
    });
    const entities = parent?.transactionlogsList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
      ...entity,
      transactionTimestamp: entity.transactionTimestamp
        ? entity.transactionTimestamp instanceof Date
          ? entity.transactionTimestamp.toISOString()
          : entity.transactionTimestamp
        : null,
    }));
  }

  async findWalletsList(prosumerId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { prosumerId },
      relations: ['walletsList'],
    });
    const entities = parent?.walletsList || [];
    // Convert entities to match GraphQL output format
    return entities.map((entity) => ({
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
    }));
  }
}
