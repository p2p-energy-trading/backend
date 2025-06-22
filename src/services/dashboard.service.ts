import { Injectable, Logger } from '@nestjs/common';
import { EnergyReadingsDetailedService } from '../graphql/EnergyReadingsDetailed/EnergyReadingsDetailed.service';
import { EnergySettlementsService } from '../graphql/EnergySettlements/EnergySettlements.service';
import { MarketTradesService } from '../graphql/MarketTrades/MarketTrades.service';
import { SmartMetersService } from '../graphql/SmartMeters/SmartMeters.service';
import { WalletsService } from '../graphql/Wallets/Wallets.service';
import { DeviceHeartbeatsService } from '../graphql/DeviceHeartbeats/DeviceHeartbeats.service';
import { DeviceStatusSnapshotsService } from '../graphql/DeviceStatusSnapshots/DeviceStatusSnapshots.service';
import { BlockchainService } from './blockchain.service';
import { EnergySettlementService } from './energy-settlement.service';

export interface DashboardStats {
  energyStats: {
    todayGeneration: number;
    todayConsumption: number;
    totalGeneration: number;
    totalConsumption: number;
    netEnergy: number;
    // Enhanced grid statistics
    todayGridExport: number;
    todayGridImport: number;
    totalGridExport: number;
    totalGridImport: number;
    netGridEnergy: number;
  };
  tradingStats: {
    totalTrades: number;
    totalVolume: number;
    averagePrice: number;
    last24hVolume: number;
    // Enhanced trading metrics
    totalEarnings: number;
    totalSpending: number;
    netProfit: number;
  };
  balances: {
    ETH: number;
    ETK: number;
    IDRS: number;
  };
  deviceStatus: {
    totalDevices: number;
    onlineDevices: number;
    lastHeartbeat: string | null;
    // Enhanced device metrics
    authorizedDevices: number;
    settlementsToday: number;
    averageUptime: number;
  };
  settlementStats: {
    totalSettlements: number;
    successfulSettlements: number;
    pendingSettlements: number;
    todaySettlements: number;
    lastSettlementTime: string | null;
    totalEtkMinted: number;
    totalEtkBurned: number;
  };
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private energyReadingsDetailedService: EnergyReadingsDetailedService,
    private energySettlementsService: EnergySettlementsService,
    private marketTradesService: MarketTradesService,
    private smartMetersService: SmartMetersService,
    private walletsService: WalletsService,
    private deviceHeartbeatsService: DeviceHeartbeatsService,
    private deviceStatusSnapshotsService: DeviceStatusSnapshotsService,
    private blockchainService: BlockchainService,
    private energySettlementService: EnergySettlementService,
  ) {}

  async getDashboardStats(prosumerId: string): Promise<DashboardStats> {
    try {
      // Get prosumer's devices and wallets
      const [devices, wallets] = await Promise.all([
        this.getProsumeDevices(prosumerId),
        this.walletsService.findAll({ prosumerId }),
      ]);

      // Parallel fetch all stats including settlement stats
      const [
        energyStats,
        tradingStats,
        balances,
        deviceStatus,
        settlementStats,
      ] = await Promise.all([
        this.getEnergyStats(devices.map((d) => d.meterId)),
        this.getTradingStats(wallets.map((w) => w.walletAddress)),
        this.getBalances(wallets[0]?.walletAddress),
        this.getDeviceStatus(devices.map((d) => d.meterId)),
        this.getSettlementStats(devices.map((d) => d.meterId)),
      ]);

      return {
        energyStats,
        tradingStats,
        balances,
        deviceStatus,
        settlementStats,
      };
    } catch (error) {
      this.logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  private async getProsumeDevices(prosumerId: string) {
    try {
      const devices = await this.smartMetersService.findAll({ prosumerId });
      return devices || [];
    } catch (error) {
      this.logger.warn(
        `Error fetching devices for prosumer ${prosumerId}:`,
        error,
      );
      return [];
    }
  }

  private async getEnergyStats(meterIds: string[]) {
    try {
      if (meterIds.length === 0) {
        return {
          todayGeneration: 0,
          todayConsumption: 0,
          totalGeneration: 0,
          totalConsumption: 0,
          netEnergy: 0,
          todayGridExport: 0,
          todayGridImport: 0,
          totalGridExport: 0,
          totalGridImport: 0,
          netGridEnergy: 0,
        };
      }

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let todayGeneration = 0;
      let todayConsumption = 0;
      let totalGeneration = 0;
      let totalConsumption = 0;
      let todayGridExport = 0;
      let todayGridImport = 0;
      let totalGridExport = 0;
      let totalGridImport = 0;

      // Aggregate stats from all meters using detailed readings
      for (const meterId of meterIds) {
        const readings = await this.energyReadingsDetailedService.findAll({
          meterId,
        });

        // Group readings by timestamp to get complete meter snapshots
        const readingsByTimestamp = new Map<string, any[]>();

        for (const reading of readings) {
          const timestampKey = new Date(reading.timestamp).toISOString();
          if (!readingsByTimestamp.has(timestampKey)) {
            readingsByTimestamp.set(timestampKey, []);
          }
          readingsByTimestamp.get(timestampKey)!.push(reading);
        }

        // Process each timestamp group
        for (const [timestampStr, timestampReadings] of readingsByTimestamp) {
          const readingDate = new Date(timestampStr);
          let solarEnergyWh = 0;
          let loadEnergyWh = 0;
          let gridExportWh = 0;
          let gridImportWh = 0;

          // Extract generation and consumption from subsystem readings
          // NOTE: For dashboard stats, we use SOLAR for generation and LOAD for consumption
          // Grid export/import are tracked separately for settlement analysis
          for (const reading of timestampReadings) {
            const dailyEnergy =
              Number(
                reading &&
                  typeof reading === 'object' &&
                  'dailyEnergyWh' in reading
                  ? (reading as { dailyEnergyWh: unknown }).dailyEnergyWh
                  : 0,
              ) || 0;

            const subsystem =
              reading &&
              typeof reading === 'object' &&
              'subsystem' in reading &&
              typeof (reading as { subsystem: unknown }).subsystem === 'string'
                ? (reading as { subsystem: string }).subsystem
                : null;

            switch (subsystem) {
              case 'SOLAR':
                // Solar panels generate energy
                solarEnergyWh += dailyEnergy;
                break;
              case 'LOAD':
                // Electrical loads consume energy
                loadEnergyWh += dailyEnergy;
                break;
              case 'GRID_EXPORT':
                // Energy exported to grid
                gridExportWh += dailyEnergy;
                break;
              case 'GRID_IMPORT':
                // Energy imported from grid
                gridImportWh += dailyEnergy;
                break;
              // BATTERY subsystem not included in generation/consumption stats
              // as it represents energy storage, not production/consumption
            }
          }

          // Convert Wh to kWh
          const solarEnergyKwh = solarEnergyWh / 1000;
          const loadEnergyKwh = loadEnergyWh / 1000;
          const gridExportKwh = gridExportWh / 1000;
          const gridImportKwh = gridImportWh / 1000;

          totalGeneration += solarEnergyKwh;
          totalConsumption += loadEnergyKwh;
          totalGridExport += gridExportKwh;
          totalGridImport += gridImportKwh;

          if (readingDate >= today && readingDate < tomorrow) {
            todayGeneration += solarEnergyKwh;
            todayConsumption += loadEnergyKwh;
            todayGridExport += gridExportKwh;
            todayGridImport += gridImportKwh;
          }
        }
      }

      return {
        todayGeneration,
        todayConsumption,
        totalGeneration,
        totalConsumption,
        netEnergy: totalGeneration - totalConsumption,
        todayGridExport,
        todayGridImport,
        totalGridExport,
        totalGridImport,
        netGridEnergy: totalGridExport - totalGridImport,
      };
    } catch (error) {
      this.logger.error('Error getting energy stats:', error);
      return {
        todayGeneration: 0,
        todayConsumption: 0,
        totalGeneration: 0,
        totalConsumption: 0,
        netEnergy: 0,
        todayGridExport: 0,
        todayGridImport: 0,
        totalGridExport: 0,
        totalGridImport: 0,
        netGridEnergy: 0,
      };
    }
  }

  private async getTradingStats(walletAddresses: string[]) {
    try {
      if (walletAddresses.length === 0) {
        return {
          totalTrades: 0,
          totalVolume: 0,
          averagePrice: 0,
          last24hVolume: 0,
          totalEarnings: 0,
          totalSpending: 0,
          netProfit: 0,
        };
      }

      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const allTrades: unknown[] = [];

      // Get trades for all wallets
      for (const walletAddress of walletAddresses) {
        const buyTrades = await this.marketTradesService.findAll({
          buyerWalletAddress: walletAddress,
        });
        const sellTrades = await this.marketTradesService.findAll({
          sellerWalletAddress: walletAddress,
        });
        allTrades.push(...buyTrades, ...sellTrades);
      }

      // Helper function to check if an object is a valid trade
      const isValidTrade = (
        trade: unknown,
      ): trade is {
        tradeId: unknown;
        tradedEtkAmount: unknown;
        priceIdrsPerEtk: unknown;
        tradeTimestamp: unknown;
        buyerWalletAddress: unknown;
        sellerWalletAddress: unknown;
      } => {
        return Boolean(
          trade &&
            typeof trade === 'object' &&
            'tradeId' in trade &&
            'tradedEtkAmount' in trade &&
            'priceIdrsPerEtk' in trade &&
            'tradeTimestamp' in trade &&
            'buyerWalletAddress' in trade &&
            'sellerWalletAddress' in trade,
        );
      };

      // Remove duplicates
      const uniqueTrades = allTrades
        .filter(
          (trade, index, self) =>
            isValidTrade(trade) &&
            index ===
              self.findIndex(
                (t: unknown) => isValidTrade(t) && t.tradeId === trade.tradeId,
              ),
        )
        .filter(isValidTrade);

      const totalTrades = uniqueTrades.length;
      const totalVolume = uniqueTrades.reduce((sum: number, trade) => {
        const tradedAmount = Number(trade.tradedEtkAmount) || 0;
        return sum + tradedAmount;
      }, 0);

      const averagePrice =
        totalTrades > 0
          ? uniqueTrades.reduce(
              (sum, trade) => sum + (Number(trade.priceIdrsPerEtk) || 0),
              0,
            ) / totalTrades
          : 0;

      const last24hTrades = uniqueTrades.filter(
        (trade) => new Date(String(trade.tradeTimestamp)) > last24Hours,
      );
      const last24hVolume = last24hTrades.reduce(
        (sum, trade) => sum + (Number(trade.tradedEtkAmount) || 0),
        0,
      );

      // Calculate earnings and spending based on trade roles
      let totalEarnings = 0;
      let totalSpending = 0;

      for (const trade of uniqueTrades) {
        const tradeValue =
          (Number(trade.tradedEtkAmount) || 0) *
          (Number(trade.priceIdrsPerEtk) || 0);

        // Check if this wallet was buyer or seller
        const isBuyer = walletAddresses.includes(
          String(trade.buyerWalletAddress),
        );
        const isSeller = walletAddresses.includes(
          String(trade.sellerWalletAddress),
        );

        if (isSeller) {
          // When selling ETK, we earn IDRS
          totalEarnings += tradeValue;
        }
        if (isBuyer) {
          // When buying ETK, we spend IDRS
          totalSpending += tradeValue;
        }
      }

      return {
        totalTrades,
        totalVolume,
        averagePrice,
        last24hVolume,
        totalEarnings,
        totalSpending,
        netProfit: totalEarnings - totalSpending,
      };
    } catch (error) {
      this.logger.error('Error getting trading stats:', error);
      return {
        totalTrades: 0,
        totalVolume: 0,
        averagePrice: 0,
        last24hVolume: 0,
        totalEarnings: 0,
        totalSpending: 0,
        netProfit: 0,
      };
    }
  }

  private async getBalances(walletAddress?: string) {
    if (!walletAddress) {
      return { ETH: 0, ETK: 0, IDRS: 0 };
    }

    try {
      const [ethBalance, etkBalance, idrsBalance] = await Promise.all([
        this.blockchainService.getEthBalance(walletAddress),
        this.blockchainService.getTokenBalance(
          walletAddress,
          process.env.CONTRACT_ETK_TOKEN ||
            '0x0000000000000000000000000000000000000000',
        ),
        this.blockchainService.getTokenBalance(
          walletAddress,
          process.env.CONTRACT_IDRS_TOKEN ||
            '0x0000000000000000000000000000000000000000',
        ),
      ]);

      return {
        ETH: ethBalance,
        ETK: etkBalance,
        IDRS: idrsBalance,
      };
    } catch (error) {
      this.logger.error('Error getting balances:', error);
      return { ETH: 0, ETK: 0, IDRS: 0 };
    }
  }

  private async getDeviceStatus(meterIds: string[]) {
    try {
      const totalDevices = meterIds.length;
      let onlineDevices = 0;
      let lastHeartbeat: string | null = null;
      let authorizedDevices = 0;
      let settlementsToday = 0;
      let totalUptime = 0;
      let deviceCount = 0;

      // Get today's date range for settlements count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (const meterId of meterIds) {
        try {
          // Get device info directly from SmartMeters
          const device = await this.smartMetersService.findOne(meterId);

          if (device.lastHeartbeatAt) {
            const heartbeatTime = new Date(device.lastHeartbeatAt);
            const now = new Date();
            const timeDiff = now.getTime() - heartbeatTime.getTime();

            // Consider device online if heartbeat is within 5 minutes
            if (timeDiff < 5 * 60 * 1000) {
              onlineDevices++;
            }

            if (!lastHeartbeat || heartbeatTime > new Date(lastHeartbeat)) {
              lastHeartbeat =
                device.lastHeartbeatAt instanceof Date
                  ? device.lastHeartbeatAt.toISOString()
                  : device.lastHeartbeatAt;
            }
          }

          // Check if meter is authorized on blockchain
          try {
            const isAuthorized =
              await this.blockchainService.isMeterIdAuthorized(meterId);
            if (isAuthorized) {
              authorizedDevices++;
            }
          } catch (authError) {
            this.logger.warn(
              `Error checking authorization for meter ${meterId}:`,
              authError,
            );
          }

          // Count today's settlements for this meter
          try {
            const settlements = await this.energySettlementsService.findAll({
              meterId,
            });
            const todaySettlements = settlements.filter((settlement: any) => {
              if (
                !settlement ||
                typeof settlement !== 'object' ||
                !('createdAtBackend' in settlement)
              ) {
                return false;
              }
              const createdAtBackend = (() => {
                if (
                  settlement &&
                  typeof settlement === 'object' &&
                  'createdAtBackend' in settlement
                ) {
                  const typedSettlement = settlement as {
                    createdAtBackend: unknown;
                  };
                  const value = typedSettlement.createdAtBackend;
                  if (value !== null && value !== undefined) {
                    return value;
                  }
                }
                return null;
              })();
              if (!createdAtBackend) {
                return false;
              }
              const settlementDate = new Date(
                createdAtBackend instanceof Date
                  ? createdAtBackend.getTime()
                  : typeof createdAtBackend === 'string'
                    ? createdAtBackend
                    : typeof createdAtBackend === 'number'
                      ? createdAtBackend
                      : new Date().getTime(),
              );
              return settlementDate >= today && settlementDate < tomorrow;
            });
            settlementsToday += todaySettlements.length;
          } catch (settlementError) {
            this.logger.warn(
              `Error getting settlements for meter ${meterId}:`,
              settlementError,
            );
          }

          // Calculate average uptime from recent heartbeats
          try {
            const recentHeartbeats = await this.deviceHeartbeatsService.findAll(
              {
                meterId,
              },
            );

            if (recentHeartbeats.length > 0) {
              // Calculate uptime based on latest heartbeat
              const latestHeartbeat = recentHeartbeats[0];
              if (
                latestHeartbeat &&
                typeof latestHeartbeat === 'object' &&
                'uptime' in latestHeartbeat &&
                latestHeartbeat.uptime
              ) {
                totalUptime += Number(latestHeartbeat.uptime) / 1000; // Convert ms to seconds
                deviceCount++;
              }
            }
          } catch (heartbeatError) {
            this.logger.warn(
              `Error getting heartbeats for meter ${meterId}:`,
              heartbeatError,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Error checking device status for ${meterId}:`,
            error,
          );
        }
      }

      const averageUptime = deviceCount > 0 ? totalUptime / deviceCount : 0;

      return {
        totalDevices,
        onlineDevices,
        lastHeartbeat,
        authorizedDevices,
        settlementsToday,
        averageUptime, // in seconds
      };
    } catch (error) {
      this.logger.error('Error getting device status:', error);
      return {
        totalDevices: meterIds.length,
        onlineDevices: 0,
        lastHeartbeat: null,
        authorizedDevices: 0,
        settlementsToday: 0,
        averageUptime: 0,
      };
    }
  }

  private async getSettlementStats(meterIds: string[]) {
    try {
      if (meterIds.length === 0) {
        return {
          totalSettlements: 0,
          successfulSettlements: 0,
          pendingSettlements: 0,
          todaySettlements: 0,
          lastSettlementTime: null,
          totalEtkMinted: 0,
          totalEtkBurned: 0,
        };
      }

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let totalSettlements = 0;
      let successfulSettlements = 0;
      let pendingSettlements = 0;
      let todaySettlements = 0;
      let lastSettlementTime: string | null = null;
      let totalEtkMinted = 0;
      let totalEtkBurned = 0;

      for (const meterId of meterIds) {
        try {
          const settlements = await this.energySettlementsService.findAll({
            meterId,
          });

          totalSettlements += settlements.length;

          for (const settlement of settlements) {
            // Type safety check for settlement object
            if (!settlement || typeof settlement !== 'object') continue;

            const createdAtBackend = (() => {
              if (
                settlement &&
                typeof settlement === 'object' &&
                'createdAtBackend' in settlement
              ) {
                const typedSettlement = settlement as {
                  createdAtBackend: unknown;
                };
                const value = typedSettlement.createdAtBackend;
                if (value !== null && value !== undefined) {
                  return value;
                }
              }
              return null;
            })();
            if (!createdAtBackend) continue;

            const settlementDate = new Date(
              createdAtBackend instanceof Date
                ? createdAtBackend.getTime()
                : typeof createdAtBackend === 'string'
                  ? createdAtBackend
                  : typeof createdAtBackend === 'number'
                    ? createdAtBackend
                    : new Date().getTime(),
            );
            const status = 'status' in settlement ? settlement.status : null;

            // Count settlements by status
            if (status === 'SUCCESS') {
              successfulSettlements++;
            } else if (status === 'PENDING') {
              pendingSettlements++;
            }

            // Count today's settlements
            if (settlementDate >= today && settlementDate < tomorrow) {
              todaySettlements++;
            }

            // Calculate ETK minted/burned based on net energy
            const netKwhFromGrid =
              'netKwhFromGrid' in settlement ? settlement.netKwhFromGrid : 0;
            const netKwh = Number(netKwhFromGrid) || 0;
            if (netKwh > 0) {
              // Positive = export to grid = ETK minted
              totalEtkMinted += Math.abs(netKwh);
            } else if (netKwh < 0) {
              // Negative = import from grid = ETK burned
              totalEtkBurned += Math.abs(netKwh);
            }

            // Track latest settlement time
            if (
              !lastSettlementTime ||
              settlementDate > new Date(lastSettlementTime)
            ) {
              lastSettlementTime =
                createdAtBackend instanceof Date
                  ? createdAtBackend.toISOString()
                  : typeof createdAtBackend === 'string'
                    ? createdAtBackend
                    : typeof createdAtBackend === 'number'
                      ? new Date(createdAtBackend).toISOString()
                      : new Date().toISOString();
            }
          }
        } catch (error) {
          this.logger.warn(
            `Error getting settlement stats for meter ${meterId}:`,
            error,
          );
        }
      }

      return {
        totalSettlements,
        successfulSettlements,
        pendingSettlements,
        todaySettlements,
        lastSettlementTime,
        totalEtkMinted,
        totalEtkBurned,
      };
    } catch (error) {
      this.logger.error('Error getting settlement stats:', error);
      return {
        totalSettlements: 0,
        successfulSettlements: 0,
        pendingSettlements: 0,
        todaySettlements: 0,
        lastSettlementTime: null,
        totalEtkMinted: 0,
        totalEtkBurned: 0,
      };
    }
  }

  async getEnergyChartData(prosumerId: string, days: number = 7) {
    try {
      const devices = await this.getProsumeDevices(prosumerId);
      const meterIds = devices.map((d) => d.meterId);

      if (meterIds.length === 0) {
        return [];
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const chartData: Array<{
        date: string;
        generation: number;
        consumption: number;
        net: number;
        gridExport?: number;
        gridImport?: number;
      }> = [];

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);

        let dayGeneration = 0;
        let dayConsumption = 0;
        let dayGridExport = 0;
        let dayGridImport = 0;

        for (const meterId of meterIds) {
          const readings = await this.energyReadingsDetailedService.findAll({
            meterId,
          });

          const dayReadings = readings.filter((reading) => {
            const readingDate = new Date(reading.timestamp);
            return readingDate >= dayStart && readingDate <= dayEnd;
          });

          // Group by timestamp and aggregate daily energy
          const readingsByTimestamp = new Map<string, any[]>();

          for (const reading of dayReadings) {
            const timestampKey = new Date(reading.timestamp).toISOString();
            if (!readingsByTimestamp.has(timestampKey)) {
              readingsByTimestamp.set(timestampKey, []);
            }
            readingsByTimestamp.get(timestampKey)!.push(reading);
          }

          let meterSolarEnergyWh = 0;
          let meterLoadEnergyWh = 0;
          let meterGridExportWh = 0;
          let meterGridImportWh = 0;

          // Process each timestamp group for this day
          for (const [, timestampReadings] of readingsByTimestamp) {
            for (const reading of timestampReadings) {
              const dailyEnergy =
                Number(
                  reading &&
                    typeof reading === 'object' &&
                    'dailyEnergyWh' in reading
                    ? (reading as { dailyEnergyWh: unknown }).dailyEnergyWh
                    : 0,
                ) || 0;
              const subsystem =
                reading &&
                typeof reading === 'object' &&
                'subsystem' in reading &&
                typeof (reading as { subsystem: unknown }).subsystem ===
                  'string'
                  ? (reading as { subsystem: string }).subsystem
                  : null;

              switch (subsystem) {
                case 'SOLAR':
                  meterSolarEnergyWh += dailyEnergy;
                  break;
                case 'LOAD':
                  meterLoadEnergyWh += dailyEnergy;
                  break;
                case 'GRID_EXPORT':
                  meterGridExportWh += dailyEnergy;
                  break;
                case 'GRID_IMPORT':
                  meterGridImportWh += dailyEnergy;
                  break;
              }
            }
          }

          dayGeneration += meterSolarEnergyWh / 1000; // Convert to kWh
          dayConsumption += meterLoadEnergyWh / 1000; // Convert to kWh
          dayGridExport += meterGridExportWh / 1000; // Convert to kWh
          dayGridImport += meterGridImportWh / 1000; // Convert to kWh
        }

        chartData.push({
          date: dayStart.toISOString().split('T')[0],
          generation: dayGeneration,
          consumption: dayConsumption,
          net: dayGeneration - dayConsumption,
          gridExport: dayGridExport,
          gridImport: dayGridImport,
        });
      }

      return chartData;
    } catch (error) {
      this.logger.error('Error getting energy chart data:', error);
      return [];
    }
  }

  // Enhanced method to get real-time energy and settlement data
  async getRealTimeEnergyData(prosumerId: string) {
    try {
      const devices = await this.getProsumeDevices(prosumerId);
      const meterIds = devices.map((d) => d.meterId);

      if (meterIds.length === 0) {
        return {
          currentGeneration: 0,
          currentConsumption: 0,
          currentGridExport: 0,
          currentGridImport: 0,
          netFlow: 0,
          batteryLevel: 0,
          lastUpdate: null,
        };
      }

      // Get the most recent readings for real-time data
      let currentGeneration = 0;
      let currentConsumption = 0;
      let currentGridExport = 0;
      let currentGridImport = 0;
      let batteryLevel = 0;
      let lastUpdate: string | null = null;

      for (const meterId of meterIds) {
        // Get latest readings from the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentReadings = await this.energyReadingsDetailedService.findAll(
          {
            meterId,
            timestamp: oneHourAgo.toISOString(), // This might need to be adjusted based on your service implementation
          },
        );

        // Get the most recent complete set of readings
        if (recentReadings.length > 0) {
          const latestTimestamp = Math.max(
            ...recentReadings.map((r: any) => {
              // Safely extract timestamp with type validation
              const timestamp =
                r && typeof r === 'object' && 'timestamp' in r
                  ? (r as { timestamp: unknown }).timestamp
                  : null;
              if (!timestamp) return 0;

              // Handle different timestamp formats
              if (timestamp instanceof Date) {
                return timestamp.getTime();
              } else if (typeof timestamp === 'string') {
                return new Date(timestamp).getTime();
              } else if (typeof timestamp === 'number') {
                return timestamp;
              } else {
                return 0;
              }
            }),
          );
          const latestReadings = recentReadings.filter((r: any) => {
            const timestamp =
              r && typeof r === 'object' && 'timestamp' in r
                ? (r as { timestamp: unknown }).timestamp
                : null;
            if (!timestamp) return false;

            let timestampValue: number;
            if (timestamp instanceof Date) {
              timestampValue = timestamp.getTime();
            } else if (typeof timestamp === 'string') {
              timestampValue = new Date(timestamp).getTime();
            } else if (typeof timestamp === 'number') {
              timestampValue = timestamp;
            } else {
              return false;
            }

            return timestampValue === latestTimestamp;
          });

          for (const reading of latestReadings) {
            const power =
              Number(
                reading && typeof reading === 'object' && 'power' in reading
                  ? reading.power
                  : 0,
              ) || 0; // Current power in watts
            const subsystem =
              reading && typeof reading === 'object' && 'subsystem' in reading
                ? reading.subsystem
                : null;

            switch (subsystem) {
              case 'SOLAR':
                currentGeneration += power;
                break;
              case 'LOAD':
                currentConsumption += power;
                break;
              case 'GRID_EXPORT':
                currentGridExport += power;
                break;
              case 'GRID_IMPORT':
                currentGridImport += power;
                break;
              case 'BATTERY':
                // For battery, we might want to show state of charge if available
                if (
                  reading &&
                  typeof reading === 'object' &&
                  'extraData' in reading &&
                  reading.extraData &&
                  typeof reading.extraData === 'object' &&
                  'soc' in reading.extraData
                ) {
                  batteryLevel = Number(reading.extraData.soc) || 0;
                }
                break;
            }
          }

          if (!lastUpdate || latestTimestamp > new Date(lastUpdate).getTime()) {
            lastUpdate = new Date(latestTimestamp).toISOString();
          }
        }
      }

      return {
        currentGeneration: currentGeneration / 1000, // Convert to kW
        currentConsumption: currentConsumption / 1000, // Convert to kW
        currentGridExport: currentGridExport / 1000, // Convert to kW
        currentGridImport: currentGridImport / 1000, // Convert to kW
        netFlow: (currentGeneration - currentConsumption) / 1000, // Convert to kW
        batteryLevel,
        lastUpdate,
      };
    } catch (error) {
      this.logger.error('Error getting real-time energy data:', error);
      return {
        currentGeneration: 0,
        currentConsumption: 0,
        currentGridExport: 0,
        currentGridImport: 0,
        netFlow: 0,
        batteryLevel: 0,
        lastUpdate: null,
      };
    }
  }

  // Enhanced method to get settlement recommendations
  async getSettlementRecommendations(prosumerId: string) {
    try {
      const devices = await this.getProsumeDevices(prosumerId);
      const recommendations: Array<{
        meterId: string;
        netEnergyWh: number;
        netEnergyKwh: number;
        operationType: string;
        estimatedEtkAmount: number;
        readyForSettlement: boolean;
        lastReadingTime?: string;
        reason?: string;
      }> = [];

      for (const device of devices) {
        const meterId = device.meterId;

        // Check if settlement is recommended
        try {
          // Get latest energy readings to calculate net energy
          const recentReadings =
            await this.energyReadingsDetailedService.findAll({
              meterId,
            });

          if (recentReadings.length > 0) {
            // Get the most recent timestamp
            const latestTimestamp = Math.max(
              ...recentReadings.map((r: any) => {
                const timestamp =
                  r && typeof r === 'object' && 'timestamp' in r
                    ? (r as { timestamp: unknown }).timestamp
                    : null;
                if (timestamp instanceof Date) return timestamp.getTime();
                if (typeof timestamp === 'string')
                  return new Date(timestamp).getTime();
                if (typeof timestamp === 'number') return timestamp;
                return 0;
              }),
            );

            const latestReadings = recentReadings.filter((r: any) => {
              const timestamp =
                r && typeof r === 'object' && 'timestamp' in r
                  ? (r as { timestamp: unknown }).timestamp
                  : null;
              let timestampValue: number;
              if (timestamp instanceof Date)
                timestampValue = timestamp.getTime();
              else if (typeof timestamp === 'string')
                timestampValue = new Date(timestamp).getTime();
              else if (typeof timestamp === 'number')
                timestampValue = timestamp;
              else return false;
              return timestampValue === latestTimestamp;
            });

            // Calculate net energy from settlement readings
            let exportWh = 0;
            let importWh = 0;

            for (const reading of latestReadings) {
              const settlementEnergy =
                Number(
                  reading &&
                    typeof reading === 'object' &&
                    'settlementEnergyWh' in reading
                    ? reading.settlementEnergyWh
                    : 0,
                ) || 0;
              const subsystem =
                reading && typeof reading === 'object' && 'subsystem' in reading
                  ? reading.subsystem
                  : null;

              if (subsystem === 'GRID_EXPORT') {
                exportWh += settlementEnergy;
              } else if (subsystem === 'GRID_IMPORT') {
                importWh += settlementEnergy;
              }
            }

            const netEnergyWh = exportWh - importWh;
            const absoluteNetEnergyWh = Math.abs(netEnergyWh);

            const minThreshold =
              await this.blockchainService.getMinSettlementWh();

            if (absoluteNetEnergyWh >= minThreshold) {
              const operationType = netEnergyWh >= 0 ? 'EXPORT' : 'IMPORT';
              const etkAmount =
                await this.blockchainService.calculateEtkAmount(
                  absoluteNetEnergyWh,
                );

              recommendations.push({
                meterId,
                netEnergyWh,
                netEnergyKwh: netEnergyWh / 1000,
                operationType,
                estimatedEtkAmount: etkAmount,
                readyForSettlement: true,
                lastReadingTime: new Date(latestTimestamp).toISOString(),
              });
            } else {
              recommendations.push({
                meterId,
                netEnergyWh,
                netEnergyKwh: netEnergyWh / 1000,
                operationType: netEnergyWh >= 0 ? 'EXPORT' : 'IMPORT',
                estimatedEtkAmount: 0,
                readyForSettlement: false,
                reason: `Below minimum threshold (${minThreshold} Wh)`,
                lastReadingTime: new Date(latestTimestamp).toISOString(),
              });
            }
          } else {
            recommendations.push({
              meterId,
              netEnergyWh: 0,
              netEnergyKwh: 0,
              operationType: 'NONE',
              estimatedEtkAmount: 0,
              readyForSettlement: false,
              reason: 'No energy readings available',
            });
          }
        } catch (error) {
          this.logger.warn(
            `Error getting settlement recommendation for meter ${meterId}:`,
            error,
          );
          recommendations.push({
            meterId,
            netEnergyWh: 0,
            netEnergyKwh: 0,
            operationType: 'ERROR',
            estimatedEtkAmount: 0,
            readyForSettlement: false,
            reason: 'Error fetching data',
          });
        }
      }

      return recommendations;
    } catch (error) {
      this.logger.error('Error getting settlement recommendations:', error);
      return [];
    }
  }

  // Enhanced method to get blockchain synchronization status
  async getBlockchainSyncStatus(prosumerId: string) {
    try {
      const devices = await this.getProsumeDevices(prosumerId);
      const wallets = await this.walletsService.findAll({ prosumerId });

      if (wallets.length === 0) {
        return {
          walletConnected: false,
          devicesAuthorized: 0,
          totalDevices: devices.length,
          pendingTransactions: 0,
          lastBlockchainActivity: null,
        };
      }

      const walletAddress = wallets[0].walletAddress;
      let devicesAuthorized = 0;
      let pendingTransactions = 0;
      let lastBlockchainActivity: string | null = null;

      // Check device authorization status
      for (const device of devices) {
        try {
          const isAuthorized = await this.blockchainService.isMeterIdAuthorized(
            device.meterId,
          );
          if (isAuthorized) {
            devicesAuthorized++;
          }
        } catch (error) {
          this.logger.warn(
            `Error checking authorization for ${device.meterId}:`,
            error,
          );
        }
      }

      // Check pending settlements
      for (const device of devices) {
        try {
          const settlements = await this.energySettlementsService.findAll({
            meterId: device.meterId,
          });

          const pending = settlements.filter(
            (s: any) =>
              s &&
              typeof s === 'object' &&
              'status' in s &&
              (s as { status: unknown }).status === 'PENDING',
          );
          pendingTransactions += pending.length;

          // Find latest blockchain activity
          for (const settlement of settlements) {
            if (settlement.confirmedAtOnChain) {
              const activityTime = new Date(settlement.confirmedAtOnChain);
              if (
                !lastBlockchainActivity ||
                activityTime > new Date(lastBlockchainActivity)
              ) {
                lastBlockchainActivity =
                  settlement.confirmedAtOnChain instanceof Date
                    ? settlement.confirmedAtOnChain.toISOString()
                    : settlement.confirmedAtOnChain;
              }
            }
          }
        } catch (error) {
          this.logger.warn(
            `Error checking pending transactions for ${device.meterId}:`,
            error,
          );
        }
      }

      return {
        walletConnected: true,
        walletAddress,
        devicesAuthorized,
        totalDevices: devices.length,
        pendingTransactions,
        lastBlockchainActivity,
        authorizationRate:
          devices.length > 0 ? (devicesAuthorized / devices.length) * 100 : 0,
      };
    } catch (error) {
      this.logger.error('Error getting blockchain sync status:', error);
      return {
        walletConnected: false,
        devicesAuthorized: 0,
        totalDevices: 0,
        pendingTransactions: 0,
        lastBlockchainActivity: null,
        authorizationRate: 0,
      };
    }
  }
}
