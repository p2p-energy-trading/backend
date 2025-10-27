import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnergySettlements } from './energySettlement.entity';
import { CreateEnergySettlementsInput } from './dto/energySettlement.input';
import { EnergySettlementsArgs } from './dto/energySettlement.args';
import { SmartMeters } from '../smartMeter/SmartMeters.entity';
// Removed: MqttMessageLogs (table dropped)
import { TransactionLogs } from '../transactionLog/TransactionLogs.entity';

@Injectable()
export class EnergySettlementsService {
  constructor(
    @InjectRepository(EnergySettlements)
    private readonly repo: Repository<EnergySettlements>,
    @InjectRepository(SmartMeters)
    private readonly SmartMetersRepo: Repository<SmartMeters>,
    // Removed: MqttMessageLogsRepo
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

    return this.repo.find({ where });
  }

  async findOne(settlementId: number): Promise<EnergySettlements> {
    const entity = await this.repo.findOne({
      where: { settlementId },
    });
    if (!entity) {
      throw new Error(
        `EnergySettlements with settlementId ${'$'}{settlementId} not found`,
      );
    }
    return entity;
  }

  async findByTxHash(txHash: string): Promise<EnergySettlements | null> {
    const entity = await this.repo.findOne({
      where: { blockchainTxHash: txHash },
    });
    return entity || null;
  }

  async create(
    input: CreateEnergySettlementsInput,
  ): Promise<EnergySettlements> {
    // Convert input types to match entity types
    const createData: Partial<EnergySettlements> = {
      meterId: input.meterId,
      periodStartTime: input.periodStartTime
        ? new Date(input.periodStartTime)
        : undefined,
      periodEndTime: input.periodEndTime
        ? new Date(input.periodEndTime)
        : undefined,
      netKwhFromGrid: input.netKwhFromGrid ?? undefined,
      etkAmountCredited: input.etkAmountCredited ?? undefined,
      blockchainTxHash: input.blockchainTxHash ?? undefined,
      status: input.status,
      createdAtBackend: input.createdAtBackend
        ? new Date(input.createdAtBackend)
        : new Date(),
      confirmedAtOnChain: input.confirmedAtOnChain
        ? new Date(input.confirmedAtOnChain)
        : undefined,
      settlementTrigger: input.settlementTrigger ?? undefined,
      rawExportKwh: input.rawExportKwh ?? undefined,
      rawImportKwh: input.rawImportKwh ?? undefined,
      validationStatus: input.validationStatus ?? undefined,
      settlementDataSource: input.settlementDataSource ?? undefined,
      detailedEnergyBreakdown: input.detailedEnergyBreakdown ?? {},
      mqttMessageId: input.mqttMessageId ?? undefined,
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.settlementId);
  }

  async update(
    settlementId: number,
    input: CreateEnergySettlementsInput,
  ): Promise<EnergySettlements> {
    const existing = await this.findOne(settlementId);

    // Convert input types to match entity types
    const updateData: Partial<EnergySettlements> = {
      meterId: input.meterId,
      netKwhFromGrid: input.netKwhFromGrid ?? undefined,
      etkAmountCredited: input.etkAmountCredited ?? undefined,
      blockchainTxHash: input.blockchainTxHash ?? undefined,
      status: input.status,
      settlementTrigger: input.settlementTrigger ?? undefined,
      rawExportKwh: input.rawExportKwh ?? undefined,
      rawImportKwh: input.rawImportKwh ?? undefined,
      validationStatus: input.validationStatus ?? undefined,
      settlementDataSource: input.settlementDataSource ?? undefined,
      detailedEnergyBreakdown: input.detailedEnergyBreakdown ?? {},
      mqttMessageId: input.mqttMessageId ?? undefined,
      periodStartTime: input.periodStartTime
        ? new Date(input.periodStartTime)
        : existing.periodStartTime,
      periodEndTime: input.periodEndTime
        ? new Date(input.periodEndTime)
        : existing.periodEndTime,
      createdAtBackend: input.createdAtBackend
        ? new Date(input.createdAtBackend)
        : existing.createdAtBackend,
      confirmedAtOnChain: input.confirmedAtOnChain
        ? new Date(input.confirmedAtOnChain)
        : existing.confirmedAtOnChain,
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(settlementId);
  }

  async remove(settlementId: number): Promise<boolean> {
    const result = await this.repo.delete({ settlementId });
    return (result.affected ?? 0) > 0;
  }
}
