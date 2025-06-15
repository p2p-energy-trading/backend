import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EnergySettlements } from './entities/EnergySettlements.entity';
import { CreateEnergySettlementsInput } from './dto/EnergySettlements.input';
import { EnergySettlementsArgs } from './dto/EnergySettlements.args';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { MqttMessageLogs } from '../MqttMessageLogs/entities/MqttMessageLogs.entity';
import { TransactionLogs } from '../TransactionLogs/entities/TransactionLogs.entity';

@Injectable()
export class EnergySettlementsService {
  constructor(
    @InjectRepository(EnergySettlements)
    private readonly repo: Repository<EnergySettlements>,
    @InjectRepository(SmartMeters)
    private readonly SmartMetersRepo: Repository<SmartMeters>,
    @InjectRepository(MqttMessageLogs)
    private readonly MqttMessageLogsRepo: Repository<MqttMessageLogs>,
    @InjectRepository(TransactionLogs)
    private readonly TransactionLogsRepo: Repository<TransactionLogs>,
  ) {}

  async findAll(args?: EnergySettlementsArgs): Promise<EnergySettlements[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.settlementId !== undefined)
      where['settlementId'] = args.settlementId;
    if (args && args.meterId !== undefined) where['meterId'] = args.meterId;
    if (args && args.periodStartTime !== undefined)
      where['periodStartTime'] = args.periodStartTime;
    if (args && args.periodEndTime !== undefined)
      where['periodEndTime'] = args.periodEndTime;
    if (args && args.netKwhFromGrid !== undefined)
      where['netKwhFromGrid'] = args.netKwhFromGrid;
    if (args && args.etkAmountCredited !== undefined)
      where['etkAmountCredited'] = args.etkAmountCredited;
    if (args && args.blockchainTxHash !== undefined)
      where['blockchainTxHash'] = args.blockchainTxHash;
    if (args && args.status !== undefined) where['status'] = args.status;
    if (args && args.createdAtBackend !== undefined)
      where['createdAtBackend'] = args.createdAtBackend;
    if (args && args.confirmedAtOnChain !== undefined)
      where['confirmedAtOnChain'] = args.confirmedAtOnChain;
    if (args && args.settlementTrigger !== undefined)
      where['settlementTrigger'] = args.settlementTrigger;
    if (args && args.rawExportKwh !== undefined)
      where['rawExportKwh'] = args.rawExportKwh;
    if (args && args.rawImportKwh !== undefined)
      where['rawImportKwh'] = args.rawImportKwh;
    if (args && args.validationStatus !== undefined)
      where['validationStatus'] = args.validationStatus;
    if (args && args.settlementDataSource !== undefined)
      where['settlementDataSource'] = args.settlementDataSource;
    if (args && args.detailedEnergyBreakdown !== undefined)
      where['detailedEnergyBreakdown'] = args.detailedEnergyBreakdown;
    if (args && args.mqttMessageId !== undefined)
      where['mqttMessageId'] = args.mqttMessageId;

    const relations = ['smartmeters', 'mqttmessagelogs', 'transactionlogsList'];
    return this.repo.find({ where, relations });
  }

  async findOne(settlementId: any): Promise<EnergySettlements> {
    const relations = ['smartmeters', 'mqttmessagelogs', 'transactionlogsList'];
    const entity = await this.repo.findOne({
      where: { settlementId },
      relations,
    });
    if (!entity) {
      throw new Error(
        `EnergySettlements with settlementId ${'$'}{settlementId} not found`,
      );
    }
    return entity;
  }

  async create(
    input: CreateEnergySettlementsInput,
  ): Promise<EnergySettlements> {
    // Convert input types to match entity types
    const createData: Partial<EnergySettlements> = { ...input } as any;

    if (input.periodStartTime)
      (createData as any).periodStartTime = new Date(input.periodStartTime);
    if (input.periodEndTime)
      (createData as any).periodEndTime = new Date(input.periodEndTime);
    if (input.createdAtBackend)
      (createData as any).createdAtBackend = new Date(input.createdAtBackend);
    if (input.confirmedAtOnChain)
      (createData as any).confirmedAtOnChain = new Date(
        input.confirmedAtOnChain,
      );

    // Handle smartmeters relation
    if (input.smartmetersIds && input.smartmetersIds.length > 0) {
      const smartmetersEntities = await this.SmartMetersRepo.findBy({
        meterId: In(input.smartmetersIds),
      });
      (createData as any).smartmeters = smartmetersEntities;
    }
    // Handle mqttmessagelogs relation
    if (input.mqttmessagelogsIds && input.mqttmessagelogsIds.length > 0) {
      const mqttmessagelogsEntities = await this.MqttMessageLogsRepo.findBy({
        logId: In(input.mqttmessagelogsIds),
      });
      (createData as any).mqttmessagelogs = mqttmessagelogsEntities;
    }

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.settlementId);
  }

  async update(
    settlementId: any,
    input: CreateEnergySettlementsInput,
  ): Promise<EnergySettlements> {
    const existing = await this.findOne(settlementId);

    // Convert input types to match entity types
    const updateData: Partial<EnergySettlements> = { ...input } as any;

    if (input.periodStartTime)
      (updateData as any).periodStartTime = new Date(input.periodStartTime);
    if (input.periodEndTime)
      (updateData as any).periodEndTime = new Date(input.periodEndTime);
    if (input.createdAtBackend)
      (updateData as any).createdAtBackend = new Date(input.createdAtBackend);
    if (input.confirmedAtOnChain)
      (updateData as any).confirmedAtOnChain = new Date(
        input.confirmedAtOnChain,
      );

    // Handle smartmeters relation update
    if (input.smartmetersIds !== undefined) {
      if (input.smartmetersIds.length > 0) {
        const smartmetersEntities = await this.SmartMetersRepo.findBy({
          meterId: In(input.smartmetersIds),
        });
        (updateData as any).smartmeters = smartmetersEntities;
      } else {
        (updateData as any).smartmeters = [];
      }
    }
    // Handle mqttmessagelogs relation update
    if (input.mqttmessagelogsIds !== undefined) {
      if (input.mqttmessagelogsIds.length > 0) {
        const mqttmessagelogsEntities = await this.MqttMessageLogsRepo.findBy({
          logId: In(input.mqttmessagelogsIds),
        });
        (updateData as any).mqttmessagelogs = mqttmessagelogsEntities;
      } else {
        (updateData as any).mqttmessagelogs = [];
      }
    }

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(settlementId);
  }

  async remove(settlementId: any): Promise<boolean> {
    const result = await this.repo.delete({ settlementId });
    return (result.affected ?? 0) > 0;
  }

  async findSmartmeters(settlementId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { settlementId },
      relations: ['smartmeters'],
    });
    const entity = parent?.smartmeters;
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
      },
    ];
  }

  async findMqttmessagelogs(settlementId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { settlementId },
      relations: ['mqttmessagelogs'],
    });
    const entity = parent?.mqttmessagelogs;
    if (!entity) return [];
    // Convert entity to match GraphQL output format
    return [
      {
        ...entity,
        messageTimestamp: entity.messageTimestamp
          ? entity.messageTimestamp instanceof Date
            ? entity.messageTimestamp.toISOString()
            : entity.messageTimestamp
          : null,
        processedAt: entity.processedAt
          ? entity.processedAt instanceof Date
            ? entity.processedAt.toISOString()
            : entity.processedAt
          : null,
      },
    ];
  }

  async findTransactionlogsList(settlementId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { settlementId },
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
}
