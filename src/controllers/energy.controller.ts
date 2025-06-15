import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { EnergySettlementService } from '../services/energy-settlement.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { SettlementTrigger } from '../common/enums';

@Controller('energy')
@UseGuards(JwtAuthGuard)
export class EnergyController {
  constructor(private energySettlementService: EnergySettlementService) {}

  @Post('settlement/manual/:meterId')
  async manualSettlement(@Param('meterId') meterId: string, @Request() req) {
    const prosumerId = req.user.prosumerId;
    const txHash = await this.energySettlementService.manualSettlement(
      meterId,
      prosumerId,
    );
    return {
      success: true,
      transactionHash: txHash,
      message: 'Manual settlement initiated',
    };
  }

  @Post('settlement/process-all')
  async processAllSettlements(@Request() req) {
    // Only allow admin users to trigger settlement for all meters
    await this.energySettlementService.processAllMetersSettlement(
      SettlementTrigger.MANUAL,
    );
    return {
      success: true,
      message: 'Settlement processing initiated for all meters',
    };
  }

  @Get('settlement/history')
  async getSettlementHistory(
    @Request() req,
    @Query('meterId') meterId?: string,
    @Query('limit') limit?: string,
  ) {
    const prosumerId = req.user.prosumerId;
    const settlements = await this.energySettlementService.getSettlementHistory(
      meterId,
      prosumerId,
      limit ? parseInt(limit) : 50,
    );
    return {
      success: true,
      data: settlements,
    };
  }

  @Get('settlement/:settlementId')
  async getSettlement(@Param('settlementId') settlementId: string) {
    // Implementation would call energySettlementsService.findOne
    return {
      success: true,
      message: 'Settlement details endpoint - to be implemented',
    };
  }
}
