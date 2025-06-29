import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
// import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EnergySettlementsService } from '../modules/EnergySettlements/EnergySettlements.service';
import { SmartMetersService } from '../modules/SmartMeters/SmartMeters.service';
import { EnergyReadingsDetailedService } from '../modules/EnergyReadingsDetailed/EnergyReadingsDetailed.service';
import { BlockchainService } from './blockchain.service';
import { MqttService } from './mqtt.service';
import { TransactionLogsService } from '../modules/TransactionLogs/TransactionLogs.service';
import { SettlementTrigger, TransactionStatus } from '../common/enums';
import { DeviceCommandPayload } from '../common/interfaces';
import { WalletsService } from 'src/modules/Wallets/Wallets.service';
import { ProsumersService } from 'src/modules/Prosumers/Prosumers.service';

interface SettlementReadingsData {
  exportEnergyWh: number;
  importEnergyWh: number;
  netEnergyWh: number;
  periodStartTime: string;
  lastReadingTime: string;
}

@Injectable()
export class EnergySettlementService {
  private readonly logger = new Logger(EnergySettlementService.name);
  private readonly defaultSettlementInterval = 5; // minutes

  constructor(
    private configService: ConfigService,
    private energySettlementsService: EnergySettlementsService,
    private smartMetersService: SmartMetersService,
    private energyReadingsDetailedService: EnergyReadingsDetailedService,
    @Inject(forwardRef(() => BlockchainService))
    private blockchainService: BlockchainService,
    private mqttService: MqttService,
    private transactionLogsService: TransactionLogsService,
    private prosumersService: ProsumersService,
    private readonly WalletsService: WalletsService, // Assuming this is imported correctly
  ) {}

  // Run every 5 minutes by default
  // @Cron('*/5 * * * * *')
  @Cron(CronExpression.EVERY_5_MINUTES)
  async periodicSettlement() {
    const isAutoSettlementEnabled =
      this.configService.get('AUTO_SETTLEMENT_ENABLED') === 'true';
    if (!isAutoSettlementEnabled) {
      return;
    }

    this.logger.log('Starting periodic energy settlement');
    // this.logger.log('test2');
    await this.processAllMetersSettlement(SettlementTrigger.PERIODIC);
  }

  async getSettlementIdDbByTxHash(txHash: string): Promise<number | null> {
    const entity = await this.energySettlementsService.findByTxHash(txHash);
    return entity?.settlementId || null;
  }

  async getMeterIdByTxHash(txHash: string): Promise<string | null> {
    const entity = await this.energySettlementsService.findByTxHash(txHash);
    return entity?.meterId || null;
  }

  async processAllMetersSettlement(
    trigger: SettlementTrigger = SettlementTrigger.MANUAL,
  ) {
    try {
      this.logger.log('Processing all meters for settlement');
      const activeMeters = await this.smartMetersService.findAll();
      this.logger.log(
        `Found ${activeMeters.length} active meters for settlement`,
      );

      for (const meter of activeMeters) {
        await this.processMeterSettlement(meter.meterId, trigger);
      }

      this.logger.log(`Processed settlement for ${activeMeters.length} meters`);
    } catch (error) {
      this.logger.error('Error in periodic settlement:', error);
    }
  }

