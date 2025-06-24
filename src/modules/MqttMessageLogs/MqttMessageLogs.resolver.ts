import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { MqttMessageLogsService } from './MqttMessageLogs.service';
import { MqttMessageLogs } from './dto/MqttMessageLogs.output';
import { CreateMqttMessageLogsInput } from './dto/MqttMessageLogs.input';
import { MqttMessageLogsArgs } from './dto/MqttMessageLogs.args';

@Resolver(() => MqttMessageLogs)
export class MqttMessageLogsResolver {
  constructor(
    private readonly MqttMessageLogsService: MqttMessageLogsService,
  ) {}

  @Query(() => [MqttMessageLogs], { name: 'MqttMessageLogsAll' })
  findAll(@Args() args: MqttMessageLogsArgs) {
    return this.MqttMessageLogsService.findAll(args);
  }

  @Query(() => MqttMessageLogs, { name: 'MqttMessageLogs' })
  findOne(@Args('logId', { type: () => Int }) logId: number) {
    return this.MqttMessageLogsService.findOne(Number(logId));
  }

  @Mutation(() => MqttMessageLogs)
  createMqttMessageLogs(@Args('input') input: CreateMqttMessageLogsInput) {
    return this.MqttMessageLogsService.create(input);
  }

  @Mutation(() => MqttMessageLogs)
  updateMqttMessageLogs(
    @Args('logId', { type: () => Int }) logId: number,
    @Args('input') input: CreateMqttMessageLogsInput,
  ) {
    return this.MqttMessageLogsService.update(Number(logId), input);
  }

  @Mutation(() => Boolean)
  removeMqttMessageLogs(@Args('logId', { type: () => Int }) logId: number) {
    return this.MqttMessageLogsService.remove(Number(logId));
  }
}
