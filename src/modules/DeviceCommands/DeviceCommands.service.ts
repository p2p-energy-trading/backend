import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    return this.repo.find({ where });
  }

  async findOne(commandId: number): Promise<DeviceCommands> {
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
    const createData: Partial<DeviceCommands> = {
      meterId: input.meterId,
      commandType: input.commandType,
      commandPayload: input.commandPayload,
      correlationId: input.correlationId,
      status: input.status,
      sentByUser: input.sentByUser,
      responsePayload: input.responsePayload,
      errorDetails: input.errorDetails,
      // Convert date strings to Date objects
      sentAt: input.sentAt ? new Date(input.sentAt) : undefined,
      acknowledgedAt: input.acknowledgedAt
        ? new Date(input.acknowledgedAt)
        : undefined,
      timeoutAt: input.timeoutAt ? new Date(input.timeoutAt) : undefined,
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.commandId);
  }

  async update(
    commandId: number,
    input: CreateDeviceCommandsInput,
  ): Promise<DeviceCommands> {
    const existing = await this.findOne(commandId);

    // Convert input types to match entity types
    const updateData: Partial<DeviceCommands> = {
      meterId: input.meterId,
      commandType: input.commandType,
      commandPayload: input.commandPayload,
      correlationId: input.correlationId,
      status: input.status,
      sentByUser: input.sentByUser,
      responsePayload: input.responsePayload,
      errorDetails: input.errorDetails,
      // Convert date strings to Date objects
      sentAt: input.sentAt ? new Date(input.sentAt) : undefined,
      acknowledgedAt: input.acknowledgedAt
        ? new Date(input.acknowledgedAt)
        : undefined,
      timeoutAt: input.timeoutAt ? new Date(input.timeoutAt) : undefined,
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(commandId);
  }

  async remove(commandId: number): Promise<boolean> {
    const result = await this.repo.delete({ commandId });
    return (result.affected ?? 0) > 0;
  }
}
