import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
// import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EnergySettlementsService } from '../../models/EnergySettlements/EnergySettlements.service';
import { SmartMetersService } from '../../models/SmartMeters/SmartMeters.service';
import { BlockchainService } from '../Blockchain/blockchain.service';
import { MqttService } from '../Telemetry/mqtt.service';
import { TransactionLogsService } from '../../models/TransactionLogs/TransactionLogs.service';
import { SettlementTrigger, TransactionStatus } from '../../common/enums';
import { DeviceCommandPayload } from '../../common/interfaces';
import { WalletsService } from 'src/models/Wallets/Wallets.service';
import { ProsumersService } from 'src/models/Prosumers/Prosumers.service';
import { StatService } from '../Stat/stat.service';
import { EnergyAnalyticsService } from './energy-analytics.service';
import { RedisTelemetryService } from '../Telemetry/redis-telemetry.service';

interface SettlementReadingsData {
  exportEnergyWh: number;
  importEnergyWh: number;
  netEnergyWh: number;
  periodStartTime: string;
  lastReadingTime: string;
}

interface SettlementEstimatorData {
  status: 'EXPORTING' | 'IMPORTING' | 'IDLE';
  periodMinutes: number;
  currentPowerKw: number;
  averagePowerKw: number;
  estimatedEtkAtSettlement: number;
  currentRunningEtk: number;
  periodStartTime: string;
  currentTime: string;
  periodEndTime: string;
  progressPercentage: number;
  timeRemaining: string;
  netEnergyWh: number;
  settlementEnergyWh?: {
    gridExport: number;
    gridImport: number;
  };
}

@Injectable()
export class EnergySettlementService {
  private readonly logger = new Logger(EnergySettlementService.name);
  private readonly defaultSettlementInterval = 5; // minutes

  // Power logging arrays for each meter (reset after settlement)
  private powerLogArrays = new Map<
    string,
    Array<{ timestamp: Date; powerKw: number }>
  >();

