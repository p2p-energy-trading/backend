import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './systemConfig.entity';
import { CreateSystemConfigInput } from './dto/systemConfig.input';
import { SystemConfigArgs } from './dto/systemConfig.args';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly repo: Repository<SystemConfig>,
  ) {}

  async findAll(args?: SystemConfigArgs): Promise<SystemConfig[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.configKey !== undefined)
      where['configKey'] = args.configKey;
    if (args && args.configValue !== undefined)
      where['configValue'] = args.configValue;
    if (args && args.description !== undefined)
      where['description'] = args.description;
    if (args && args.updatedAt !== undefined)
      where['updatedAt'] = args.updatedAt;
    if (args && args.updatedBy !== undefined)
      where['updatedBy'] = args.updatedBy;

    return this.repo.find({ where });
  }

  async findOne(configKey: string): Promise<SystemConfig> {
    const relations = [];
    const entity = await this.repo.findOne({ where: { configKey }, relations });
    if (!entity) {
      throw new Error(
        `SystemConfig with configKey ${'$'}{configKey} not found`,
      );
    }
    return entity;
  }

  async create(input: CreateSystemConfigInput): Promise<SystemConfig> {
    // Convert input types to match entity types
    const createData: Partial<SystemConfig> = {
      configKey: input.configKey,
      configValue: input.configValue,
      description: input.description,
      updatedBy: input.updatedBy,
      updatedAt: input.updatedAt ? new Date(input.updatedAt) : new Date(),
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.configKey);
  }

  async update(
    configKey: string,
    input: CreateSystemConfigInput,
  ): Promise<SystemConfig> {
    const existing = await this.findOne(configKey);

    // Convert input types to match entity types
    const updateData: Partial<SystemConfig> = {
      configValue: input.configValue,
      description: input.description,
      updatedBy: input.updatedBy,
      updatedAt: input.updatedAt ? new Date(input.updatedAt) : new Date(),
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(configKey);
  }

  async remove(configKey: string): Promise<boolean> {
    const result = await this.repo.delete({ configKey });
    return (result.affected ?? 0) > 0;
  }
}
