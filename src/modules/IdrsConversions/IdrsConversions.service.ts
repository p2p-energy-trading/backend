import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdrsConversions } from './entities/IdrsConversions.entity';
import { CreateIdrsConversionsInput } from './dto/IdrsConversions.input';
import { IdrsConversionsArgs } from './dto/IdrsConversions.args';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
import { Wallets } from '../Wallets/entities/Wallets.entity';

@Injectable()
export class IdrsConversionsService {
  constructor(
    @InjectRepository(IdrsConversions)
    private readonly repo: Repository<IdrsConversions>,
    @InjectRepository(Prosumers)
    private readonly ProsumersRepo: Repository<Prosumers>,
    @InjectRepository(Wallets)
    private readonly WalletsRepo: Repository<Wallets>,
  ) {}

  async findAll(args?: IdrsConversionsArgs): Promise<IdrsConversions[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.conversionId !== undefined)
      where['conversionId'] = args.conversionId;
    if (args && args.prosumerId !== undefined)
      where['prosumerId'] = args.prosumerId;
    if (args && args.walletAddress !== undefined)
      where['walletAddress'] = args.walletAddress;
    if (args && args.conversionType !== undefined)
      where['conversionType'] = args.conversionType;
    if (args && args.idrAmount !== undefined)
      where['idrAmount'] = args.idrAmount;
    if (args && args.idrsAmount !== undefined)
      where['idrsAmount'] = args.idrsAmount;
    if (args && args.exchangeRate !== undefined)
      where['exchangeRate'] = args.exchangeRate;
    if (args && args.blockchainTxHash !== undefined)
      where['blockchainTxHash'] = args.blockchainTxHash;
    if (args && args.status !== undefined) where['status'] = args.status;
    if (args && args.simulationNote !== undefined)
      where['simulationNote'] = args.simulationNote;
    if (args && args.createdAt !== undefined)
      where['createdAt'] = args.createdAt;
    if (args && args.confirmedAt !== undefined)
      where['confirmedAt'] = args.confirmedAt;

    return this.repo.find({ where });
  }

  async findOne(conversionId: number): Promise<IdrsConversions> {
    const relations = ['prosumers', 'wallets'];
    const entity = await this.repo.findOne({
      where: { conversionId },
      relations,
    });
    if (!entity) {
      throw new Error(
        `IdrsConversions with conversionId ${'$'}{conversionId} not found`,
      );
    }
    return entity;
  }

  async findByWalletAddress(walletAddress: string): Promise<IdrsConversions[]> {
    const entities = await this.repo.find({
      where: { walletAddress },
      relations: ['prosumers', 'wallets'],
    });
    if (!entities || entities.length === 0) {
      throw new Error(
        `No IdrsConversions found for walletAddress ${walletAddress}`,
      );
    }
    return entities;
  }

  async create(input: CreateIdrsConversionsInput): Promise<IdrsConversions> {
    // Convert input types to match entity types
    const createData: Partial<IdrsConversions> = {
      prosumerId: input.prosumerId,
      walletAddress: input.walletAddress,
      conversionType: input.conversionType,
      idrAmount: input.idrAmount,
      idrsAmount: input.idrsAmount,
      exchangeRate: input.exchangeRate,
      blockchainTxHash: input.blockchainTxHash,
      status: input.status,
      simulationNote: input.simulationNote,
      createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
      confirmedAt: input.confirmedAt ? new Date(input.confirmedAt) : undefined,
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.conversionId);
  }

  async update(
    conversionId: number,
    input: CreateIdrsConversionsInput,
  ): Promise<IdrsConversions> {
    const existing = await this.findOne(conversionId);

    // Convert input types to match entity types
    const updateData: Partial<IdrsConversions> = {
      prosumerId: input.prosumerId,
      walletAddress: input.walletAddress,
      conversionType: input.conversionType,
      idrAmount: input.idrAmount,
      idrsAmount: input.idrsAmount,
      exchangeRate: input.exchangeRate,
      blockchainTxHash: input.blockchainTxHash,
      status: input.status,
      simulationNote: input.simulationNote,
      createdAt: input.createdAt
        ? new Date(input.createdAt)
        : existing.createdAt,
      confirmedAt: input.confirmedAt
        ? new Date(input.confirmedAt)
        : existing.confirmedAt,
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(conversionId);
  }

  async remove(conversionId: number): Promise<boolean> {
    const result = await this.repo.delete({ conversionId });
    return (result.affected ?? 0) > 0;
  }
}
