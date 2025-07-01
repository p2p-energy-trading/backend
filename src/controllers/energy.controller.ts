import {
  Controller,
  // Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EnergySettlementService } from '../services/energy-settlement.service';
import { EnergySettlementsService } from '../modules/EnergySettlements/EnergySettlements.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
// import { SettlementTrigger } from '../common/enums';

interface AuthenticatedUser {
  user: {
    prosumerId: string;
  };
}

@Controller('energy')
@UseGuards(JwtAuthGuard)
export class EnergyController {
  constructor(
    private energySettlementService: EnergySettlementService,
    private energySettlementsService: EnergySettlementsService,
  ) {}

  // @Post('settlement/manual/:meterId')
  // async manualSettlement(@Param('meterId') meterId: string, @Request() req) {
  //   const prosumerId = req.user.prosumerId;
  //   const txHash = await this.energySettlementService.manualSettlement(
  //     meterId,
  //     prosumerId,
  //   );
  //   return {
  //     success: true,
  //     transactionHash: txHash,
  //     message: 'Manual settlement initiated',
  //   };
  // }

  // @Post('settlement/process-all')
  // async processAllSettlements(@Request() req) {
  //   // Only allow admin users to trigger settlement for all meters
  //   await this.energySettlementService.processAllMetersSettlement(
  //     SettlementTrigger.MANUAL,
  //   );
  //   return {
  //     success: true,
  //     message: 'Settlement processing initiated for all meters',
  //   };
  // }

  @Get('settlement/history')
  async getSettlementHistory(
    @Request() req: AuthenticatedUser,
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
  async getSettlement(
    @Param('settlementId') settlementId: string,
    @Request() req: AuthenticatedUser,
  ) {
    try {
      const settlementIdNum = parseInt(settlementId);
      if (isNaN(settlementIdNum)) {
        throw new BadRequestException('Invalid settlement ID format');
      }

      const settlement =
        await this.energySettlementsService.findOne(settlementIdNum);

      if (!settlement) {
        throw new NotFoundException('Settlement not found');
      }

      // Verify the settlement belongs to the user's meter
      // This requires checking if the meter belongs to the prosumer
      const prosumerId = req.user.prosumerId;

      // Get settlement history to verify ownership (reusing existing logic)
      const userSettlements =
        await this.energySettlementService.getSettlementHistory(
          settlement.meterId,
          prosumerId,
          1000, // Large limit to check if this settlement is in user's settlements
        );

      const userOwnsSettlement = userSettlements.some(
        (s) => s.settlementId === settlementIdNum,
      );

      if (!userOwnsSettlement) {
        throw new NotFoundException('Settlement not found');
      }

      return {
        success: true,
        data: settlement,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve settlement');
    }
  }

  @Get('settlement-estimator')
  async getSettlementEstimator(
    @Request() req: AuthenticatedUser,
    @Query('meterId') meterId?: string,
  ) {
    try {
      const prosumerId = req.user.prosumerId;

      // If no meterId provided, get the first meter owned by the prosumer
      let targetMeterId = meterId;
      if (!targetMeterId) {
        // Get prosumer's first meter
        const userMeters =
          await this.energySettlementService.getSettlementHistory(
            undefined,
            prosumerId,
            1,
          );

        if (!userMeters || userMeters.length === 0) {
          throw new NotFoundException('No meters found for this prosumer');
        }

        // Extract meterId from the first settlement record
        targetMeterId = userMeters[0].meterId;
      }

      // Verify the meter belongs to the prosumer
      const userSettlements =
        await this.energySettlementService.getSettlementHistory(
          targetMeterId,
          prosumerId,
          1,
        );

      if (!userSettlements || userSettlements.length === 0) {
        throw new NotFoundException('Meter not found or unauthorized access');
      }

      // Get settlement estimator data
      const estimatorData =
        await this.energySettlementService.getSettlementEstimator(
          targetMeterId,
        );

      if (!estimatorData) {
        throw new NotFoundException(
          'Unable to retrieve settlement estimator data',
        );
      }

      return {
        success: true,
        data: {
          meterId: targetMeterId,
          ...estimatorData,
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve settlement estimator');
    }
  }
}