  async processMeterSettlement(
    meterId: string,
    trigger: SettlementTrigger = SettlementTrigger.MANUAL,
  ): Promise<string | null> {
    try {
      this.logger.log(`Processing settlement for meter ${meterId}`);

      // Get the latest energy readings for settlement calculation
      const latestReadings = await this.getLatestSettlementReadings(meterId);
      if (!latestReadings) {
        this.logger.warn(`No settlement readings found for meter ${meterId}`);
        return null;
      }

      // Calculate net energy (export - import)
      const netEnergyWh = latestReadings.netEnergyWh;
      const netEnergyKwh = netEnergyWh / 1000; // Convert Wh to kWh for logging

      // Check if settlement threshold is met (use blockchain's minimum threshold)
      const minSettlementWh = await this.blockchainService.getMinSettlementWh();
      // this.logger.debug(`Minimum settlement threshold: ${minSettlementWh} Wh`);
      if (Math.abs(netEnergyWh) < minSettlementWh) {
        this.logger.warn(
          `Settlement threshold not met for meter ${meterId}: ${Math.abs(netEnergyWh)} Wh < ${minSettlementWh} Wh`,
        );
        return null;
      }

      // this.logger.debug(
      //   `Settlement calculation for meter ${meterId}: Net energy = ${netEnergyKwh} kWh (${netEnergyWh} Wh)`,
      // );

      // Get meter owner's wallet
      // const prosumers = await this.smartMetersService.findProsumers(meterId);
      const prosumers = await this.prosumersService.findByMeterId(meterId);
      if (!prosumers || prosumers.length === 0) {
        this.logger.warn(`No prosumer found for meter ${meterId}`);
        return null;
      }

      // this.logger.debug(
      //   `Found ${prosumers.length} prosumers for meter ${meterId}`,
      // );

      const prosumer = prosumers[0] as {
        prosumerId?: string;
      };

      // const wallets = await this.WalletsService.findAll({
      //   prosumerId: prosumer.prosumerId,
      // });

      // this.logger.debug(
      //   `Using prosumer Id ${prosumer.prosumerId} with wallet address ${wallets[0]?.walletAddress} for settlement`,
      // );

      if (!prosumer.prosumerId) {
        this.logger.warn(`No prosumer ID found for meter ${meterId}`);
        return null;
      }

      const primaryWallet = await this.prosumersService.getPrimaryWallet(
        prosumer.prosumerId,
      );

      const walletAddress: string = primaryWallet?.walletAddress || '';
      const prosumerAddress: string = walletAddress; // Prosumer address same as wallet for now

      if (!walletAddress) {
        this.logger.warn(`No wallet address found for meter ${meterId}`);
        return null;
      }

      // Verify meter is authorized on blockchain
      const isMeterAuthorized =
        await this.blockchainService.isMeterIdAuthorized(meterId);
      const isProsumerAuthorized =
        await this.blockchainService.isMeterAuthorized(walletAddress);
      if (!isMeterAuthorized || !isProsumerAuthorized) {
        this.logger.warn(`Meter ${meterId} is not authorized on blockchain`);
        // Auto-authorize the meter if needed (requires owner permissions)
        try {
          const meterAddress = walletAddress;
          await this.blockchainService.authorizeMeter(
            walletAddress,
            meterId,
            meterAddress,
          );
          this.logger.log(`Auto-authorized meter ${meterId} on blockchain`);
        } catch (authError) {
          this.logger.error(
            `Failed to auto-authorize meter ${meterId}:`,
            authError,
          );
          return null;
        }
      }

      // Get conversion ratio from blockchain
      const etkAmount =
        await this.blockchainService.getCalculateEtkAmount(netEnergyWh);

      // Create settlement record
      const settlement = await this.energySettlementsService.create({
        meterId,
        periodStartTime: latestReadings.periodStartTime,
        periodEndTime: latestReadings.lastReadingTime,
        settlementTrigger: trigger,
        rawExportKwh: latestReadings.exportEnergyWh / 1000,
        rawImportKwh: latestReadings.importEnergyWh / 1000,
        netKwhFromGrid: netEnergyKwh,
        etkAmountCredited: etkAmount,
        status: 'PENDING',
        createdAtBackend: new Date().toISOString(),
        detailedEnergyBreakdown: {
          exportEnergyWh: latestReadings.exportEnergyWh,
          importEnergyWh: latestReadings.importEnergyWh,
          netEnergyWh,
        },
      });

      // Generate unique settlement ID for blockchain
      const settlementId = `settlement_${settlement.settlementId}_${Date.now()}`;

      // Convert float to integer (remove decimal places)
      const netEnergyWhInt = Math.floor(netEnergyWh); // Convert -2236.8 to -2236

      // this.logger.debug(
      //   `Blockchain settlement for meter ${meterId}: Original=${netEnergyWh} Wh, Integer=${netEnergyWhInt} Wh`,
      // );

      // Process blockchain settlement using the new enhanced method
      let txHash: string;
      try {
        // Use the new processEnergySettlement method which handles both mint and burn
        txHash = await this.blockchainService.processEnergySettlement(
          walletAddress,
          meterId,
          prosumerAddress,
          netEnergyWhInt, // Use Wh directly as the contract expects
          settlementId,
          settlement.settlementId,
        );

        this.logger.log(
          `Settlement processed for meter ${meterId}: ${netEnergyKwh} kWh (${netEnergyWh} Wh), TX: ${txHash}`,
        );
      } catch (blockchainError) {
        this.logger.error(
          `Blockchain settlement failed for meter ${meterId}:`,
          blockchainError,
        );

        // Update settlement status to failed
        await this.energySettlementsService.update(settlement.settlementId, {
          meterId: settlement.meterId,
          periodStartTime:
            settlement.periodStartTime instanceof Date
              ? settlement.periodStartTime.toISOString()
              : settlement.periodStartTime,
          periodEndTime:
            settlement.periodEndTime instanceof Date
              ? settlement.periodEndTime.toISOString()
              : settlement.periodEndTime,
          netKwhFromGrid: settlement.netKwhFromGrid,
          status: 'FAILED',
          settlementTrigger: settlement.settlementTrigger,
          createdAtBackend:
            settlement.createdAtBackend instanceof Date
              ? settlement.createdAtBackend.toISOString()
              : settlement.createdAtBackend,
          confirmedAtOnChain: new Date().toISOString(),
        });
        return null;
      }

      // Update settlement with transaction hash
      await this.energySettlementsService.update(settlement.settlementId, {
        meterId: settlement.meterId,
        periodStartTime:
          settlement.periodStartTime instanceof Date
            ? settlement.periodStartTime.toISOString()
            : settlement.periodStartTime,
        periodEndTime:
          settlement.periodEndTime instanceof Date
            ? settlement.periodEndTime.toISOString()
            : settlement.periodEndTime,
        netKwhFromGrid: settlement.netKwhFromGrid,
        status: 'PENDING',
        settlementTrigger: settlement.settlementTrigger,
        createdAtBackend:
          settlement.createdAtBackend instanceof Date
            ? settlement.createdAtBackend.toISOString()
            : settlement.createdAtBackend,
        blockchainTxHash: txHash,
      });

      // Send reset command to device to clear settlement counters
      // await this.sendSettlementResetCommand(
      //   meterId,
      //   prosumer?.prosumerId as string,
      // );

      // return null;

      return txHash;
    } catch (error) {
      this.logger.error(
        `Error processing settlement for meter ${meterId}:`,
        error,
      );
      throw error;
    }
  }

