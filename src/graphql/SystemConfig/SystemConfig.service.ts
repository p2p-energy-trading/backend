import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SystemConfig } from './entities/SystemConfig.entity';
import { CreateSystemConfigInput } from './dto/SystemConfig.input';
import { SystemConfigArgs } from './dto/SystemConfig.args';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly repo: Repository<SystemConfig>,
  ) {}

  async findAll(args?: SystemConfigArgs): Promise<SystemConfig[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.configKey !== undefined) where['configKey'] = args.configKey;
    if (args && args.configValue !== undefined) where['configValue'] = args.configValue;
    if (args && args.description !== undefined) where['description'] = args.description;
    if (args && args.updatedAt !== undefined) where['updatedAt'] = args.updatedAt;
    if (args && args.updatedBy !== undefined) where['updatedBy'] = args.updatedBy;
    
    const relations = [];
    return this.repo.find({ where, relations });
  }

  async findOne(configKey: any): Promise<SystemConfig> {
    const relations = [];
    const entity = await this.repo.findOne({ where: { configKey }, relations });
    if (!entity) {
      throw new Error(`SystemConfig with configKey ${'$'}{configKey} not found`);
    }
    return entity;
  }

  async create(input: CreateSystemConfigInput): Promise<SystemConfig> {
    // Convert input types to match entity types
    const createData: Partial<SystemConfig> = { ...input } as any;
    
    if (input.updatedAt) (createData as any).updatedAt = new Date(input.updatedAt);


    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.configKey);
  }

  async update(configKey: any, input: CreateSystemConfigInput): Promise<SystemConfig> {
    const existing = await this.findOne(configKey);
    
    // Convert input types to match entity types
    const updateData: Partial<SystemConfig> = { ...input } as any;
    
    if (input.updatedAt) (updateData as any).updatedAt = new Date(input.updatedAt);


    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(configKey);
  }

  async remove(configKey: any): Promise<boolean> {
    const result = await this.repo.delete({ configKey });
    return (result.affected ?? 0) > 0;
  }

}
