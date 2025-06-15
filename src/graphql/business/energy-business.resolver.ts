import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { EnergySettlementService } from '../../services/energy-settlement.service';
import { MqttService } from '../../services/mqtt.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Resolver()
@UseGuards(JwtAuthGuard)
export class EnergyBusinessResolver {
  constructor(
    private energySettlementService: EnergySettlementService,
    private mqttService: MqttService,
  ) {}

  @Mutation(() => String)
  async triggerManualSettlement(
    @Args('meterId') meterId: string,
    @CurrentUser() user: any,
  ): Promise<string> {
    if (!user?.prosumerId) {
      throw new Error('User not authenticated');
    }
    const result = await this.energySettlementService.manualSettlement(
      meterId,
      user.prosumerId,
    );
    if (!result) {
      throw new Error('Settlement failed or conditions not met');
    }
    return result;
  }

  @Mutation(() => String)
  async sendDeviceCommand(
    @Args('meterId') meterId: string,
    @Args('command') command: string,
    @CurrentUser() user: any,
  ): Promise<string> {
    const parsedCommand = JSON.parse(command);
    return this.mqttService.sendCommand(
      meterId,
      parsedCommand,
      user.prosumerId,
    );
  }

  @Query(() => String)
  async getSettlementHistory(
    @Args('meterId', { nullable: true }) meterId?: string,
    @Args('limit', { nullable: true }) limit?: number,
    @CurrentUser() user?: any,
  ): Promise<string> {
    const history = await this.energySettlementService.getSettlementHistory(
      meterId,
      user?.prosumerId,
      limit || 50,
    );
    return JSON.stringify(history);
  }
}
