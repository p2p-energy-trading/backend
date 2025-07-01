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
}

interface SettlementEstimatorCache {
  meterId: string;
  periodStartTime: Date;
  basePowerKw: number;
  baseNetEnergyWh: number;
  lastUpdateTime: Date;
  settlementIntervalMinutes: number;
  conversionRatio: number;
  lastPowerReading: number;
  // Cached data to avoid database calls
  cachedExportPowerW: number;
  cachedImportPowerW: number;
  cachedExportEnergyWh: number;
  cachedImportEnergyWh: number;
  lastDataFetch: Date;
}

@Injectable()
export class EnergySettlementService {
  private readonly logger = new Logger(EnergySettlementService.name);
  private readonly defaultSettlementInterval = 5; // minutes

  // In-memory cache for settlement estimator optimization
  private readonly estimatorCache = new Map<string, SettlementEstimatorCache>();

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

      // Reset in-memory cache for this meter when settlement is completed
      this.resetEstimatorCache(meterId);

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

  // New method to get settlement estimator data (ultra-optimized version)
  /**
   * ULTRA-FAST Settlement Estimator - ZERO database calls, cache-only
   * This method NEVER blocks on database or blockchain calls for sub-100ms response
   */
  getSettlementEstimator(
    meterId: string,
  ): Promise<SettlementEstimatorData | null> {
    try {
      this.logger.debug(
        `Getting cache-only settlement estimator for meter ${meterId}`,
      );

      const now = new Date();
      const settlementIntervalMinutes: number =
        Number(this.configService.get('SETTLEMENT_INTERVAL_MINUTES')) || 5;

      // CRITICAL: ONLY read from cache, NEVER block on database calls
      let cache = this.estimatorCache.get(meterId);

      // If no cache exists, trigger background update and return fallback data
      if (!cache) {
        this.logger.debug(
          `No cache for meter ${meterId}, triggering background update`,
        );
        // Trigger background cache population (fire and forget)
        this.updateCacheInBackground(meterId, settlementIntervalMinutes).catch(
          (error) =>
            this.logger.error(
              `Background cache update failed for meter ${meterId}:`,
              error,
            ),
        );

        // Return fallback data immediately
        return Promise.resolve(
          this.getFallbackEstimatorData(
            meterId,
            settlementIntervalMinutes,
            now,
          ),
        );
      }

      // Check if cache is stale (older than 30 seconds)
      const cacheAgeMs = now.getTime() - cache.lastDataFetch.getTime();
      if (cacheAgeMs > 30000) {
        this.logger.debug(
          `Cache stale for meter ${meterId}, triggering background refresh`,
        );
        // Trigger background refresh (fire and forget)
        this.updateCacheInBackground(meterId, settlementIntervalMinutes).catch(
          (error) =>
            this.logger.error(
              `Background cache refresh failed for meter ${meterId}:`,
              error,
            ),
        );
      }

      // Check if we're in a new settlement period
      const shouldResetCache = this.shouldResetCacheForNewPeriod(
        cache,
        now,
        settlementIntervalMinutes,
      );

      if (shouldResetCache) {
        this.logger.debug(
          `New settlement period for meter ${meterId}, resetting cache`,
        );
        // Reset cache for new period
        cache = this.resetCacheForNewPeriod(
          cache,
          now,
          settlementIntervalMinutes,
        );
        this.estimatorCache.set(meterId, cache);
      }

      // Calculate current power and energy from CACHED readings (NO database calls)
      const currentPowerKw =
        (cache.cachedExportPowerW - cache.cachedImportPowerW) / 1000;
      const netEnergyWh =
        cache.cachedExportEnergyWh - cache.cachedImportEnergyWh;

      // Update cache timestamp but keep all data
      cache.lastUpdateTime = now;

      // Pre-calculate time values (avoid repeated calculations)
      const currentMinutes = now.getMinutes();
      const periodStartMinute =
        Math.floor(currentMinutes / settlementIntervalMinutes) *
        settlementIntervalMinutes;
      const periodStart = new Date(now);
      periodStart.setMinutes(periodStartMinute, 0, 0);

      const periodEnd = new Date(periodStart);
      periodEnd.setMinutes(
        periodStart.getMinutes() + settlementIntervalMinutes,
      );

      const totalPeriodMs = settlementIntervalMinutes * 60 * 1000;
      const elapsedMs = now.getTime() - periodStart.getTime();
      const remainingMs = periodEnd.getTime() - now.getTime();

      const progressPercentage = Math.min(
        100,
        Math.max(0, (elapsedMs / totalPeriodMs) * 100),
      );
      const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
      const remainingSeconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
      const timeRemaining = `${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

      // Simple running average with cache
      const averagePowerKw = (cache.basePowerKw + currentPowerKw) / 2;

      // Determine status (optimized thresholds)
      let status: 'EXPORTING' | 'IMPORTING' | 'IDLE' = 'IDLE';
      if (netEnergyWh > 50) {
        status = 'EXPORTING';
      } else if (netEnergyWh < -50) {
        status = 'IMPORTING';
      }

      // Use cached conversion ratio (no blockchain call)
      const estimatedEtkAtSettlement =
        cache.conversionRatio > 0
          ? Math.abs(netEnergyWh) / cache.conversionRatio
          : 0;

      return Promise.resolve({
        status,
        periodMinutes: settlementIntervalMinutes,
        currentPowerKw: Math.round(currentPowerKw * 100) / 100,
        averagePowerKw: Math.round(averagePowerKw * 100) / 100,
        estimatedEtkAtSettlement:
          Math.round(estimatedEtkAtSettlement * 1000) / 1000,
        currentRunningEtk: Math.round(estimatedEtkAtSettlement * 1000) / 1000,
        periodStartTime: periodStart.toTimeString().substr(0, 5),
        currentTime: now.toTimeString().substr(0, 5),
        periodEndTime: periodEnd.toTimeString().substr(0, 5),
        progressPercentage: Math.round(progressPercentage * 10) / 10,
        timeRemaining,
        netEnergyWh: Math.round(netEnergyWh * 10) / 10,
      });
    } catch (error) {
      this.logger.error(
        `Error getting ultra-optimized settlement estimator for meter ${meterId}:`,
        error,
      );
      return Promise.resolve(null);
    }
  }

  // Ultra-optimized method to get ONLY GRID_EXPORT and GRID_IMPORT latest readings
  private async getLatestGridReadingsOptimized(meterId: string): Promise<{
    exportPowerW: number;
    importPowerW: number;
    exportEnergyWh: number;
    importEnergyWh: number;
  } | null> {
    try {
      // Get latest readings for GRID_EXPORT and GRID_IMPORT subsystems in parallel
      const [exportReading, importReading] = await Promise.all([
        this.energyReadingsDetailedService.findLatestByMeterIdAndSubsystem(
          meterId,
          'GRID_EXPORT',
        ),
        this.energyReadingsDetailedService.findLatestByMeterIdAndSubsystem(
          meterId,
          'GRID_IMPORT',
        ),
      ]);

      const exportPowerW = exportReading?.currentPowerW || 0;
      const importPowerW = importReading?.currentPowerW || 0;
      const exportEnergyWh = exportReading?.settlementEnergyWh || 0;
      const importEnergyWh = importReading?.settlementEnergyWh || 0;

      return {
        exportPowerW,
        importPowerW,
        exportEnergyWh,
        importEnergyWh,
      };
    } catch (error) {
      this.logger.error(
        `Error getting optimized grid readings for meter ${meterId}:`,
        error,
      );
      return null;
    }
  }

  // Optimized cache initialization with minimal database calls
  private async initializeEstimatorCacheOptimized(
    meterId: string,
    settlementIntervalMinutes: number,
  ): Promise<void> {
    try {
      const now = new Date();

      // Get initial grid readings (only 2 subsystems)
      const gridReadings = await this.getLatestGridReadingsOptimized(meterId);
      let basePowerKw = 0;

      if (gridReadings) {
        basePowerKw =
          (gridReadings.exportPowerW - gridReadings.importPowerW) / 1000;
      }

      // Use cached conversion ratio or get it once and cache it
      let conversionRatio = 100; // Default fallback
      try {
        conversionRatio = await this.blockchainService.getConversionRatio();
      } catch (error) {
        this.logger.warn(
          `Failed to get conversion ratio, using default: ${error}`,
        );
      }

      // Calculate period start time
      const currentMinutes = now.getMinutes();
      const periodStartMinute =
        Math.floor(currentMinutes / settlementIntervalMinutes) *
        settlementIntervalMinutes;
      const periodStart = new Date(now);
      periodStart.setMinutes(periodStartMinute, 0, 0);

      const cacheData: SettlementEstimatorCache = {
        meterId,
        periodStartTime: periodStart,
        basePowerKw,
        baseNetEnergyWh: 0,
        lastUpdateTime: now,
        settlementIntervalMinutes,
        conversionRatio,
        lastPowerReading: basePowerKw,
        cachedExportPowerW: gridReadings?.exportPowerW || 0,
        cachedImportPowerW: gridReadings?.importPowerW || 0,
        cachedExportEnergyWh: gridReadings?.exportEnergyWh || 0,
        cachedImportEnergyWh: gridReadings?.importEnergyWh || 0,
        lastDataFetch: now,
      };

      this.estimatorCache.set(meterId, cacheData);
      this.logger.debug(
        `Initialized optimized estimator cache for meter ${meterId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error initializing optimized estimator cache for meter ${meterId}:`,
        error,
      );
    }
  }

  // Helper method to initialize estimator cache
  private async initializeEstimatorCache(
    meterId: string,
    settlementIntervalMinutes: number,
  ): Promise<void> {
    try {
      const now = new Date();

      // Get initial power reading
      const latestReading =
        await this.energyReadingsDetailedService.findRecentByMeterId(
          meterId,
          1,
        );
      let basePowerKw = 0;
      let exportPower = 0;
      let importPower = 0;

      if (latestReading && latestReading.length > 0) {
        const reading = latestReading[0];
        exportPower =
          reading.subsystem === 'GRID_EXPORT' ? reading.currentPowerW || 0 : 0;
        importPower =
          reading.subsystem === 'GRID_IMPORT' ? reading.currentPowerW || 0 : 0;
        basePowerKw = (exportPower - importPower) / 1000;
      }

      // Get conversion ratio (cache it for performance)
      let conversionRatio = 100; // Default fallback
      try {
        conversionRatio = await this.blockchainService.getConversionRatio();
      } catch (error) {
        this.logger.warn(
          `Failed to get conversion ratio, using default: ${error}`,
        );
      }

      // Calculate period start time
      const currentMinutes = now.getMinutes();
      const periodStartMinute =
        Math.floor(currentMinutes / settlementIntervalMinutes) *
        settlementIntervalMinutes;
      const periodStart = new Date(now);
      periodStart.setMinutes(periodStartMinute, 0, 0);

      const cacheData: SettlementEstimatorCache = {
        meterId,
        periodStartTime: periodStart,
        basePowerKw,
        baseNetEnergyWh: 0,
        lastUpdateTime: now,
        settlementIntervalMinutes,
        conversionRatio,
        lastPowerReading: basePowerKw,
        cachedExportPowerW: exportPower,
        cachedImportPowerW: importPower,
        cachedExportEnergyWh: 0,
        cachedImportEnergyWh: 0,
        lastDataFetch: now,
      };

      this.estimatorCache.set(meterId, cacheData);
      this.logger.debug(`Initialized estimator cache for meter ${meterId}`);
    } catch (error) {
      this.logger.error(
        `Error initializing estimator cache for meter ${meterId}:`,
        error,
      );
    }
  }

  /**
   * Updates cache in the background without blocking the main endpoint
   */
  private async updateCacheInBackground(
    meterId: string,
    settlementIntervalMinutes: number,
  ): Promise<void> {
    try {
      this.logger.debug(`Background cache update for meter ${meterId}`);

      // Get latest grid readings
      const gridReadings = await this.getLatestGridReadingsOptimized(meterId);
      if (!gridReadings) {
        this.logger.warn(
          `No grid readings found for background update meter ${meterId}`,
        );
        return;
      }

      // Get conversion ratio if needed
      let conversionRatio = 100; // Default fallback
      try {
        conversionRatio = await this.blockchainService.getConversionRatio();
      } catch (error) {
        this.logger.warn(
          `Failed to get conversion ratio in background update: ${error}`,
        );
      }

      const now = new Date();

      // Calculate period start time
      const currentMinutes = now.getMinutes();
      const periodStartMinute =
        Math.floor(currentMinutes / settlementIntervalMinutes) *
        settlementIntervalMinutes;
      const periodStart = new Date(now);
      periodStart.setMinutes(periodStartMinute, 0, 0);

      const currentPowerKw =
        (gridReadings.exportPowerW - gridReadings.importPowerW) / 1000;

      const cacheData: SettlementEstimatorCache = {
        meterId,
        periodStartTime: periodStart,
        basePowerKw: currentPowerKw,
        baseNetEnergyWh: 0,
        lastUpdateTime: now,
        settlementIntervalMinutes,
        conversionRatio,
        lastPowerReading: currentPowerKw,
        cachedExportPowerW: gridReadings.exportPowerW,
        cachedImportPowerW: gridReadings.importPowerW,
        cachedExportEnergyWh: gridReadings.exportEnergyWh,
        cachedImportEnergyWh: gridReadings.importEnergyWh,
        lastDataFetch: now,
      };

      this.estimatorCache.set(meterId, cacheData);
      this.logger.debug(`Background cache updated for meter ${meterId}`);
    } catch (error) {
      this.logger.error(
        `Error in background cache update for meter ${meterId}:`,
        error,
      );
    }
  }

  /**
   * Returns fallback estimator data when cache is not available
   */
  private getFallbackEstimatorData(
    meterId: string,
    settlementIntervalMinutes: number,
    now: Date,
  ): SettlementEstimatorData {
    this.logger.debug(`Returning fallback data for meter ${meterId}`);

    // Calculate time values for current period
    const currentMinutes = now.getMinutes();
    const periodStartMinute =
      Math.floor(currentMinutes / settlementIntervalMinutes) *
      settlementIntervalMinutes;
    const periodStart = new Date(now);
    periodStart.setMinutes(periodStartMinute, 0, 0);

    const periodEnd = new Date(periodStart);
    periodEnd.setMinutes(periodStart.getMinutes() + settlementIntervalMinutes);

    const totalPeriodMs = settlementIntervalMinutes * 60 * 1000;
    const elapsedMs = now.getTime() - periodStart.getTime();
    const remainingMs = periodEnd.getTime() - now.getTime();

    const progressPercentage = Math.min(
      100,
      Math.max(0, (elapsedMs / totalPeriodMs) * 100),
    );
    const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
    const remainingSeconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
    const timeRemaining = `${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

    return {
      status: 'IDLE',
      periodMinutes: settlementIntervalMinutes,
      currentPowerKw: 0,
      averagePowerKw: 0,
      estimatedEtkAtSettlement: 0,
      currentRunningEtk: 0,
      periodStartTime: periodStart.toTimeString().substr(0, 5),
      currentTime: now.toTimeString().substr(0, 5),
      periodEndTime: periodEnd.toTimeString().substr(0, 5),
      progressPercentage: Math.round(progressPercentage * 10) / 10,
      timeRemaining,
      netEnergyWh: 0,
    };
  }

  /**
   * Resets cache for a new settlement period while preserving what we can
   */
  private resetCacheForNewPeriod(
    existingCache: SettlementEstimatorCache,
    now: Date,
    settlementIntervalMinutes: number,
  ): SettlementEstimatorCache {
    // Calculate new period start time
    const currentMinutes = now.getMinutes();
    const periodStartMinute =
      Math.floor(currentMinutes / settlementIntervalMinutes) *
      settlementIntervalMinutes;
    const periodStart = new Date(now);
    periodStart.setMinutes(periodStartMinute, 0, 0);

    // Keep most data but reset period-specific values
    return {
      ...existingCache,
      periodStartTime: periodStart,
      baseNetEnergyWh: 0,
      lastUpdateTime: now,
    };
  }

  /**
   * Helper method to check if cache should be reset for new period
   */
  private shouldResetCacheForNewPeriod(
    cache: SettlementEstimatorCache,
    now: Date,
    settlementIntervalMinutes: number,
  ): boolean {
    const currentMinutes = now.getMinutes();
    const currentPeriodStartMinute =
      Math.floor(currentMinutes / settlementIntervalMinutes) *
      settlementIntervalMinutes;
    const cachedPeriodStartMinute = cache.periodStartTime.getMinutes();

    // Reset if we're in a new settlement period
    return currentPeriodStartMinute !== cachedPeriodStartMinute;
  }

  /**
   * Background cache refresh every 30 seconds to keep estimator data fresh
   */
  @Cron('*/30 * * * * *')
  async refreshEstimatorCacheBackground() {
    try {
      const cacheMeters = Array.from(this.estimatorCache.keys());
      if (cacheMeters.length === 0) {
        return; // No meters to update
      }

      this.logger.debug(`Refreshing cache for ${cacheMeters.length} meters`);

      // Update caches in parallel for better performance
      const updatePromises = cacheMeters.map((meterId) => {
        const cache = this.estimatorCache.get(meterId);
        if (cache) {
          return this.updateCacheInBackground(
            meterId,
            cache.settlementIntervalMinutes,
          );
        }
        return Promise.resolve();
      });

      await Promise.allSettled(updatePromises);
      this.logger.debug(`Background cache refresh completed`);
    } catch (error) {
      this.logger.error('Error in background cache refresh:', error);
    }
  }

  /**
   * Method to reset estimator cache when settlement is completed
   */
  private resetEstimatorCache(meterId: string): void {
    this.estimatorCache.delete(meterId);
    this.logger.debug(`Reset estimator cache for meter ${meterId}`);
  }

  /**
   * Method to clear all estimator cache (useful for maintenance)
   */
  public clearAllEstimatorCache(): void {
    this.estimatorCache.clear();
    this.logger.log('Cleared all estimator cache');
  }
}
