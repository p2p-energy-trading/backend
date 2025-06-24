import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
} from '@nestjs/graphql';
import { SystemConfigService } from './SystemConfig.service';
import { SystemConfig } from './dto/SystemConfig.output';
import { CreateSystemConfigInput } from './dto/SystemConfig.input';
import { SystemConfigArgs } from './dto/SystemConfig.args';

@Resolver(() => SystemConfig)
export class SystemConfigResolver {
  constructor(private readonly SystemConfigService: SystemConfigService) {}

  @Query(() => [SystemConfig], { name: 'SystemConfigAll' })
  findAll(@Args() args: SystemConfigArgs) {
    return this.SystemConfigService.findAll(args);
  }

  @Query(() => SystemConfig, { name: 'SystemConfig' })
  findOne(@Args('configKey', { type: () => String }) configKey: string) {
    return this.SystemConfigService.findOne(configKey);
  }

  @Mutation(() => SystemConfig)
  createSystemConfig(@Args('input') input: CreateSystemConfigInput) {
    return this.SystemConfigService.create(input);
  }

  @Mutation(() => SystemConfig)
  updateSystemConfig(
    @Args('configKey', { type: () => String }) configKey: string,
    @Args('input') input: CreateSystemConfigInput,
  ) {
    return this.SystemConfigService.update(configKey, input);
  }

  @Mutation(() => Boolean)
  removeSystemConfig(@Args('configKey', { type: () => String }) configKey: string) {
    return this.SystemConfigService.remove(configKey);
  }

}
