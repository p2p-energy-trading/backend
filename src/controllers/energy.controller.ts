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
  Logger,
} from '@nestjs/common';
import { EnergySettlementService } from '../services/energy-settlement.service';
import { EnergySettlementsService } from '../modules/EnergySettlements/EnergySettlements.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { AuthService } from '../auth/auth.service';
// import { SettlementTrigger } from '../common/enums';

interface AuthenticatedUser {
  user: {
    prosumerId: string;
  };
}

@Controller('energy')
@UseGuards(JwtAuthGuard)
export class EnergyController {
  private readonly logger = new Logger(EnergyController.name);

  constructor(
    private energySettlementService: EnergySettlementService,
    private energySettlementsService: EnergySettlementsService,
    private authService: AuthService,
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
    @Query('scope') scope?: 'own' | 'public' | 'all',
  ) {
    try {
      const prosumerId = req.user.prosumerId;
      const validScope = scope || 'own'; // Default to 'own' if not specified

      // Validate scope parameter
      if (!['own', 'public', 'all'].includes(validScope)) {
        throw new BadRequestException(
          'Invalid scope parameter. Must be one of: own, public, all',
        );
      }

      // Only allow 'public' and 'own' scopes for regular users
      // Admin users can access 'all' scope (you can add role-based auth here)
      if (validScope === 'all') {
        // TODO: Add admin role check here
        // For now, we'll allow it but log it
        this.logger.warn(
          `User ${prosumerId} requested 'all' scope for settlement history`,
        );
      }

      const settlements: any[] =
        await this.energySettlementService.getSettlementHistory(
          meterId,
          prosumerId,
          limit ? parseInt(limit) : 50,
          validScope,
        );

      return {
        success: true,
        data: settlements,
        metadata: {
          scope: validScope,
          meterId: meterId || 'all',
          totalReturned: settlements.length,
          limit: limit ? parseInt(limit) : 50,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error getting settlement history:', error);
      throw new BadRequestException('Failed to retrieve settlement history');
    }
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
      const userSettlements: any[] =
        await this.energySettlementService.getSettlementHistory(
          settlement.meterId,
          prosumerId,
          1000, // Large limit to check if this settlement is in user's settlements
          'own', // Use 'own' scope to get only user's settlements
        );

      const userOwnsSettlement = userSettlements.some(
        (s: any) => s.settlementId === settlementIdNum,
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

      // If no meterId provided, get the first meter from user profile
      let targetMeterId = meterId;
      if (!targetMeterId) {
        // Get user profile to retrieve meters
        const profile = await this.authService.getProfile(prosumerId);

        if (!profile.meters || profile.meters.length === 0) {
          throw new NotFoundException('No meters found for this prosumer');
        }

        // Use the first meter from profile
        targetMeterId = profile.meters[0].meterId;
      }

      // Verify the meter belongs to the prosumer by checking profile
      const profile = await this.authService.getProfile(prosumerId);
      const userMeter = profile.meters?.find(
        (m) => m.meterId === targetMeterId,
      );

      if (!userMeter) {
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

  @Get('history/hourly')
  async getHourlyEnergyHistory(
    @Request() req: AuthenticatedUser,
    @Query('hours') hours?: string,
    @Query('meterId') meterId?: string,
  ) {
    try {
      const prosumerId = req.user.prosumerId;
      const hoursCount = hours ? parseInt(hours) : 24; // Default 24 hours

      if (hoursCount > 168) {
        // Max 1 week
        throw new BadRequestException('Maximum 168 hours (1 week) allowed');
      }

      // Get hourly energy history
      const historyData =
        await this.energySettlementService.getHourlyEnergyHistory(
          prosumerId,
          hoursCount,
          meterId,
        );

      return {
        success: true,
        data: historyData,
        metadata: {
          hours: hoursCount,
          meterId: meterId || 'all',
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve hourly energy history');
    }
  }
}