  private async getLatestSettlementReadings(
    meterId: string,
  ): Promise<SettlementReadingsData | null> {
    try {
      // Get the most recent detailed energy readings for this meter
      const readings =
        await this.energyReadingsDetailedService.findLatestGridImportAndExportByMeterId(
          meterId,
        );
      if (!readings) {
        this.logger.warn(
          `No detailed energy readings found for meter ${meterId}`,
        );
        return null;
      }
      // show readings in debug log
      // this.logger.debug(`Readings: ${JSON.stringify(readings, null, 2)}`);

      // Extract settlement energy ONLY from GRID_EXPORT and GRID_IMPORT subsystems
      const exportEnergyWh = readings.exportEnergyWh || 0;
      const importEnergyWh = readings.importEnergyWh || 0;

      // Calculate net energy: Export is positive (+), Import is negative (-)
      // Positive net = export to grid = mint tokens
      // Negative net = import from grid = burn tokens
      const netEnergyWh = exportEnergyWh - importEnergyWh;

      // this.logger.debug(
      //   `Settlement calculation for meter ${meterId}: GRID_EXPORT=${exportEnergyWh}Wh, GRID_IMPORT=${importEnergyWh}Wh, Net=${netEnergyWh}Wh (${netEnergyWh > 0 ? 'MINT tokens' : netEnergyWh < 0 ? 'BURN tokens' : 'NO ACTION'})`,
      // );

      const periodStartTime = new Date(
        Date.now() - 5 * 60 * 1000,
      ).toISOString(); // Assuming last 5 minutes for settlement period
      const lastReadingTime = new Date().toISOString(); // Current time as last reading time

      return {
        exportEnergyWh,
        importEnergyWh,
        netEnergyWh,
        periodStartTime,
        lastReadingTime,
      };
    } catch (error) {
      this.logger.error(
        `Error getting settlement readings for meter ${meterId}:`,
        error,
      );
      return null;
    }
  }

  private async sendSettlementResetCommand(
    meterId: string,
    prosumerId: string,
  ) {
    try {
      const command: DeviceCommandPayload = {
        energy: {
          reset_settlement: 'all',
        },
      };

      await this.mqttService.sendCommand(meterId, command, prosumerId);
      this.logger.log(`Settlement reset command sent to meter ${meterId}`);
    } catch (error) {
      this.logger.error(
        `Error sending settlement reset command to meter ${meterId}:`,
        error,
      );
    }
  }

  async manualSettlement(
    meterId: string,
    prosumerId: string,
  ): Promise<string | null> {
    try {
      // Verify that the prosumer owns this meter
      const meterProsumers = await this.prosumersService.findByMeterId(meterId);

      if (
        !meterProsumers.find(
          (p: any) => (p as { prosumerId?: string })?.prosumerId === prosumerId,
        )
      ) {
        throw new Error('Unauthorized: Prosumer does not own this meter');
      }

      return await this.processMeterSettlement(
        meterId,
        SettlementTrigger.MANUAL,
      );
    } catch (error) {
      this.logger.error(
        `Error in manual settlement for meter ${meterId}:`,
        error,
      );
      throw error;
    }
  }

