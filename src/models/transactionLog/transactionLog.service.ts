import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionLog } from './transactionLog.entity';
import { CreateTransactionLogsInput } from './dto/transactionLog.input';
import { TransactionLogsArgs } from './dto/transactionLog.args';
// Removed: TradeOrdersCache (replaced by Redis)
import { User } from '../user/user.entity';
import { EnergySettlement } from '../energySettlement/energySettlement.entity';

@Injectable()
export class TransactionLogsService {
  constructor(
    @InjectRepository(TransactionLog)
    private readonly repo: Repository<TransactionLog>,
    // Removed: TradeOrdersCacheRepo (replaced by Redis)
    @InjectRepository(User)
    private readonly ProsumersRepo: Repository<User>,
    @InjectRepository(EnergySettlement)
    private readonly EnergySettlementsRepo: Repository<EnergySettlement>,
  ) {}

  async findAll(args?: TransactionLogsArgs): Promise<TransactionLog[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.logId !== undefined) where['logId'] = args.logId;
    if (args && args.prosumerId !== undefined)
      where['prosumerId'] = args.prosumerId;
    if (args && args.relatedOrderId !== undefined)
      where['relatedOrderId'] = args.relatedOrderId;
    if (args && args.relatedSettlementId !== undefined)
      where['relatedSettlementId'] = args.relatedSettlementId;
    if (args && args.transactionType !== undefined)
      where['transactionType'] = args.transactionType;
    if (args && args.description !== undefined)
      where['description'] = args.description;
    if (args && args.amountPrimary !== undefined)
      where['amountPrimary'] = args.amountPrimary;
    if (args && args.currencyPrimary !== undefined)
      where['currencyPrimary'] = args.currencyPrimary;
    if (args && args.amountSecondary !== undefined)
      where['amountSecondary'] = args.amountSecondary;
    if (args && args.currencySecondary !== undefined)
      where['currencySecondary'] = args.currencySecondary;
    if (args && args.blockchainTxHash !== undefined)
      where['blockchainTxHash'] = args.blockchainTxHash;
    if (args && args.transactionTimestamp !== undefined)
      where['transactionTimestamp'] = args.transactionTimestamp;

    return this.repo.find({ where });
  }

  async findOne(logId: number): Promise<TransactionLog> {
    const entity = await this.repo.findOne({ where: { logId } });
    if (!entity) {
      throw new Error(`TransactionLogs with logId ${'$'}{logId} not found`);
    }
    return entity;
  }

  async findByTxHash(
    blockchainTxHash: string,
  ): Promise<TransactionLog | undefined> {
    const result = await this.repo.findOne({ where: { blockchainTxHash } });
    return result ?? undefined;
  }

  async create(input: CreateTransactionLogsInput): Promise<TransactionLog> {
    // Convert input types to match entity types
    const createData: Partial<TransactionLog> = {
      prosumerId: input.prosumerId,
      relatedOrderId: input.relatedOrderId,
      relatedSettlementId: input.relatedSettlementId,
      transactionType: input.transactionType,
      description: input.description,
      amountPrimary: input.amountPrimary,
      currencyPrimary: input.currencyPrimary,
      amountSecondary: input.amountSecondary,
      currencySecondary: input.currencySecondary,
      blockchainTxHash: input.blockchainTxHash,
      transactionTimestamp: input.transactionTimestamp
        ? new Date(input.transactionTimestamp)
        : undefined,
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.logId);
  }

  async update(
    logId: number,
    input: CreateTransactionLogsInput,
  ): Promise<TransactionLog> {
    const existing = await this.findOne(logId);

    // Convert input types to match entity types
    const updateData: Partial<TransactionLog> = {
      prosumerId: input.prosumerId,
      relatedOrderId: input.relatedOrderId,
      relatedSettlementId: input.relatedSettlementId,
      transactionType: input.transactionType,
      description: input.description,
      amountPrimary: input.amountPrimary,
      currencyPrimary: input.currencyPrimary,
      amountSecondary: input.amountSecondary,
      currencySecondary: input.currencySecondary,
      blockchainTxHash: input.blockchainTxHash,
      transactionTimestamp: input.transactionTimestamp
        ? new Date(input.transactionTimestamp)
        : undefined,
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(logId);
  }

  async remove(logId: number): Promise<boolean> {
    const result = await this.repo.delete({ logId });
    return (result.affected ?? 0) > 0;
  }
}
