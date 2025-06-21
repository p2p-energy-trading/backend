import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TransactionLogs } from './entities/TransactionLogs.entity';
import { CreateTransactionLogsInput } from './dto/TransactionLogs.input';
import { TransactionLogsArgs } from './dto/TransactionLogs.args';
import { TradeOrdersCache } from '../TradeOrdersCache/entities/TradeOrdersCache.entity';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
import { EnergySettlements } from '../EnergySettlements/entities/EnergySettlements.entity';

@Injectable()
export class TransactionLogsService {
  constructor(
    @InjectRepository(TransactionLogs)
    private readonly repo: Repository<TransactionLogs>,
    @InjectRepository(TradeOrdersCache)
    private readonly TradeOrdersCacheRepo: Repository<TradeOrdersCache>,
    @InjectRepository(Prosumers)
    private readonly ProsumersRepo: Repository<Prosumers>,
    @InjectRepository(EnergySettlements)
    private readonly EnergySettlementsRepo: Repository<EnergySettlements>,
  ) {}

  async findAll(args?: TransactionLogsArgs): Promise<TransactionLogs[]> {
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

  async findOne(logId: any): Promise<TransactionLogs> {
    const relations = ['tradeorderscache', 'prosumers', 'energysettlements'];
    const entity = await this.repo.findOne({ where: { logId }, relations });
    if (!entity) {
      throw new Error(`TransactionLogs with logId ${'$'}{logId} not found`);
    }
    return entity;
  }

  async create(input: CreateTransactionLogsInput): Promise<TransactionLogs> {
    // Convert input types to match entity types
    const createData: Partial<TransactionLogs> = { ...input } as any;

    if (input.transactionTimestamp)
      (createData as any).transactionTimestamp = new Date(
        input.transactionTimestamp,
      );

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.logId);
  }

  async update(
    logId: any,
    input: CreateTransactionLogsInput,
  ): Promise<TransactionLogs> {
    const existing = await this.findOne(logId);

    // Convert input types to match entity types
    const updateData: Partial<TransactionLogs> = { ...input } as any;

    if (input.transactionTimestamp)
      (updateData as any).transactionTimestamp = new Date(
        input.transactionTimestamp,
      );

    // Handle tradeorderscache relation update
    if (input.tradeorderscacheIds !== undefined) {
      if (input.tradeorderscacheIds.length > 0) {
        const tradeorderscacheEntities = await this.TradeOrdersCacheRepo.findBy(
          { orderId: In(input.tradeorderscacheIds) },
        );
        (updateData as any).tradeorderscache = tradeorderscacheEntities;
      } else {
        (updateData as any).tradeorderscache = [];
      }
    }
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
    // Handle energysettlements relation update
    if (input.energysettlementsIds !== undefined) {
      if (input.energysettlementsIds.length > 0) {
        const energysettlementsEntities =
          await this.EnergySettlementsRepo.findBy({
            settlementId: In(input.energysettlementsIds),
          });
        (updateData as any).energysettlements = energysettlementsEntities;
      } else {
        (updateData as any).energysettlements = [];
      }
    }

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(logId);
  }

  async remove(logId: any): Promise<boolean> {
    const result = await this.repo.delete({ logId });
    return (result.affected ?? 0) > 0;
  }

  async findTradeorderscache(logId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { logId },
      relations: ['tradeorderscache'],
    });
    const entity = parent?.tradeorderscache;
    if (!entity) return [];
    // Convert entity to match GraphQL output format
    return [
      {
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
      },
    ];
  }

  async findProsumers(logId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { logId },
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

  async findEnergysettlements(logId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { logId },
      relations: ['energysettlements'],
    });
    const entity = parent?.energysettlements;
    if (!entity) return [];
    // Convert entity to match GraphQL output format
    return [
      {
        ...entity,
        periodStartTime: entity.periodStartTime
          ? entity.periodStartTime instanceof Date
            ? entity.periodStartTime.toISOString()
            : entity.periodStartTime
          : null,
        periodEndTime: entity.periodEndTime
          ? entity.periodEndTime instanceof Date
            ? entity.periodEndTime.toISOString()
            : entity.periodEndTime
          : null,
        createdAtBackend: entity.createdAtBackend
          ? entity.createdAtBackend instanceof Date
            ? entity.createdAtBackend.toISOString()
            : entity.createdAtBackend
          : null,
        confirmedAtOnChain: entity.confirmedAtOnChain
          ? entity.confirmedAtOnChain instanceof Date
            ? entity.confirmedAtOnChain.toISOString()
            : entity.confirmedAtOnChain
          : null,
      },
    ];
  }
}