  async confirmSettlement(
    settlementId: number,
    txHash: string,
    success: boolean,
    etkAmount?: number,
  ) {
    try {
      const status = success
        ? TransactionStatus.SUCCESS
        : TransactionStatus.FAILED;

      const settlement =
        await this.energySettlementsService.findOne(settlementId);

      if (!settlement) {
        this.logger.warn(
          `Settlement ${settlementId} not found for confirmation`,
        );
        return;
      }

      await this.energySettlementsService.update(settlementId, {
        meterId: settlement.meterId,
        etkAmountCredited: etkAmount || settlement.etkAmountCredited,
        periodStartTime:
          settlement.periodStartTime instanceof Date
            ? settlement.periodStartTime.toISOString()
            : settlement.periodStartTime,
        periodEndTime:
          settlement.periodEndTime instanceof Date
            ? settlement.periodEndTime.toISOString()
            : settlement.periodEndTime,
        netKwhFromGrid: settlement.netKwhFromGrid,
        status: status.toString(),
        settlementTrigger: settlement.settlementTrigger,
        createdAtBackend:
          settlement.createdAtBackend instanceof Date
            ? settlement.createdAtBackend.toISOString()
            : settlement.createdAtBackend,
        confirmedAtOnChain: new Date().toISOString(),
        blockchainTxHash: txHash, // Ensure txHash is updated
      });

      this.logger.log(
        `Settlement ${settlementId} confirmed: ${status} with txHash: ${txHash}`,
      );
    } catch (error) {
      this.logger.error(`Error confirming settlement ${settlementId}:`, error);
    }
  }

  async getSettlementHistory(
    meterId?: string,
    prosumerId?: string,
    limit: number = 50,
  ) {
    try {
      const filters: { meterId?: string } = {};
      if (meterId) {
        filters.meterId = meterId;
      }
      if (prosumerId) {
        // Get meters owned by prosumer
        const meters = await this.smartMetersService.findAll({ prosumerId });
        if (meters.length > 0) {
          // This would need to be implemented as an 'IN' query in the actual service
          const firstMeter = meters[0] as { meterId?: string };
          filters.meterId = firstMeter?.meterId; // Simplified for now
        }
      }

      const settlements = await this.energySettlementsService.findAll();

      // Sort by creation date, most recent first
      return settlements
        .sort(
          (a, b) =>
            new Date(b.createdAtBackend).getTime() -
            new Date(a.createdAtBackend).getTime(),
        )
        .slice(0, limit);
    } catch (error) {
      this.logger.error('Error getting settlement history:', error);
      throw error;
    }
  }

  // New method to get blockchain settlement information
  async getBlockchainSettlement(settlementId: string) {
    try {
      return await this.blockchainService.getSettlement(settlementId);
    } catch (error) {
      this.logger.error(
        `Error getting blockchain settlement ${settlementId}:`,
        error,
      );
      return null;
    }
  }

  // New method to check current conversion ratio
  async getConversionRatio(): Promise<number> {
    try {
      return await this.blockchainService.getConversionRatio();
    } catch (error) {
      this.logger.error('Error getting conversion ratio:', error);
      return 100; // Default fallback
    }
  }

  // New method to get minimum settlement threshold
  async getMinimumSettlementThreshold(): Promise<number> {
    try {
      return await this.blockchainService.getMinSettlementWh();
    } catch (error) {
      this.logger.error('Error getting minimum settlement threshold:', error);
      return 100; // Default fallback in Wh
    }
  }

  // New method to authorize a meter on blockchain (admin function)
  async authorizeMeterOnBlockchain(
    ownerWalletAddress: string,
    meterId: string,
    meterAddress: string,
  ): Promise<string> {
    try {
      return await this.blockchainService.authorizeMeter(
        ownerWalletAddress,
        meterId,
        meterAddress,
      );
    } catch (error) {
      this.logger.error(
        `Error authorizing meter ${meterId} on blockchain:`,
        error,
      );
      throw error;
    }
  }

  // New method to check if meter is authorized
  async checkMeterAuthorization(meterId: string): Promise<boolean> {
    try {
      return await this.blockchainService.isMeterIdAuthorized(meterId);
    } catch (error) {
      this.logger.error(
        `Error checking meter authorization for ${meterId}:`,
        error,
      );
      return false;
    }
  }
}
