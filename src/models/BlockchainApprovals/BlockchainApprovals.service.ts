import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockchainApprovals } from '../BlockchainApprovals/BlockchainApprovals.entity';
import { CreateBlockchainApprovalsInput } from './dto/BlockchainApprovals.input';
import { BlockchainApprovalsArgs } from './dto/BlockchainApprovals.args';
import { Prosumers } from '../Prosumers/Prosumers.entity';
import { Wallets } from '../Wallets/Wallets.entity';

@Injectable()
export class BlockchainApprovalsService {
  constructor(
    @InjectRepository(BlockchainApprovals)
    private readonly repo: Repository<BlockchainApprovals>,
    @InjectRepository(Prosumers)
    private readonly ProsumersRepo: Repository<Prosumers>,
    @InjectRepository(Wallets)
    private readonly WalletsRepo: Repository<Wallets>,
  ) {}

  async findAll(
    args?: BlockchainApprovalsArgs,
  ): Promise<BlockchainApprovals[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.approvalId !== undefined)
      where['approvalId'] = args.approvalId;
    if (args && args.prosumerId !== undefined)
      where['prosumerId'] = args.prosumerId;
    if (args && args.walletAddress !== undefined)
      where['walletAddress'] = args.walletAddress;
    if (args && args.spenderContractAddress !== undefined)
      where['spenderContractAddress'] = args.spenderContractAddress;
    if (args && args.tokenContractAddress !== undefined)
      where['tokenContractAddress'] = args.tokenContractAddress;
    if (args && args.approvedAmount !== undefined)
      where['approvedAmount'] = args.approvedAmount;
    if (args && args.approvalTxHash !== undefined)
      where['approvalTxHash'] = args.approvalTxHash;
    if (args && args.status !== undefined) where['status'] = args.status;
    if (args && args.expiresAt !== undefined)
      where['expiresAt'] = args.expiresAt;
    if (args && args.createdAt !== undefined)
      where['createdAt'] = args.createdAt;
    if (args && args.confirmedAt !== undefined)
      where['confirmedAt'] = args.confirmedAt;

    return this.repo.find({ where });
  }

  async findOne(approvalId: number): Promise<BlockchainApprovals> {
    const relations = ['prosumers', 'wallets'];
    const entity = await this.repo.findOne({
      where: { approvalId },
      relations,
    });
    if (!entity) {
      throw new Error(
        `BlockchainApprovals with approvalId ${'$'}{approvalId} not found`,
      );
    }
    return entity;
  }

  async create(
    input: CreateBlockchainApprovalsInput,
  ): Promise<BlockchainApprovals> {
    // Convert input types to match entity types
    // const createData: Partial<BlockchainApprovals> = { ...input } as any;
    const createData: Partial<BlockchainApprovals> = {
      prosumerId: input.prosumerId,
      walletAddress: input.walletAddress,
      spenderContractAddress: input.spenderContractAddress,
      tokenContractAddress: input.tokenContractAddress,
      approvedAmount: input.approvedAmount,
      approvalTxHash: input.approvalTxHash,
      status: input.status,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      createdAt: new Date(input.createdAt),
      confirmedAt: input.confirmedAt ? new Date(input.confirmedAt) : undefined,
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.approvalId);
  }

  async update(
    approvalId: number,
    input: CreateBlockchainApprovalsInput,
  ): Promise<BlockchainApprovals> {
    const existing = await this.findOne(approvalId);

    // Convert input types to match entity types
    const updateData: Partial<BlockchainApprovals> = {
      prosumerId: input.prosumerId,
      walletAddress: input.walletAddress,
      spenderContractAddress: input.spenderContractAddress,
      tokenContractAddress: input.tokenContractAddress,
      approvedAmount: input.approvedAmount,
      approvalTxHash: input.approvalTxHash,
      status: input.status,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      createdAt: new Date(input.createdAt),
      confirmedAt: input.confirmedAt ? new Date(input.confirmedAt) : undefined,
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(approvalId);
  }

  async remove(approvalId: number): Promise<boolean> {
    const result = await this.repo.delete({ approvalId });
    return (result.affected ?? 0) > 0;
  }
}
