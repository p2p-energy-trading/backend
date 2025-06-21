import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BlockchainApprovals } from './entities/BlockchainApprovals.entity';
import { CreateBlockchainApprovalsInput } from './dto/BlockchainApprovals.input';
import { BlockchainApprovalsArgs } from './dto/BlockchainApprovals.args';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
import { Wallets } from '../Wallets/entities/Wallets.entity';

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

  async findAll(args?: BlockchainApprovalsArgs): Promise<BlockchainApprovals[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.approvalId !== undefined) where['approvalId'] = args.approvalId;
    if (args && args.prosumerId !== undefined) where['prosumerId'] = args.prosumerId;
    if (args && args.walletAddress !== undefined) where['walletAddress'] = args.walletAddress;
    if (args && args.spenderContractAddress !== undefined) where['spenderContractAddress'] = args.spenderContractAddress;
    if (args && args.tokenContractAddress !== undefined) where['tokenContractAddress'] = args.tokenContractAddress;
    if (args && args.approvedAmount !== undefined) where['approvedAmount'] = args.approvedAmount;
    if (args && args.approvalTxHash !== undefined) where['approvalTxHash'] = args.approvalTxHash;
    if (args && args.status !== undefined) where['status'] = args.status;
    if (args && args.expiresAt !== undefined) where['expiresAt'] = args.expiresAt;
    if (args && args.createdAt !== undefined) where['createdAt'] = args.createdAt;
    if (args && args.confirmedAt !== undefined) where['confirmedAt'] = args.confirmedAt;
    
    const relations = ['prosumers', 'wallets'];
    return this.repo.find({ where, relations });
  }

  async findOne(approvalId: any): Promise<BlockchainApprovals> {
    const relations = ['prosumers', 'wallets'];
    const entity = await this.repo.findOne({ where: { approvalId }, relations });
    if (!entity) {
      throw new Error(`BlockchainApprovals with approvalId ${'$'}{approvalId} not found`);
    }
    return entity;
  }

  async create(input: CreateBlockchainApprovalsInput): Promise<BlockchainApprovals> {
    // Convert input types to match entity types
    const createData: Partial<BlockchainApprovals> = { ...input } as any;
    
    if (input.expiresAt) (createData as any).expiresAt = new Date(input.expiresAt);
    if (input.createdAt) (createData as any).createdAt = new Date(input.createdAt);
    if (input.confirmedAt) (createData as any).confirmedAt = new Date(input.confirmedAt);

    // Handle prosumers relation
    if (input.prosumersIds && input.prosumersIds.length > 0) {
      const prosumersEntities = await this.ProsumersRepo.findBy({ prosumerId: In(input.prosumersIds) });
      (createData as any).prosumers = prosumersEntities;
    }
    // Handle wallets relation
    if (input.walletsIds && input.walletsIds.length > 0) {
      const walletsEntities = await this.WalletsRepo.findBy({ walletAddress: In(input.walletsIds) });
      (createData as any).wallets = walletsEntities;
    }

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.approvalId);
  }

  async update(approvalId: any, input: CreateBlockchainApprovalsInput): Promise<BlockchainApprovals> {
    const existing = await this.findOne(approvalId);
    
    // Convert input types to match entity types
    const updateData: Partial<BlockchainApprovals> = { ...input } as any;
    
    if (input.expiresAt) (updateData as any).expiresAt = new Date(input.expiresAt);
    if (input.createdAt) (updateData as any).createdAt = new Date(input.createdAt);
    if (input.confirmedAt) (updateData as any).confirmedAt = new Date(input.confirmedAt);

    // Handle prosumers relation update
    if (input.prosumersIds !== undefined) {
      if (input.prosumersIds.length > 0) {
        const prosumersEntities = await this.ProsumersRepo.findBy({ prosumerId: In(input.prosumersIds) });
        (updateData as any).prosumers = prosumersEntities;
      } else {
        (updateData as any).prosumers = [];
      }
    }
    // Handle wallets relation update
    if (input.walletsIds !== undefined) {
      if (input.walletsIds.length > 0) {
        const walletsEntities = await this.WalletsRepo.findBy({ walletAddress: In(input.walletsIds) });
        (updateData as any).wallets = walletsEntities;
      } else {
        (updateData as any).wallets = [];
      }
    }

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(approvalId);
  }

  async remove(approvalId: any): Promise<boolean> {
    const result = await this.repo.delete({ approvalId });
    return (result.affected ?? 0) > 0;
  }

  async findProsumers(approvalId: any): Promise<any[]> {
    const parent = await this.repo.findOne({ where: { approvalId }, relations: ['prosumers'] });
    const entity = parent?.prosumers;
    if (!entity) return [];
    // Convert entity to match GraphQL output format
    return [{
      ...entity,
      createdAt: entity.createdAt ? (entity.createdAt instanceof Date ? entity.createdAt.toISOString() : entity.createdAt) : null,
      updatedAt: entity.updatedAt ? (entity.updatedAt instanceof Date ? entity.updatedAt.toISOString() : entity.updatedAt) : null,
    }];
  }

  async findWallets(approvalId: any): Promise<any[]> {
    const parent = await this.repo.findOne({ where: { approvalId }, relations: ['wallets'] });
    const entity = parent?.wallets;
    if (!entity) return [];
    // Convert entity to match GraphQL output format
    return [{
      ...entity,
      createdAt: entity.createdAt ? (entity.createdAt instanceof Date ? entity.createdAt.toISOString() : entity.createdAt) : null,
      lastUsedAt: entity.lastUsedAt ? (entity.lastUsedAt instanceof Date ? entity.lastUsedAt.toISOString() : entity.lastUsedAt) : null,
    }];
  }
}