  constructor(
    private configService: ConfigService,
    private energySettlementsService: EnergySettlementsService,
    private smartMetersService: SmartMetersService,
    private redisTelemetryService: RedisTelemetryService,
    @Inject(forwardRef(() => BlockchainService))
    private blockchainService: BlockchainService,
    private mqttService: MqttService,
    private transactionLogsService: TransactionLogsService,
    private prosumersService: ProsumersService,
    private readonly WalletsService: WalletsService, // Assuming this is imported correctly
    @Inject(forwardRef(() => StatService))
    private statService: StatService,
    @Inject(forwardRef(() => EnergyAnalyticsService))
    private energyAnalyticsService: EnergyAnalyticsService,
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

  // Log power data every minute for all meters
  @Cron(CronExpression.EVERY_SECOND)
  async logPowerData() {
    try {
      const activeMeters = await this.smartMetersService.findAll();

      for (const meter of activeMeters) {
        const meterId = meter.meterId;

        // Get prosumer for this meter
        const prosumers = await this.prosumersService.findByMeterId(meterId);
        if (!prosumers || prosumers.length === 0) continue;

        const prosumer = prosumers[0] as { prosumerId?: string };
        if (!prosumer.prosumerId) continue;

        // Get current real-time data
        const realTimeData =
          await this.energyAnalyticsService.getRealTimeEnergyData(
            prosumer.prosumerId,
          );

        if (!realTimeData.timeSeries || realTimeData.timeSeries.length === 0)
          continue;

        // Get current power (netFlow)
        const latestData = realTimeData.timeSeries[0] as {
          netFlow?: number;
          [key: string]: any;
        };
        const currentPowerKw = Number(latestData?.netFlow) || 0;

        // Add to power log array
        this.addPowerLog(meterId, currentPowerKw);
      }
    } catch (error) {
      this.logger.error('Error logging power data:', error);
    }
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

      // Validate netEnergyWh
      if (!isFinite(netEnergyWh) || isNaN(netEnergyWh)) {
        this.logger.error(
          `Invalid netEnergyWh for meter ${meterId}: ${netEnergyWh}`,
        );
        return null;
      }

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
      await this.sendSettlementResetCommand(
        meterId,
        prosumer?.prosumerId || '',
      );

      // Clear power log array after successful settlement
      this.clearPowerLog(meterId);

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
      // Get the most recent telemetry data from Redis (contains settlement_energy)
      const latestData =
        await this.redisTelemetryService.getLatestData(meterId);

      if (!latestData || !latestData.data) {
        this.logger.warn(
          `No telemetry data found in Redis for meter ${meterId}`,
        );
        return null;
      }

      // Extract settlement energy from the latest data
      // settlement_energy represents energy accumulated since last settlement reset
      const exportEnergyRaw = latestData.data.export?.settlement_energy;
      const importEnergyRaw = latestData.data.import?.settlement_energy;

      // Validate and convert to numbers with proper fallback
      const exportEnergyWh =
        typeof exportEnergyRaw === 'number' && isFinite(exportEnergyRaw)
          ? exportEnergyRaw
          : 0;
      const importEnergyWh =
        typeof importEnergyRaw === 'number' && isFinite(importEnergyRaw)
          ? importEnergyRaw
          : 0;

      // Log warning if we had to use fallback values
      if (
        exportEnergyRaw !== undefined &&
        exportEnergyWh === 0 &&
        exportEnergyRaw !== 0
      ) {
        this.logger.warn(
          `Invalid export settlement_energy for meter ${meterId}: ${exportEnergyRaw} (type: ${typeof exportEnergyRaw})`,
        );
      }
      if (
        importEnergyRaw !== undefined &&
        importEnergyWh === 0 &&
        importEnergyRaw !== 0
      ) {
        this.logger.warn(
          `Invalid import settlement_energy for meter ${meterId}: ${importEnergyRaw} (type: ${typeof importEnergyRaw})`,
        );
      }

      // Calculate net energy: Export is positive (+), Import is negative (-)
      // Positive net = export to grid = mint tokens
      // Negative net = import from grid = burn tokens
      const netEnergyWh = exportEnergyWh - importEnergyWh;

      this.logger.log(
        `Settlement calculation for meter ${meterId}: GRID_EXPORT=${exportEnergyWh}Wh, GRID_IMPORT=${importEnergyWh}Wh, Net=${netEnergyWh}Wh (${netEnergyWh > 0 ? 'MINT tokens' : netEnergyWh < 0 ? 'BURN tokens' : 'NO ACTION'})`,
      );

      const periodStartTime = new Date(
        Date.now() - 5 * 60 * 1000,
      ).toISOString(); // Assuming last 5 minutes for settlement period
      const lastReadingTime = latestData.datetime || new Date().toISOString();

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
    scope: 'own' | 'public' | 'all' = 'own',
  ): Promise<any[]> {
    try {
      // this.logger.debug(
      //   `Getting settlement history for meterId: ${meterId}, prosumerId: ${prosumerId}, limit: ${limit}, scope: ${scope}`,
      // );

      let settlements: any[] = [];

      if (scope === 'public') {
        // Get all public settlements (all prosumers) - remove sensitive data
        const allSettlements = await this.energySettlementsService.findAll();

        // Remove sensitive information for public view
        settlements = (allSettlements || []).map((settlement: any) =>
          this.formatSettlementForPublic(settlement),
        );
      } else if (scope === 'all') {
        // Get all settlements for admin/debug purposes
        const allSettlements = await this.energySettlementsService.findAll();
        settlements = allSettlements || [];
      } else {
        // Default: Get only user's own settlements (scope === 'own')
        if (!prosumerId) {
          throw new Error('Prosumer ID is required for own settlements');
        }

        // Get all meters owned by prosumer
        const meters = await this.smartMetersService.findAll({ prosumerId });

        if (!meters || meters.length === 0) {
          this.logger.warn(`No meters found for prosumer ${prosumerId}`);
          return [];
        }

        // this.logger.debug(
        //   `Found ${meters.length} meters for prosumer ${prosumerId}`,
        // );

        // If specific meterId is provided, filter by that meter
        if (meterId) {
          // Verify the meter belongs to the prosumer
          const userMeter = meters.find(
            (m: any) => (m as { meterId?: string })?.meterId === meterId,
          );
          if (!userMeter) {
            this.logger.warn(
              `Meter ${meterId} not found for prosumer ${prosumerId}`,
            );
            return [];
          }

          // Get settlements for specific meter
          const allSettlements = await this.energySettlementsService.findAll();
          settlements = (allSettlements || []).filter(
            (s: any) => (s as { meterId?: string })?.meterId === meterId,
          );
        } else {
          // Get settlements for all user's meters
          const meterIds = meters.map(
            (m: any) => (m as { meterId?: string })?.meterId,
          );
          const allSettlements = await this.energySettlementsService.findAll();
          settlements = (allSettlements || []).filter((s: any) =>
            meterIds.includes((s as { meterId?: string })?.meterId),
          );
        }
      }

      // Sort by creation date, most recent first
      return settlements
        .sort((a: any, b: any) => {
          const timestampA = (a as { createdAtBackend?: string | Date })
            ?.createdAtBackend
            ? new Date(
                (a as { createdAtBackend?: string | Date }).createdAtBackend!,
              ).getTime()
            : 0;
          const timestampB = (b as { createdAtBackend?: string | Date })
            ?.createdAtBackend
            ? new Date(
                (b as { createdAtBackend?: string | Date }).createdAtBackend!,
              ).getTime()
            : 0;
          return timestampB - timestampA;
        })
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

  // New method to get settlement estimator data (optimized with getRealTimeEnergyData)
  async getSettlementEstimator(
    meterId: string,
  ): Promise<SettlementEstimatorData | null> {
    try {
      // this.logger.debug(`Getting settlement estimator for meter ${meterId}`);

      // Get prosumer ID from meter to use optimized getRealTimeEnergyData
      const prosumers = await this.prosumersService.findByMeterId(meterId);
      if (!prosumers || prosumers.length === 0) {
        this.logger.warn(`No prosumer found for meter ${meterId}`);
        return null;
      }

      const prosumer = prosumers[0] as { prosumerId?: string };
      if (!prosumer.prosumerId) {
        this.logger.warn(`Invalid prosumer data for meter ${meterId}`);
        return null;
      }

      // Use optimized getRealTimeEnergyData for fast power data retrieval
      const realTimeData =
        await this.energyAnalyticsService.getRealTimeEnergyData(
          prosumer.prosumerId,
        );

      if (!realTimeData.timeSeries || realTimeData.timeSeries.length === 0) {
        this.logger.warn(`No real-time data found for meter ${meterId}`);
        return null;
      }

      // Get current power from index 0 (most recent data) with type safety
      const latestData = realTimeData.timeSeries[0] as {
        netFlow?: number;
        gridExport?: number;
        gridImport?: number;
        settlementEnergyWh?: {
          export: number; // Already in kWh from dashboard service
          import: number; // Already in kWh from dashboard service
        };
        [key: string]: any;
      };
      const currentPowerKw: number = Number(latestData?.netFlow) || 0;

      // Extract settlement energy data from latest reading
      const settlementEnergyKwh = latestData?.settlementEnergyWh || {
        export: 0,
        import: 0,
      };

      // Validate settlement energy data
      const exportKwh = Number(settlementEnergyKwh.export);
      const importKwh = Number(settlementEnergyKwh.import);

      if (!isFinite(exportKwh) || isNaN(exportKwh)) {
        this.logger.warn(
          `Invalid export settlement energy for meter ${meterId}: ${settlementEnergyKwh.export}`,
        );
        return null;
      }

      if (!isFinite(importKwh) || isNaN(importKwh)) {
        this.logger.warn(
          `Invalid import settlement energy for meter ${meterId}: ${settlementEnergyKwh.import}`,
        );
        return null;
      }

      // Convert kWh to Wh for blockchain calculations
      const exportWh = exportKwh * 1000;
      const importWh = importKwh * 1000;

      // Calculate actual net energy from settlement energy (gridExport - gridImport)
      const actualNetEnergyWh = exportWh - importWh;

      // Get average power from logged power data (not from time series)
      const averagePowerKw = this.getAveragePowerFromLog(meterId);

      // this.logger.debug(
      //   `Settlement data for meter ${meterId}: ActualNet=${actualNetEnergyWh}Wh, Current=${currentPowerKw}kW, Average=${averagePowerKw}kW (from power log)`,
      // );

      // Calculate estimated net energy from real-time data (simulate settlement calculation)
      // Using settlement period timing and power rate calculation
      const settlementIntervalMinutes: number =
        Number(this.configService.get('SETTLEMENT_INTERVAL_MINUTES')) || 5;

      // Get settlement period timing
      const now = new Date();
      const currentMinutes = now.getMinutes();
      const periodStartMinute =
        Math.floor(currentMinutes / settlementIntervalMinutes) *
        settlementIntervalMinutes;
      const periodStart = new Date(now);
      periodStart.setMinutes(periodStartMinute, 0, 0);

      const elapsedMs = now.getTime() - periodStart.getTime();

      // Calculate remaining time
      const periodEnd = new Date(periodStart);
      periodEnd.setMinutes(
        periodStart.getMinutes() + settlementIntervalMinutes,
      );
      const remainingMs = periodEnd.getTime() - now.getTime();
      const remainingHours = remainingMs / (1000 * 60 * 60);

      // Current running ETK is based on actual settlement energy already accumulated
      const currentRunningEtk = await this.blockchainService.calculateEtkAmount(
        Math.floor(Math.abs(actualNetEnergyWh)),
      );

      // this.logger.debug(
      //   `currentRunningEtk for meter ${meterId}: ${currentRunningEtk} ETK`,
      // );

      // Estimate final settlement based on current power rate and remaining time
      // If we have average power from logs, use it to project remaining energy
      let estimatedAdditionalEnergyWh = 0;
      if (averagePowerKw !== 0 && remainingHours > 0) {
        estimatedAdditionalEnergyWh = averagePowerKw * remainingHours * 1000;
      }

      // Fix formatting
      const estimatedFinalNetEnergyWh =
        actualNetEnergyWh + estimatedAdditionalEnergyWh;
      const estimatedEtkAtSettlement =
        await this.blockchainService.calculateEtkAmount(
          Math.floor(Math.abs(estimatedFinalNetEnergyWh)),
        );

      // this.logger.debug(
      //   `Settlement calculation for meter ${meterId}: ActualNet=${actualNetEnergyWh}Wh, Current=${currentPowerKw}kW, Average=${averagePowerKw}kW, EstimatedFinal=${estimatedFinalNetEnergyWh}Wh`,
      // );

      // Determine status based on current power flow
      let status: 'EXPORTING' | 'IMPORTING' | 'IDLE' = 'IDLE';
      if (currentPowerKw > 0.05) {
        // Threshold for export (50W)
        status = 'EXPORTING';
      } else if (currentPowerKw < -0.05) {
        // Threshold for import (-50W)
        status = 'IMPORTING';
      }

      // Calculate progress percentage
      const totalPeriodMs = settlementIntervalMinutes * 60 * 1000;
      const progressPercentage = Math.min(
        100,
        Math.max(0, (elapsedMs / totalPeriodMs) * 100),
      );

      // Calculate time remaining
      const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
      const remainingSeconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
      const timeRemaining = `${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

      return {
        status,
        periodMinutes: settlementIntervalMinutes,
        currentPowerKw: Math.round(currentPowerKw * 100) / 100, // Round to 2 decimal places
        averagePowerKw: Math.round(averagePowerKw * 100) / 100,
        estimatedEtkAtSettlement:
          Math.round(estimatedEtkAtSettlement * 1000) / 1000, // Round to 3 decimal places
        currentRunningEtk: Math.round(currentRunningEtk * 1000) / 1000,
        periodStartTime: periodStart.toTimeString().substr(0, 5), // HH:MM format
        currentTime: now.toTimeString().substr(0, 5),
        periodEndTime: periodEnd.toTimeString().substr(0, 5),
        progressPercentage: Math.round(progressPercentage * 10) / 10, // Round to 1 decimal place
        timeRemaining,
        netEnergyWh: Math.round(actualNetEnergyWh * 10) / 10, // Use actual settlement energy
        settlementEnergyWh: {
          gridExport: Math.round(exportWh * 10) / 10,
          gridImport: Math.round(importWh * 10) / 10,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting settlement estimator for meter ${meterId}:`,
        error,
      );
      return null;
    }
  }

  // Power logging utility methods
  private addPowerLog(meterId: string, powerKw: number) {
    if (!this.powerLogArrays.has(meterId)) {
      this.powerLogArrays.set(meterId, []);
    }

    const powerLog = this.powerLogArrays.get(meterId)!;
    const now = new Date();

    // Add current power reading
    powerLog.push({ timestamp: now, powerKw });

    // Keep only last 10 minutes of data (for settlement period estimation)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const filteredLog = powerLog.filter(
      (entry) => entry.timestamp >= tenMinutesAgo,
    );
    this.powerLogArrays.set(meterId, filteredLog);
  }

  private getAveragePowerFromLog(meterId: string): number {
    const powerLog = this.powerLogArrays.get(meterId) || [];
    if (powerLog.length === 0) return 0;

    const sum = powerLog.reduce((total, entry) => total + entry.powerKw, 0);
    return sum / powerLog.length;
  }

  private clearPowerLog(meterId: string) {
    this.powerLogArrays.set(meterId, []);
  }

  /**
   * DEPRECATED: This method is no longer used.
   * Hourly energy calculations now use TelemetryAggregate table with TimescaleDB.
   *
   * @deprecated Use TelemetryAggregationService instead
   */
  private async calculateHourlyEnergyTotals(
    meterIds: string[],
    hourDate: Date,
  ): Promise<{
    solar: number;
    consumption: number;
    battery: number;
    gridExport: number;
    gridImport: number;
    net: number;
  }> {
    // Return zeros as this method is no longer used
    return {
      solar: 0,
      consumption: 0,
      battery: 0,
      gridExport: 0,
      gridImport: 0,
      net: 0,
    };
  }

  /**
   * Safely format settlement data for public view with proper type safety
   */
  private formatSettlementForPublic(settlement: any): {
    settlementId: string | number | null;
    meterId: string | null;
    periodStartTime: string | Date | null;
    periodEndTime: string | Date | null;
    netKwhFromGrid: number | null;
    etkAmountCredited: number | null;
    status: string | null;
    createdAtBackend: string | Date | null;
  } {
    const settlementData = settlement as {
      settlementId?: string | number;
      meterId?: string;
      periodStartTime?: string | Date;
      periodEndTime?: string | Date;
      netKwhFromGrid?: number;
      etkAmountCredited?: number;
      status?: string;
      createdAtBackend?: string | Date;
    };

    return {
      settlementId: settlementData.settlementId || null,
      meterId: settlementData.meterId || null, // No anonymization
      periodStartTime: settlementData.periodStartTime || null,
      periodEndTime: settlementData.periodEndTime || null,
      netKwhFromGrid: settlementData.netKwhFromGrid || null,
      etkAmountCredited: settlementData.etkAmountCredited || null,
      status: settlementData.status || null,
      createdAtBackend: settlementData.createdAtBackend || null,
    };
  }
}
