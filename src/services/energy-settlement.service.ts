import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EnergySettlementsService } from '../graphql/EnergySettlements/EnergySettlements.service';
import { SmartMetersService } from '../graphql/SmartMeters/SmartMeters.service';
import { EnergyReadingsService } from '../graphql/EnergyReadings/EnergyReadings.service';
import { BlockchainService } from './blockchain.service';
import { MqttService } from './mqtt.service';
import { TransactionLogsService } from '../graphql/TransactionLogs/TransactionLogs.service';
import {
  SettlementTrigger,
  TransactionType,
  TransactionStatus,
} from '../common/enums';
import { DeviceCommandPayload } from '../common/interfaces';

interface SettlementReadingsData {
  exportEnergyWh: number;
  importEnergyWh: number;
  netEnergyWh: number;
  periodStartTime: string;
}

@Injectable()
export class EnergySettlementService {
  private readonly logger = new Logger(EnergySettlementService.name);
  private readonly defaultSettlementInterval = 5; // minutes

  constructor(
    private configService: ConfigService,
    private energySettlementsService: EnergySettlementsService,
    private smartMetersService: SmartMetersService,
    private energyReadingsService: EnergyReadingsService,
    private blockchainService: BlockchainService,
    private mqttService: MqttService,
    private transactionLogsService: TransactionLogsService,
  ) {}

  // Run every 5 minutes by default
  @Cron(CronExpression.EVERY_5_MINUTES)
  async periodicSettlement() {
    const isAutoSettlementEnabled =
      this.configService.get('AUTO_SETTLEMENT_ENABLED') === 'true';
    if (!isAutoSettlementEnabled) {
      return;
    }

    this.logger.log('Starting periodic energy settlement');
    await this.processAllMetersSettlement(SettlementTrigger.PERIODIC);
  }

  async processAllMetersSettlement(
    trigger: SettlementTrigger = SettlementTrigger.MANUAL,
  ) {
    try {
      const activeMeters = await this.smartMetersService.findAll();

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
      const netEnergyKwh = latestReadings.netEnergyWh / 1000; // Convert Wh to kWh

      // Check if settlement threshold is met
      const settlementThreshold = parseFloat(
        this.configService.get('SETTLEMENT_THRESHOLD_KWH') || '0.1',
      );
      if (Math.abs(netEnergyKwh) < settlementThreshold) {
        this.logger.log(
          `Settlement threshold not met for meter ${meterId}: ${netEnergyKwh} kWh`,
        );
        return null;
      }

      // Get meter owner's wallet
      const prosumers = await this.smartMetersService.findProsumers(meterId);
      if (!prosumers || prosumers.length === 0) {
        this.logger.warn(`No prosumer found for meter ${meterId}`);
        return null;
      }

      const prosumer = prosumers[0] as {
        walletAddress?: string;
        meterBlockchainAddress?: string;
        prosumerId?: string;
      };

      // For now, we'll use a simplified wallet address approach
      const walletAddress: string =
        prosumer?.walletAddress || prosumer?.meterBlockchainAddress || '';

      if (!walletAddress) {
        this.logger.warn(`No wallet address found for meter ${meterId}`);
        return null;
      }

      // Create settlement record
      const settlement = await this.energySettlementsService.create({
        meterId,
        periodStartTime: latestReadings.periodStartTime,
        periodEndTime: new Date().toISOString(),
        settlementTrigger: trigger,
        rawExportKwh: latestReadings.exportEnergyWh / 1000,
        rawImportKwh: latestReadings.importEnergyWh / 1000,
        netKwhFromGrid: netEnergyKwh,
        status: 'PENDING',
        createdAtBackend: new Date().toISOString(),
      });

      // Process blockchain transaction
      let txHash: string;
      if (netEnergyKwh > 0) {
        // Net export - mint tokens
        txHash = await this.blockchainService.convertEnergyToTokens(
          walletAddress,
          netEnergyKwh,
        );
      } else {
        // Net import - burn tokens (if available)
        const tokenBalance = await this.blockchainService.getTokenBalance(
          walletAddress,
          this.configService.get('CONTRACT_ETK_TOKEN') || '',
        );

        if (tokenBalance >= Math.abs(netEnergyKwh)) {
          txHash = await this.blockchainService.burnTokensForEnergy(
            walletAddress,
            Math.abs(netEnergyKwh),
          );
        } else {
          this.logger.warn(
            `Insufficient token balance for meter ${meterId}: ${tokenBalance} < ${Math.abs(netEnergyKwh)}`,
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

      // Send reset command to device
      await this.sendSettlementResetCommand(
        meterId,
        prosumer?.prosumerId as string,
      );

      this.logger.log(
        `Settlement processed for meter ${meterId}: ${netEnergyKwh} kWh, TX: ${txHash}`,
      );
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
      // Get the most recent energy reading for this meter
      const readings = await this.energyReadingsService.findAll({ meterId });
      if (!readings || readings.length === 0) {
        return null;
      }

      // Sort by timestamp and get the latest
      const latestReading = readings.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )[0];

      // Calculate net energy from power readings
      // Since EnergyReadings doesn't have export/import energy fields,
      // we'll use power and flow direction to estimate
      const powerKw = latestReading.powerKw || 0;
      const isExport = latestReading.flowDirection === 'EXPORT';
      const exportEnergyWh = isExport ? powerKw * 1000 : 0; // Convert kW to Wh
      const importEnergyWh = !isExport ? powerKw * 1000 : 0;

      return {
        exportEnergyWh,
        importEnergyWh,
        netEnergyWh: exportEnergyWh - importEnergyWh,
        periodStartTime: latestReading.timestamp.toISOString(),
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
      const meterProsumers =
        await this.smartMetersService.findProsumers(meterId);

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
    settlementId: string,
    txHash: string,
    success: boolean,
  ) {
    try {
      const status = success
        ? TransactionStatus.SUCCESS
        : TransactionStatus.FAILED;

      const settlement =
        await this.energySettlementsService.findOne(settlementId);

      await this.energySettlementsService.update(settlementId, {
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
        status: status.toString(),
        settlementTrigger: settlement.settlementTrigger,
        createdAtBackend:
          settlement.createdAtBackend instanceof Date
            ? settlement.createdAtBackend.toISOString()
            : settlement.createdAtBackend,
        confirmedAtOnChain: new Date().toISOString(),
      });

      // Log transaction completion
      await this.transactionLogsService.create({
        prosumerId: 'SYSTEM', // Use system as default prosumer ID
        transactionType: TransactionType.ENERGY_SETTLEMENT,
        amountPrimary: settlement.netKwhFromGrid,
        currencyPrimary: 'ETK',
        blockchainTxHash: txHash,
        transactionTimestamp: new Date().toISOString(),
        description: JSON.stringify({
          settlementId,
          meterId: settlement.meterId,
          netEnergyKwh: settlement.netKwhFromGrid,
        }),
      });

      this.logger.log(`Settlement ${settlementId} confirmed: ${status}`);
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
}
