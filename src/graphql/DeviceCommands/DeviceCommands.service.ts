import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DeviceCommands } from './entities/DeviceCommands.entity';
import { CreateDeviceCommandsInput } from './dto/DeviceCommands.input';
import { DeviceCommandsArgs } from './dto/DeviceCommands.args';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';

@Injectable()
export class DeviceCommandsService {
  constructor(
    @InjectRepository(DeviceCommands)
    private readonly repo: Repository<DeviceCommands>,
    @InjectRepository(SmartMeters)
    private readonly SmartMetersRepo: Repository<SmartMeters>,
    @InjectRepository(Prosumers)
    private readonly ProsumersRepo: Repository<Prosumers>,
  ) {}

  async findAll(args?: DeviceCommandsArgs): Promise<DeviceCommands[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.commandId !== undefined)
      where['commandId'] = args.commandId;
    if (args && args.meterId !== undefined) where['meterId'] = args.meterId;
    if (args && args.commandType !== undefined)
      where['commandType'] = args.commandType;
    if (args && args.commandPayload !== undefined)
      where['commandPayload'] = args.commandPayload;
    if (args && args.correlationId !== undefined)
      where['correlationId'] = args.correlationId;
    if (args && args.status !== undefined) where['status'] = args.status;
    if (args && args.sentAt !== undefined) where['sentAt'] = args.sentAt;
    if (args && args.acknowledgedAt !== undefined)
      where['acknowledgedAt'] = args.acknowledgedAt;
    if (args && args.timeoutAt !== undefined)
      where['timeoutAt'] = args.timeoutAt;
    if (args && args.responsePayload !== undefined)
      where['responsePayload'] = args.responsePayload;
    if (args && args.errorDetails !== undefined)
      where['errorDetails'] = args.errorDetails;
    if (args && args.sentByUser !== undefined)
      where['sentByUser'] = args.sentByUser;

    const relations = ['smartmeters', 'prosumers'];
    return this.repo.find({ where, relations });
  }

  async findOne(commandId: any): Promise<DeviceCommands> {
    const relations = ['smartmeters', 'prosumers'];
    const entity = await this.repo.findOne({ where: { commandId }, relations });
    if (!entity) {
      throw new Error(
        `DeviceCommands with commandId ${'$'}{commandId} not found`,
      );
    }
    return entity;
  }

  async create(input: CreateDeviceCommandsInput): Promise<DeviceCommands> {
    // Convert input types to match entity types
    const createData: Partial<DeviceCommands> = { ...input } as any;

    if (input.sentAt) (createData as any).sentAt = new Date(input.sentAt);
    if (input.acknowledgedAt)
      (createData as any).acknowledgedAt = new Date(input.acknowledgedAt);
    if (input.timeoutAt)
      (createData as any).timeoutAt = new Date(input.timeoutAt);

    // Handle smartmeters relation
    if (input.smartmetersIds && input.smartmetersIds.length > 0) {
      const smartmetersEntities = await this.SmartMetersRepo.findBy({
        meterId: In(input.smartmetersIds),
      });
      (createData as any).smartmeters = smartmetersEntities;
    }
    // Handle prosumers relation
    if (input.prosumersIds && input.prosumersIds.length > 0) {
      const prosumersEntities = await this.ProsumersRepo.findBy({
        prosumerId: In(input.prosumersIds),
      });
      (createData as any).prosumers = prosumersEntities;
    }

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.commandId);
  }

  async update(
    commandId: any,
    input: CreateDeviceCommandsInput,
  ): Promise<DeviceCommands> {
    const existing = await this.findOne(commandId);

    // Convert input types to match entity types
    const updateData: Partial<DeviceCommands> = { ...input } as any;

    if (input.sentAt) (updateData as any).sentAt = new Date(input.sentAt);
    if (input.acknowledgedAt)
      (updateData as any).acknowledgedAt = new Date(input.acknowledgedAt);
    if (input.timeoutAt)
      (updateData as any).timeoutAt = new Date(input.timeoutAt);

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

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(commandId);
  }

  async remove(commandId: any): Promise<boolean> {
    const result = await this.repo.delete({ commandId });
    return (result.affected ?? 0) > 0;
  }

  async findSmartmeters(commandId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { commandId },
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

  async findProsumers(commandId: any): Promise<any[]> {
    const parent = await this.repo.findOne({
      where: { commandId },
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
}
