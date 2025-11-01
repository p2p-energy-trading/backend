import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnergySettlement } from './energySettlement.entity';
import { CreateEnergySettlementsInput } from './dto/energySettlement.input';
import { EnergySettlementsArgs } from './dto/energySettlement.args';
import { SmartMeter } from '../smartMeter/smartMeter.entity';
// Removed: MqttMessageLogs (table dropped)
import { TransactionLog } from '../transactionLog/transactionLog.entity';

@Injectable()
export class EnergySettlementsService {
  constructor(
    @InjectRepository(EnergySettlement)
    private readonly repo: Repository<EnergySettlement>,
    @InjectRepository(SmartMeter)
    private readonly SmartMetersRepo: Repository<SmartMeter>,
    // Removed: MqttMessageLogsRepo
    @InjectRepository(TransactionLog)
    private readonly TransactionLogsRepo: Repository<TransactionLog>,
  ) {}

  async findAll(args?: EnergySettlementsArgs): Promise<EnergySettlement[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.settlementId !== undefined)
      where['settlementId'] = args.settlementId;
    if (args && args.meterId !== undefined) where['meterId'] = args.meterId;
    if (args && args.periodStartTime !== undefined)
      where['periodStartTime'] = args.periodStartTime;
    if (args && args.periodEndTime !== undefined)
      where['periodEndTime'] = args.periodEndTime;
    if (args && args.netWhFromGrid !== undefined)
      where['netWhFromGrid'] = args.netWhFromGrid;
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
    if (args && args.rawExportWh !== undefined)
      where['rawExportWh'] = args.rawExportWh;
    if (args && args.rawImportWh !== undefined)
      where['rawImportWh'] = args.rawImportWh;
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

  async findOne(settlementId: number): Promise<EnergySettlement> {
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

  async findByTxHash(txHash: string): Promise<EnergySettlement | null> {
    const entity = await this.repo.findOne({
      where: { blockchainTxHash: txHash },
    });
    return entity || null;
  }

  async create(input: CreateEnergySettlementsInput): Promise<EnergySettlement> {
    // Convert input types to match entity types
    const createData: Partial<EnergySettlement> = {
      meterId: input.meterId,
      periodStartTime: input.periodStartTime
        ? new Date(input.periodStartTime)
        : undefined,
      periodEndTime: input.periodEndTime
        ? new Date(input.periodEndTime)
        : undefined,
      netWhFromGrid: input.netWhFromGrid ?? undefined,
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
      rawExportWh: input.rawExportWh ?? undefined,
      rawImportWh: input.rawImportWh ?? undefined,
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
  ): Promise<EnergySettlement> {
    const existing = await this.findOne(settlementId);

    // Convert input types to match entity types
    const updateData: Partial<EnergySettlement> = {
      meterId: input.meterId,
      netWhFromGrid: input.netWhFromGrid ?? undefined,
      etkAmountCredited: input.etkAmountCredited ?? undefined,
      blockchainTxHash: input.blockchainTxHash ?? undefined,
      status: input.status,
      settlementTrigger: input.settlementTrigger ?? undefined,
      rawExportWh: input.rawExportWh ?? undefined,
      rawImportWh: input.rawImportWh ?? undefined,
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
