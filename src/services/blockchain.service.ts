import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { WalletsService } from '../models/Wallets/Wallets.service';
import { TransactionLogsService } from '../models/TransactionLogs/TransactionLogs.service';
import { TradeOrdersCacheRedisService } from './trade-orders-cache-redis.service';
import { MarketTradesService } from '../models/MarketTrades/MarketTrades.service';
// Removed: BlockchainApprovalsService (not used)
import { CryptoService } from '../common/crypto.service';
import { TransactionType, OrderType } from '../common/enums';
import { BlockchainConfig } from '../common/interfaces';
import { EnergySettlementService } from './energy-settlement.service';
import { ProsumersService } from 'src/models/Prosumers/Prosumers.service';
import { TradingMarketService } from './trading-market.service';

// Import ABIs from JSON files for cleaner implementation
import EnergyConverterABI from '../ABI/EnergyConverter.json';
import MarketABI from '../ABI/Market.json';
import ETKABI from '../ABI/ETK_ERC20.json';
import IDRSABI from '../ABI/IDRS_ERC20.json';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private config: BlockchainConfig;

  // Contract ABIs imported from JSON files
  private readonly energyConverterABI = EnergyConverterABI;
  private readonly marketABI = MarketABI;
  private readonly etkTokenABI = ETKABI;
  private readonly idrsTokenABI = IDRSABI;
  private readonly tokenABI = ETKABI; // Generic ERC-20 ABI for dynamic token operations

  constructor(
    private configService: ConfigService,
    private walletsService: WalletsService,
    private transactionLogsService: TransactionLogsService,
    private tradeOrdersCacheService: TradeOrdersCacheRedisService,
    private marketTradesService: MarketTradesService,
    // Removed: blockchainApprovalsService (not used)
    private cryptoService: CryptoService,
    @Inject(forwardRef(() => EnergySettlementService))
    private energySettlementService: EnergySettlementService,
    private prosumerService: ProsumersService,
    private tradingMarketService: TradingMarketService,
  ) {
    this.initializeProvider();
  }

  private initializeProvider() {
    this.config = {
      rpcUrl:
        this.configService.get('BLOCKCHAIN_RPC_URL') || 'http://localhost:8545',
      chainId: parseInt(this.configService.get('BLOCKCHAIN_CHAIN_ID') || '10'),
      networkName: this.configService.get('BLOCKCHAIN_NETWORK_NAME') || 'Local',
      contracts: {
        energyConverter:
          this.configService.get('CONTRACT_ENERGY_CONVERTER') ||
          '0x0000000000000000000000000000000000000000',
        market:
          this.configService.get('CONTRACT_MARKET') ||
          '0x0000000000000000000000000000000000000000',
        etkToken:
          this.configService.get('CONTRACT_ETK_TOKEN') ||
          '0x0000000000000000000000000000000000000000',
        idrsToken:
          this.configService.get('CONTRACT_IDRS_TOKEN') ||
          '0x0000000000000000000000000000000000000000',
      },
    };

    // this.logger.debug(this.config);

    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);

    // Initialize TradingMarketService with provider, config, and helper functions
    this.tradingMarketService.initialize(
      this.provider,
      this.config,
      this.getWalletSigner.bind(this),
      this.getProsumerIdByWallet.bind(this),
    );

    this.setupEventListeners();
  }

  public getCalculateEtkAmount(energyWh: number): Promise<number> {
    return new Promise((resolve, reject) => {
      // Validate input
      if (!isFinite(energyWh) || isNaN(energyWh)) {
        this.logger.error(
          `Invalid energyWh value: ${energyWh} (type: ${typeof energyWh})`,
        );
        reject(new Error(`Invalid energy value: ${energyWh}`));
        return;
      }

      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );

      // Convert to integer by rounding to avoid floating point precision issues
      // Use absolute value because calculateEtkAmount expects uint256 (unsigned integer)
      const energyWhInteger = Math.round(Math.abs(energyWh));

      contract
        .calculateEtkAmount(energyWhInteger)
        .then((result: bigint) => {
          // Convert from contract units (2 decimals) to ETK
          // Preserve the original sign
          const etkAmount = Number(result) / 100;
          resolve(energyWh < 0 ? -etkAmount : etkAmount);
        })
        .catch((error) => {
          this.logger.error('Error calculating ETK amount:', error);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }

  private getSettlementIdDbByTxHash() {
    return async (txHash: string): Promise<number | null> => {
      try {
        const settlementId =
          await this.energySettlementService.getSettlementIdDbByTxHash(txHash);
        return settlementId || null;
      } catch (error) {
        this.logger.error(
          `Error fetching settlement ID for txHash ${txHash}:`,
          error,
        );
        return null;
      }
    };
  }

  private getMeterIdDbByTxHash() {
    return async (txHash: string): Promise<string | null> => {
      try {
        const meterId =
          await this.energySettlementService.getMeterIdByTxHash(txHash);
        return meterId || null;
      } catch (error) {
        this.logger.error(
          `Error fetching meter ID for txHash ${txHash}:`,
          error,
        );
        return null;
      }
    };
  }

  /**
   * Helper function to safely convert blockchain timestamp to Date object
   * @param timestamp - Blockchain timestamp (bigint) in seconds
   * @returns Valid Date object or current time as fallback
   */
  private safeTimestampToDate(timestamp: bigint): Date {
    const timestampMs = Number(timestamp) * 1000;

    if (
      isNaN(timestampMs) ||
      timestampMs < 0 ||
      timestampMs > 8640000000000000
    ) {
      // Invalid timestamp - use current time as fallback
      this.logger.warn(
        `Invalid timestamp received: ${timestamp}, using current time as fallback`,
      );
      return new Date();
    }

    const date = new Date(timestampMs);

    // Additional validation - check if the Date object is valid
    if (isNaN(date.getTime())) {
      this.logger.warn(
        `Invalid date created from timestamp: ${timestamp}, using current time as fallback`,
      );
      return new Date();
    }

    return date;
  }

  private setupEventListeners() {
    try {
      // Listen to market events
      const marketContract = new ethers.Contract(
        this.config.contracts.market,
        this.marketABI,
        this.provider,
      );

      marketContract
        .on(
          'OrderPlaced',
          (
            id: bigint,
            user: string,
            amount: bigint,
            price: bigint,
            isBuy: boolean,
            timestamp: bigint,
            event: ethers.Log,
          ) => {
            void this.handleOrderPlaced(
              id,
              user,
              amount,
              price,
              isBuy,
              timestamp,
              event,
            );
          },
        )
        .catch((error) => {
          this.logger.error('Error in OrderPlaced event handler:', error);
        });

      marketContract
        .on(
          'TransactionCompleted',
          (
            buyer: string,
            seller: string,
            amount: bigint,
            price: bigint,
            timestamp: bigint,
            buyOrderId: bigint,
            sellOrderId: bigint,
            event: ethers.Log,
          ) => {
            void this.handleTransactionCompleted(
              buyer,
              seller,
              amount,
              price,
              timestamp,
              buyOrderId,
              sellOrderId,
              event,
            );
          },
        )
        .catch((error) => {
          this.logger.error(
            'Error in TransactionCompleted event handler:',
            error,
          );
        });

      marketContract
        .on(
          'OrderCancelled',
          (
            user: string,
            amount: bigint,
            price: bigint,
            isBuy: boolean,
            timestamp: bigint,
            orderId: bigint,
            event: ethers.Log,
          ) => {
            void this.handleOrderCancelled(
              user,
              amount,
              price,
              isBuy,
              timestamp,
              orderId,
              event,
            );
          },
        )
        .catch((error) => {
          this.logger.error('Error in OrderCancelled event handler:', error);
        });

      // Listen to EnergyConverter events
      const energyConverterContract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );

      energyConverterContract
        .on(
          'SettlementProcessed',
          (
            settlementId: string,
            meterId: string,
            prosumerAddress: string,
            netEnergyWh: bigint,
            etkAmount: bigint,
            timestamp: bigint,
            event: ethers.Log,
          ) => {
            void this.handleSettlementProcessed(
              settlementId,
              meterId,
              prosumerAddress,
              netEnergyWh,
              etkAmount,
              timestamp,
              event,
            );
          },
        )
        .catch((error) => {
          this.logger.error(
            'Error in SettlementProcessed event handler:',
            error,
          );
        });

      // energyConverterContract
      //   .on(
      //     'MeterAuthorized',
      //     (
      //       meterId: string,
      //       meterAddress: string,
      //       authorizedBy: string,
      //       event: ethers.Log,
      //     ) => {
      //       void this.handleMeterAuthorized(
      //         meterId,
      //         meterAddress,
      //         authorizedBy,
      //         event,
      //       );
      //     },
      //   )
      //   .catch((error) => {
      //     this.logger.error('Error in MeterAuthorized event handler:', error);
      //   });

      // energyConverterContract
      //   .on(
      //     'MeterDeauthorized',
      //     (
      //       meterId: string,
      //       meterAddress: string,
      //       deauthorizedBy: string,
      //       event: ethers.Log,
      //     ) => {
      //       void this.handleMeterDeauthorized(
      //         meterId,
      //         meterAddress,
      //         deauthorizedBy,
      //         event,
      //       );
      //     },
      //   )
      //   .catch((error) => {
      //     this.logger.error('Error in MeterDeauthorized event handler:', error);
      //   });

      this.logger.log('Blockchain event listeners setup complete');
    } catch (error) {
      this.logger.error('Error setting up event listeners:', error);
    }
  }

  async processEnergySettlement(
    walletAddress: string,
    meterId: string,
    prosumerAddress: string,
    netEnergyWh: number,
    settlementId: string,
    // originalSettlementId?: number,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(walletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        wallet,
      );

      // Convert settlement ID to bytes32
      const settlementIdBytes32 = ethers.keccak256(
        ethers.toUtf8Bytes(settlementId),
      );

      const tx = (await contract.processSettlement(
        meterId,
        prosumerAddress,
        ethers.toBigInt(netEnergyWh),
        settlementIdBytes32,
      )) as ethers.ContractTransactionResponse;

      // // Log transaction
      // await this.transactionLogsService.create({
      //   prosumerId:
      //     (await this.getProsumerIdByWallet(prosumerAddress)) || 'UNKNOWN',
      //   transactionType:
      //     netEnergyWh > 0
      //       ? TransactionType.TOKEN_MINT
      //       : TransactionType.TOKEN_BURN,
      //   description: JSON.stringify({
      //     meterId,
      //     prosumerAddress,
      //     netEnergyWh,
      //     settlementId,
      //     txHash: tx.hash,
      //     action: `Energy settlement processing - ${netEnergyWh > 0 ? 'Export (Mint)' : 'Import (Burn)'}`,
      //   }),
      //   amountPrimary: Math.abs(netEnergyWh / 1000), // Convert Wh to kWh
      //   currencyPrimary: 'ETK',
      //   blockchainTxHash: tx.hash,
      //   transactionTimestamp: new Date().toISOString(),
      //   relatedSettlementId: originalSettlementId,
      // });

      this.logger.log(
        `Settlement processing transaction sent: ${tx.hash} for meter ${meterId}`,
      );
      return tx.hash;
    } catch (error) {
      this.logger.error('Error processing energy settlement');
      throw error;
    }
  }

  async authorizeMeter(
    ownerWalletAddress: string,
    meterId: string,
    meterAddress: string,
  ): Promise<string> {
    try {
      const wallet = this.getOwnerWalletSigner();
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        wallet,
      );

      const tx = (await contract.authorizeMeter(
        meterId,
        meterAddress,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(ownerWalletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.CONTRACT_INTERACTION,
        description: JSON.stringify({
          meterId,
          meterAddress,
          txHash: tx.hash,
          action: 'Authorize smart meter for energy settlements',
        }),
        amountPrimary: 0,
        currencyPrimary: 'ETK',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Meter authorization transaction sent: ${tx.hash} for meter ${meterId}`,
      );
      return tx.hash;
    } catch (error) {
      this.logger.error('Error authorizing meter:', error);
      throw error;
    }
  }

  async deauthorizeMeter(
    ownerWalletAddress: string,
    meterId: string,
    meterAddress: string,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(ownerWalletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        wallet,
      );

      const tx = (await contract.deauthorizeMeter(
        meterId,
        meterAddress,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(ownerWalletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.CONTRACT_INTERACTION,
        description: JSON.stringify({
          meterId,
          meterAddress,
          txHash: tx.hash,
          action: 'Deauthorize smart meter from energy settlements',
        }),
        amountPrimary: 0,
        currencyPrimary: 'ETK',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Meter deauthorization transaction sent: ${tx.hash} for meter ${meterId}`,
      );
      return tx.hash;
    } catch (error) {
      this.logger.error('Error deauthorizing meter:', error);
      throw error;
    }
  }

  async updateConversionRatio(
    ownerWalletAddress: string,
    newRatio: number,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(ownerWalletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        wallet,
      );

      const tx = (await contract.updateConversionRatio(
        newRatio,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(ownerWalletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.CONTRACT_INTERACTION,
        description: JSON.stringify({
          newRatio,
          txHash: tx.hash,
          action: 'Update energy to ETK conversion ratio',
        }),
        amountPrimary: newRatio,
        currencyPrimary: 'ETK',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(`Conversion ratio update transaction sent: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      this.logger.error('Error updating conversion ratio:', error);
      throw error;
    }
  }

  async updateMinSettlement(
    ownerWalletAddress: string,
    newMinWh: number,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(ownerWalletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        wallet,
      );

      const tx = (await contract.updateMinSettlement(
        newMinWh,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(ownerWalletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.CONTRACT_INTERACTION,
        description: JSON.stringify({
          newMinWh,
          txHash: tx.hash,
          action: 'Update minimum settlement threshold',
        }),
        amountPrimary: newMinWh,
        currencyPrimary: 'Wh',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(`Minimum settlement update transaction sent: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      this.logger.error('Error updating minimum settlement:', error);
      throw error;
    }
  }

  async calculateEtkAmount(energyWh: number): Promise<number> {
    try {
      // Validate input
      if (!isFinite(energyWh) || isNaN(energyWh)) {
        this.logger.error(
          `Invalid energyWh value in calculateEtkAmount: ${energyWh} (type: ${typeof energyWh})`,
        );
        return 0;
      }

      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );

      // Use absolute value because calculateEtkAmount expects uint256 (unsigned integer)
      const energyWhInteger = Math.round(Math.abs(energyWh));

      // Additional check after rounding
      if (!isFinite(energyWhInteger) || isNaN(energyWhInteger)) {
        this.logger.error(
          `Invalid energyWhInteger after rounding: ${energyWhInteger}`,
        );
        return 0;
      }

      const etkAmount = (await contract.calculateEtkAmount(
        energyWhInteger,
      )) as bigint;

      // Convert from contract units (2 decimals) to ETK
      // Preserve the original sign
      const etkValue = Number(etkAmount) / 100;
      return energyWh < 0 ? -etkValue : etkValue;
    } catch (error) {
      this.logger.error('Error calculating ETK amount:', error);
      return 0;
    }
  }

  async calculateEnergyWh(etkAmount: number): Promise<number> {
    try {
      // Validate input
      if (!isFinite(etkAmount) || isNaN(etkAmount)) {
        this.logger.error(
          `Invalid etkAmount value: ${etkAmount} (type: ${typeof etkAmount})`,
        );
        return 0;
      }

      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );

      // Convert ETK to contract units (2 decimals)
      const etkAmountUnits = Math.floor(etkAmount * 100);

      // Additional check after conversion
      if (!isFinite(etkAmountUnits) || isNaN(etkAmountUnits)) {
        this.logger.error(
          `Invalid etkAmountUnits after conversion: ${etkAmountUnits}`,
        );
        return 0;
      }

      const energyWh = (await contract.calculateEnergyWh(
        etkAmountUnits,
      )) as bigint;
      return Number(energyWh);
    } catch (error) {
      this.logger.error('Error calculating energy Wh:', error);
      return 0;
    }
  }

  async getSettlement(settlementId: string): Promise<{
    meterId: string;
    prosumerAddress: string;
    netEnergyWh: number;
    etkAmount: number;
    timestamp: number;
    processed: boolean;
  } | null> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );

      const settlementIdBytes32 = ethers.keccak256(
        ethers.toUtf8Bytes(settlementId),
      );
      const settlement = (await contract.getSettlement(
        settlementIdBytes32,
      )) as [string, string, bigint, bigint, bigint, boolean];

      return {
        meterId: settlement[0],
        prosumerAddress: settlement[1],
        netEnergyWh: Number(settlement[2]),
        etkAmount: Number(settlement[3]) / 100, // Convert from contract units
        timestamp: Number(settlement[4]),
        processed: settlement[5],
      };
    } catch (error) {
      this.logger.error('Error getting settlement:', error);
      return null;
    }
  }

  async getSettlementCount(): Promise<number> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );
      const count = (await contract.getSettlementCount()) as bigint;
      return Number(count);
    } catch (error) {
      this.logger.error('Error getting settlement count:', error);
      return 0;
    }
  }

  async isMeterAuthorized(meterAddress: string): Promise<boolean> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );
      return (await contract.isMeterAuthorized(meterAddress)) as boolean;
    } catch (error) {
      this.logger.error('Error checking meter authorization:', error);
      return false;
    }
  }

  async isMeterIdAuthorized(meterId: string): Promise<boolean> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );
      return (await contract.isMeterIdAuthorized(meterId)) as boolean;
    } catch (error) {
      this.logger.error('Error checking meter ID authorization:', error);
      return false;
    }
  }

  async getConversionRatio(): Promise<number> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );
      const ratio = (await contract.conversionRatio()) as bigint;
      return Number(ratio);
    } catch (error) {
      this.logger.error('Error getting conversion ratio:', error);
      return 100; // Default ratio
    }
  }

  async getMinSettlementWh(): Promise<number> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );
      const minWh = (await contract.minSettlementWh()) as bigint;
      return Number(minWh);
    } catch (error) {
      this.logger.error('Error getting minimum settlement Wh:', error);
      return 100; // Default minimum
    }
  }

  async convertEnergyToTokens(
    walletAddress: string,
    energyKwh: number,
  ): Promise<string> {
    try {
      const energyWh = energyKwh * 1000; // Convert kWh to Wh
      const settlementId = `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return await this.processEnergySettlement(
        walletAddress,
        'LEGACY_METER',
        walletAddress,
        energyWh,
        settlementId,
      );
    } catch (error) {
      this.logger.error('Error in legacy energy conversion:', error);
      throw error;
    }
  }

  async burnTokensForEnergy(
    walletAddress: string,
    tokenAmount: number,
  ): Promise<string> {
    try {
      const energyWh = await this.calculateEnergyWh(tokenAmount);
      const settlementId = `legacy_burn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return await this.processEnergySettlement(
        walletAddress,
        'LEGACY_METER',
        walletAddress,
        -energyWh, // Negative for import/burn
        settlementId,
      );
    } catch (error) {
      this.logger.error('Error in legacy token burning:', error);
      throw error;
    }
  }

  async mintETKTokens(walletAddress: string, amount: number): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(walletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.etkToken,
        this.etkTokenABI,
        wallet,
      );

      // Convert to ETK units (2 decimals: 1 ETK = 100 units)
      const tokenAmount = Math.floor(amount * 100);

      const tx = (await contract.mint(
        tokenAmount,
      )) as ethers.ContractTransactionResponse;

      // // Log transaction
      // await this.transactionLogsService.create({
      //   prosumerId:
      //     (await this.getProsumerIdByWallet(walletAddress)) || 'UNKNOWN',
      //   transactionType: TransactionType.TOKEN_MINT,
      //   description: JSON.stringify({
      //     amount,
      //     tokenAmount,
      //     txHash: tx.hash,
      //     walletAddress,
      //     action: 'ETK token mint',
      //   }),
      //   amountPrimary: amount,
      //   currencyPrimary: 'ETK',
      //   blockchainTxHash: tx.hash,
      //   transactionTimestamp: new Date().toISOString(),
      // });

      this.logger.log(`ETK mint transaction sent: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      this.logger.error('Error minting ETK tokens:', error);
      throw error;
    }
  }

  async burnETKTokens(walletAddress: string, amount: number): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(walletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.etkToken,
        this.etkTokenABI,
        wallet,
      );

      // Convert to ETK units (2 decimals: 1 ETK = 100 units)
      const tokenAmount = Math.floor(amount * 100);

      const tx = (await contract.burn(
        tokenAmount,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      // await this.transactionLogsService.create({
      //   prosumerId:
      //     (await this.getProsumerIdByWallet(walletAddress)) || 'UNKNOWN',
      //   transactionType: TransactionType.TOKEN_BURN,
      //   description: JSON.stringify({
      //     amount,
      //     tokenAmount,
      //     txHash: tx.hash,
      //     walletAddress,
      //     action: 'ETK token burn',
      //   }),
      //   amountPrimary: amount,
      //   currencyPrimary: 'ETK',
      //   blockchainTxHash: tx.hash,
      //   transactionTimestamp: new Date().toISOString(),
      // });

      this.logger.log(`ETK burn transaction sent: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      this.logger.error('Error burning ETK tokens:', error);
      throw error;
    }
  }

  async whiteListMarket(
    ownerWalletAddress: string,
    marketAddress: string,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(ownerWalletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.etkToken,
        this.tokenABI,
        wallet,
      );

      const tx = (await contract.whiteListMarket(
        marketAddress,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(ownerWalletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.CONTRACT_INTERACTION,
        description: JSON.stringify({
          marketAddress,
          txHash: tx.hash,
          action: 'Whitelist market contract',
        }),
        amountPrimary: 0,
        currencyPrimary: 'ETK',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(`Market whitelist transaction sent: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      this.logger.error('Error whitelisting market:', error);
      throw error;
    }
  }

  async mintIDRSTokens(walletAddress: string, amount: number): Promise<string> {
    try {
      // const wallet = await this.getWalletSigner(walletAddress);
      const ownerWallet = await this.getOwnerWalletSigner();

      const contract = new ethers.Contract(
        this.config.contracts.idrsToken,
        this.idrsTokenABI,
        ownerWallet,
      );

      // Convert to IDRS units (2 decimals: 1 IDRS = 100 units)
      const tokenAmount = Math.floor(amount * 100);

      const tx1 = (await contract.mint(
        tokenAmount,
      )) as ethers.ContractTransactionResponse;

      const tx2 = (await contract.transfer(
        walletAddress,
        tokenAmount,
      )) as ethers.ContractTransactionResponse;

      // // Log transaction
      // await this.transactionLogsService.create({
      //   prosumerId:
      //     (await this.getProsumerIdByWallet(walletAddress)) || 'UNKNOWN',
      //   transactionType: TransactionType.TOKEN_MINT,
      //   description: JSON.stringify({
      //     amount,
      //     tokenAmount,
      //     txHash: tx.hash,
      //     walletAddress,
      //     action: 'IDRS token mint',
      //   }),
      //   amountPrimary: amount,
      //   currencyPrimary: 'IDRS',
      //   blockchainTxHash: tx.hash,
      //   transactionTimestamp: new Date().toISOString(),
      // });

      this.logger.log(`IDRS mint transaction sent: ${tx2.hash}`);
      return tx2.hash;
    } catch (error) {
      this.logger.error('Error minting IDRS tokens:', error);
      throw error;
    }
  }

  async burnIDRSTokens(walletAddress: string, amount: number): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(walletAddress);
      const ownerWallet = await this.getOwnerWalletSigner();
      const contract = new ethers.Contract(
        this.config.contracts.idrsToken,
        this.idrsTokenABI,
        wallet,
      );

      // Convert to IDRS units (2 decimals: 1 IDRS = 100 units)
      const tokenAmount = Math.floor(amount * 100);

      const tx1 = (await contract.transfer(
        ownerWallet.address,
        tokenAmount,
      )) as ethers.ContractTransactionResponse;

      const contract2 = new ethers.Contract(
        this.config.contracts.idrsToken,
        this.idrsTokenABI,
        ownerWallet,
      );

      const tx2 = (await contract2.burn(
        tokenAmount,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      // await this.transactionLogsService.create({
      //   prosumerId:
      //     (await this.getProsumerIdByWallet(walletAddress)) || 'UNKNOWN',
      //   transactionType: TransactionType.TOKEN_BURN,
      //   description: JSON.stringify({
      //     amount,
      //     tokenAmount,
      //     txHash: tx.hash,
      //     walletAddress,
      //     action: 'IDRS token burn',
      //   }),
      //   amountPrimary: amount,
      //   currencyPrimary: 'IDRS',
      //   blockchainTxHash: tx.hash,
      //   transactionTimestamp: new Date().toISOString(),
      // });

      this.logger.log(`IDRS burn transaction sent: ${tx1.hash}`);
      return tx1.hash;
    } catch (error) {
      this.logger.error('Error burning IDRS tokens:', error);
      throw error;
    }
  }

  async whiteListMarketIDRS(
    ownerWalletAddress: string,
    marketAddress: string,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(ownerWalletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.idrsToken,
        this.tokenABI,
        wallet,
      );

      const tx = (await contract.whiteListMarket(
        marketAddress,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(ownerWalletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.CONTRACT_INTERACTION,
        description: JSON.stringify({
          marketAddress,
          txHash: tx.hash,
          action: 'Whitelist market contract for IDRS',
        }),
        amountPrimary: 0,
        currencyPrimary: 'IDRS',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(`IDRS market whitelist transaction sent: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      this.logger.error('Error whitelisting market for IDRS:', error);
      throw error;
    }
  }

  async getETKTotalSupply(): Promise<number> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.etkToken,
        this.etkTokenABI,
        this.provider,
      );
      const totalSupply = (await contract.totalSupply()) as bigint;
      // Convert from contract units (2 decimals) to ETK
      return Number(totalSupply) / 100;
    } catch (error) {
      this.logger.error('Error getting ETK total supply:', error);
      return 0;
    }
  }

  async getETKDecimals(): Promise<number> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.etkToken,
        this.etkTokenABI,
        this.provider,
      );
      const decimals = (await contract.decimals()) as bigint;
      return Number(decimals);
    } catch (error) {
      this.logger.error('Error getting ETK decimals:', error);
      return 2; // Default to 2 decimals
    }
  }

  async getIDRSTotalSupply(): Promise<number> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.idrsToken,
        this.idrsTokenABI,
        this.provider,
      );
      const totalSupply = (await contract.totalSupply()) as bigint;
      // Convert from contract units (2 decimals) to IDRS
      return Number(totalSupply) / 100;
    } catch (error) {
      this.logger.error('Error getting IDRS total supply:', error);
      return 0;
    }
  }

  async getIDRSDecimals(): Promise<number> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.idrsToken,
        this.idrsTokenABI,
        this.provider,
      );
      const decimals = (await contract.decimals()) as bigint;
      return Number(decimals);
    } catch (error) {
      this.logger.error('Error getting IDRS decimals:', error);
      return 2; // Default to 2 decimals
    }
  }

  async getTokenBalance(
    walletAddress: string,
    tokenContract: string,
  ): Promise<number> {
    try {
      const contract = new ethers.Contract(
        tokenContract,
        this.tokenABI,
        this.provider,
      );
      const balance = (await contract.balanceOf(walletAddress)) as bigint;

      // Both ETK and IDRS use 2 decimals
      if (
        tokenContract.toLowerCase() ===
          this.config.contracts.etkToken.toLowerCase() ||
        tokenContract.toLowerCase() ===
          this.config.contracts.idrsToken.toLowerCase()
      ) {
        return Number(balance) / 100; // Convert from contract units to token
      }

      // For other tokens, assume 18 decimals
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      this.logger.error('Error getting token balance:', error);
      return 0;
    }
  }

  async getEthBalance(walletAddress: string): Promise<number> {
    try {
      const balance = await this.provider.getBalance(walletAddress);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      this.logger.error('Error getting ETH balance:', error);
      return 0;
    }
  }

  private getOwnerWalletSigner(): ethers.Wallet {
    const ownerWalletAddress: string =
      this.configService.get<string>('BLOCKCHAIN_OWNER_WALLET') ||
      '0x0000000000000000000000000000000000000000';
    if (!ethers.isAddress(ownerWalletAddress)) {
      this.logger.error(
        `Invalid owner wallet address configured: ${String(ownerWalletAddress)}`,
      );
      throw new Error('Invalid owner wallet address');
    }

    const decryptedPrivateKey: string =
      this.configService.get<string>(
        'ENCRYPTED_BLOCKCHAIN_OWNER_PRIVATE_KEY',
      ) || '';
    if (!decryptedPrivateKey) {
      this.logger.error('Owner private key is not configured');
      throw new Error('Owner private key is not configured');
    }

    return new ethers.Wallet(
      this.configService.get<string>('BLOCKCHAIN_OWNER_PRIVATE_KEY') || '',
      this.provider,
    );
  }

  private async getWalletSigner(walletAddress: string): Promise<ethers.Wallet> {
    try {
      const walletRecord = await this.walletsService.findOne(walletAddress);
      const encryptionKey: string =
        this.configService.get<string>('WALLET_ENCRYPTION_KEY') ||
        'default-wallet-key';
      const privateKey = this.cryptoService.decrypt(
        walletRecord.encryptedPrivateKey,
        encryptionKey,
      );
      // const privateKey = walletRecord.encryptedPrivateKey;

      // const privateKey =
      //   this.configService.get<string>('WALLET_ENCRYPTION_KEY') ||
      //   'default-wallet-key';

      return new ethers.Wallet(privateKey, this.provider);
    } catch (error) {
      this.logger.error('Error getting wallet signer:', error);
      throw new Error('Failed to load wallet');
    }
  }

  private async getProsumerIdByWallet(
    walletAddress: string,
  ): Promise<string | null> {
    try {
      const prosumers =
        await this.prosumerService.findByWalletAddress(walletAddress);
      const firstProsumer: unknown =
        Array.isArray(prosumers) && prosumers.length > 0 ? prosumers[0] : null;
      return firstProsumer &&
        typeof firstProsumer === 'object' &&
        firstProsumer !== null &&
        'prosumerId' in firstProsumer &&
        typeof (firstProsumer as { prosumerId: unknown }).prosumerId ===
          'string'
        ? (firstProsumer as { prosumerId: string }).prosumerId
        : null;
    } catch (error: unknown) {
      this.logger.error('Error getting prosumer ID by wallet:', error);
      return null;
    }
  }

  private async handleOrderPlaced(
    id: bigint,
    user: string,
    amount: bigint,
    price: bigint,
    isBuy: boolean,
    timestamp: bigint,
    event: ethers.Log,
  ) {
    try {
      const prosumerId = await this.getProsumerIdByWallet(user);
      if (!prosumerId) {
        this.logger.warn(`No prosumer found for wallet ${user}`);
        return;
      }

      const extractedTxHash = this.extractTransactionHash(event);
      if (!extractedTxHash) {
        this.logger.warn(
          `No transaction hash found in OrderPlaced event for order ${id}`,
        );
        return;
      }

      // Both tokens use 2 decimals now
      const amountEtk = Number(amount) / 100; // ETK uses 2 decimals
      const priceIdrs = Number(price) / 100; // IDRS uses 2 decimals

      await this.tradeOrdersCacheService.create({
        orderId: id.toString(),
        prosumerId,
        walletAddress: user,
        orderType: isBuy ? OrderType.BID : OrderType.ASK,
        pair: 'ETK/IDRS',
        amountEtk: amountEtk,
        priceIdrsPerEtk: priceIdrs,
        totalIdrsValue: amountEtk * priceIdrs,
        statusOnChain: 'OPEN',
        createdAtOnChain: this.safeTimestampToDate(timestamp).toISOString(),
        updatedAtCache: new Date().toISOString(),
        blockchainTxHashPlaced: extractedTxHash,
      });

      const logTransaction =
        await this.transactionLogsService.findByTxHash(extractedTxHash);

      // update log transaction if it exists
      if (logTransaction) {
        await this.transactionLogsService.update(logTransaction.logId, {
          prosumerId: logTransaction.prosumerId,
          transactionType: logTransaction.transactionType,
          description: logTransaction.description,
          amountPrimary: logTransaction.amountPrimary,
          currencyPrimary: logTransaction.currencyPrimary,
          amountSecondary: logTransaction.amountSecondary,
          currencySecondary: logTransaction.currencySecondary,
          blockchainTxHash: logTransaction.blockchainTxHash,
          transactionTimestamp:
            logTransaction.transactionTimestamp instanceof Date
              ? logTransaction.transactionTimestamp.toISOString()
              : logTransaction.transactionTimestamp,
          relatedOrderId: id.toString(),
          relatedSettlementId: logTransaction.relatedSettlementId,
        });
      }

      this.logger.log(
        `Order placed: ${id.toString()} by ${user} (${isBuy ? 'BUY' : 'SELL'}) - ${amountEtk} ETK @ ${priceIdrs} IDRS`,
      );
    } catch (error) {
      this.logger.error('Error handling OrderPlaced event:', error);
    }
  }

  private async handleTransactionCompleted(
    buyer: string,
    seller: string,
    amount: bigint,
    price: bigint,
    timestamp: bigint,
    buyOrderId: bigint,
    sellOrderId: bigint,
    event: ethers.Log,
  ) {
    try {
      const buyerProsumerId = await this.getProsumerIdByWallet(buyer);
      const sellerProsumerId = await this.getProsumerIdByWallet(seller);

      if (!buyerProsumerId || !sellerProsumerId) {
        this.logger.warn(
          `Missing prosumer IDs for trade: buyer=${buyerProsumerId}, seller=${sellerProsumerId}`,
        );
        return;
      }

      const extractedTxHash = this.extractTransactionHash(event);
      if (!extractedTxHash) {
        this.logger.warn(
          `No transaction hash found in TransactionCompleted event for trade between ${buyer} and ${seller}`,
        );
        return;
      }

      // Both tokens use 2 decimals now
      const amountEtk = Number(amount) / 100; // ETK uses 2 decimals
      const priceIdrs = Number(price) / 100; // IDRS uses 2 decimals

      await this.marketTradesService.create({
        buyerOrderId: buyOrderId.toString(),
        sellerOrderId: sellOrderId.toString(),
        buyerProsumerId,
        sellerProsumerId,
        buyerWalletAddress: buyer,
        sellerWalletAddress: seller,
        tradedEtkAmount: amountEtk,
        priceIdrsPerEtk: priceIdrs,
        totalIdrsValue: amountEtk * priceIdrs,
        blockchainTxHash: extractedTxHash,
        tradeTimestamp: this.safeTimestampToDate(timestamp).toISOString(),
        createdAt: new Date().toISOString(),
      });

      await this.transactionLogsService.create({
        prosumerId: buyerProsumerId,
        transactionType: TransactionType.TRADE_EXECUTION,
        description: JSON.stringify({
          buyer,
          seller,
          amountEtk,
          priceIdrs,
          buyOrderId: buyOrderId.toString(),
          sellOrderId: sellOrderId.toString(),
          txHash: extractedTxHash,
          action: `Trade completed between ${buyer} and ${seller}`,
        }),
        amountPrimary: amountEtk,
        currencyPrimary: 'ETK',
        amountSecondary: amountEtk * priceIdrs,
        currencySecondary: 'IDRS',
        blockchainTxHash: extractedTxHash,
        transactionTimestamp: this.safeTimestampToDate(timestamp).toISOString(),
      });

      // Update order status in cache for both buy and sell orders
      const txHash = extractedTxHash;

      // Update buy order status
      await this.tradingMarketService.updateOrderStatusInCache(
        buyOrderId.toString(),
        true, // isBuyOrder
        amountEtk,
        txHash,
      );

      // Update sell order status
      await this.tradingMarketService.updateOrderStatusInCache(
        sellOrderId.toString(),
        false, // isBuyOrder
        amountEtk,
        txHash,
      );

      this.logger.log(
        `Trade completed: ${buyer} x ${seller} - ${amountEtk} ETK @ ${priceIdrs} IDRS (Buy Order: ${buyOrderId}, Sell Order: ${sellOrderId})`,
      );
    } catch (error) {
      this.logger.error('Error handling TransactionCompleted event:', error);
    }
  }

  private extractTransactionHash(event: ethers.Log): string | null {
    // Method 1: Standard ethers.Log property
    if (event.transactionHash) {
      return event.transactionHash;
    }

    // Method 2: Nested log structure (your case)
    const eventWithLog = event as unknown;
    if (
      typeof eventWithLog === 'object' &&
      eventWithLog !== null &&
      'log' in eventWithLog &&
      typeof (eventWithLog as { log: unknown }).log === 'object' &&
      (eventWithLog as { log: unknown }).log !== null
    ) {
      const logObject = (eventWithLog as { log: unknown }).log;
      if (
        typeof logObject === 'object' &&
        logObject !== null &&
        'transactionHash' in logObject &&
        typeof (logObject as { transactionHash: unknown }).transactionHash ===
          'string'
      ) {
        return (logObject as { transactionHash: string }).transactionHash;
      }
    }

    // Method 3: Args structure (sometimes transaction hash is in args)
    if (
      typeof eventWithLog === 'object' &&
      eventWithLog !== null &&
      'args' in eventWithLog &&
      Array.isArray((eventWithLog as { args: unknown }).args)
    ) {
      const args = (eventWithLog as { args: unknown[] }).args;
      for (const arg of args) {
        if (
          typeof arg === 'string' &&
          arg.startsWith('0x') &&
          arg.length === 66
        ) {
          // Verify it looks like a transaction hash pattern
          if (/^0x[a-fA-F0-9]{64}$/.test(arg)) {
            // this.logger.debug(`Found potential txHash in args: ${arg}`);
            return arg;
          }
        }
      }
    }

    this.logger.warn('No transaction hash found in event structure');
    return null;
  }

  private async handleSettlementProcessed(
    settlementId: string,
    meterId: string,
    prosumerAddress: string,
    netEnergyWh: bigint,
    etkAmount: bigint,
    timestamp: bigint,
    event: ethers.Log,
  ) {
    try {
      const prosumerId = await this.getProsumerIdByWallet(prosumerAddress);
      if (!prosumerId) {
        this.logger.warn(`No prosumer found for wallet ${prosumerAddress}`);
        return;
      }

      // Convert blockchain values to readable format
      const energyWhValue = Number(netEnergyWh);
      const etkAmountValue = Number(etkAmount) / 100; // Convert from contract units (2 decimals)

      const timestampDate = this.safeTimestampToDate(timestamp);

      const txHash = this.extractTransactionHash(event);

      // Log event details
      // this.logger.debug(
      //   `Event Object: ${JSON.stringify(
      //     event,
      //     (key, value) =>
      //       typeof value === 'bigint' ? value.toString() : value,
      //     2,
      //   )}`,
      // );

      // **KEY ADDITION**: Call confirmSettlement to update database status
      if (txHash) {
        try {
          const meterIdDbFunction = this.getMeterIdDbByTxHash();
          const meterIdDb = txHash ? await meterIdDbFunction(txHash) : null;

          if (!meterId) {
            this.logger.warn(
              `No meter ID found for settlement ${settlementId} with txHash ${txHash}`,
            );
            return;
          }

          // this.logger.debug(
          //   `txHash: ${txHash}, settlementId: ${settlementId}, meterId: ${meterIdDb}, prosumerAddress: ${prosumerAddress}, netEnergyWh: ${energyWhValue}, etkAmount: ${etkAmountValue}, timestamp: ${timestampDate.toISOString()}`,
          // );

          // Determine operation type
          const operationType =
            energyWhValue >= 0 ? 'EXPORT_TO_GRID' : 'IMPORT_FROM_GRID';
          const transactionType =
            energyWhValue >= 0
              ? TransactionType.TOKEN_MINT
              : TransactionType.TOKEN_BURN;

          this.logger.log(
            `Settlement processed: ${settlementId} for meter ${meterId} - ${operationType}: ${Math.abs(energyWhValue)} Wh → ${Math.abs(etkAmountValue)} ETK`,
          );
          // Extract settlement ID from the blockchain settlement ID
          // The settlementId format is: settlement_{db_settlement_id}_{timestamp}
          const settlementIdDbFunction = this.getSettlementIdDbByTxHash();
          const settlementIdDb = await settlementIdDbFunction(txHash);

          // const settlementIdParts = settlementId.split('_');
          if (settlementIdDb !== null) {
            // this.logger.debug(
            //   `Confirming settlement ${settlementIdDb} with txHash ${txHash}`,
            // );

            // Call confirmSettlement to update the database status
            await this.energySettlementService.confirmSettlement(
              settlementIdDb,
              txHash,
              true, // success = true since we received the event
              etkAmountValue,
            );

            // Log settlement confirmation
            await this.transactionLogsService.create({
              prosumerId,
              transactionType,
              relatedSettlementId: settlementIdDb,
              description: JSON.stringify({
                settlementId,
                meterIdDb,
                prosumerAddress,
                netEnergyWh: energyWhValue,
                etkAmount: etkAmountValue,
                operationType,
                timestamp: timestampDate.toISOString(),
                txHash,
                action: `Settlement confirmed on blockchain - ${operationType}`,
              }),
              amountPrimary: Math.abs(etkAmountValue),
              currencyPrimary: 'ETK',
              blockchainTxHash: txHash || 'UNKNOWN',
              transactionTimestamp: timestampDate.toISOString(),
            });

            this.logger.log(
              `Settlement ${settlementIdDb} automatically confirmed from blockchain event`,
            );
          } else {
            this.logger.warn(
              `Unable to parse settlement ID format: ${settlementId}`,
            );
          }
        } catch (confirmError) {
          this.logger.error(
            `Error confirming settlement ${settlementId}:`,
            confirmError,
          );
          // Don't throw - this is a non-critical operation
        }
      }
    } catch (error) {
      this.logger.error('Error handling SettlementProcessed event:', error);
    }
  }

  private async handleOrderCancelled(
    user: string,
    amount: bigint,
    price: bigint,
    isBuy: boolean,
    timestamp: bigint,
    orderId: bigint,
    event: ethers.Log,
  ) {
    try {
      // Both tokens use 2 decimals now
      const amountEtk = Number(amount) / 100; // ETK uses 2 decimals
      const priceIdrs = Number(price) / 100; // IDRS uses 2 decimals

      const cancellationTime =
        this.safeTimestampToDate(timestamp).toISOString();

      const extractedTxHash = this.extractTransactionHash(event);

      const txHash = extractedTxHash ?? undefined;

      // Log transaction for order cancellation
      await this.transactionLogsService.create({
        prosumerId: (await this.getProsumerIdByWallet(user)) || 'UNKNOWN',
        transactionType: TransactionType.ORDER_CANCELLED,
        description: JSON.stringify({
          orderId: orderId.toString(),
          walletAddress: user,
          amountEtk,
          priceIdrs,
          orderType: isBuy ? OrderType.BID : OrderType.ASK,
          cancellationTime,
          txHash,
          action: 'Order cancelled via blockchain event',
        }),
        amountPrimary: amountEtk,
        currencyPrimary: isBuy ? 'IDRS' : 'ETK',
        blockchainTxHash: txHash,
        transactionTimestamp: cancellationTime,
      });

      // Update order status in cache to CANCELLED
      try {
        const cachedOrder = await this.tradeOrdersCacheService.findOne(
          orderId.toString(),
        );

        await this.tradeOrdersCacheService.update(orderId.toString(), {
          orderId: cachedOrder.orderId,
          prosumerId: cachedOrder.prosumerId,
          walletAddress: cachedOrder.walletAddress,
          orderType: cachedOrder.orderType,
          pair: cachedOrder.pair,
          amountEtk: cachedOrder.amountEtk,
          priceIdrsPerEtk: cachedOrder.priceIdrsPerEtk,
          totalIdrsValue: cachedOrder.totalIdrsValue,
          statusOnChain: 'CANCELLED',
          createdAtOnChain:
            cachedOrder.createdAtOnChain instanceof Date
              ? cachedOrder.createdAtOnChain.toISOString()
              : cachedOrder.createdAtOnChain,
          updatedAtCache: new Date().toISOString(),
          blockchainTxHashPlaced: cachedOrder.blockchainTxHashPlaced,
          blockchainTxHashFilled: cachedOrder.blockchainTxHashFilled,
          blockchainTxHashCancelled: txHash,
        });

        this.logger.log(
          `Order ${orderId} status updated to CANCELLED in cache`,
        );
      } catch {
        this.logger.warn(
          `Order ${orderId} not found in cache for cancellation update`,
        );
      }

      this.logger.log(
        `Order cancelled by ${user}: Order ID ${orderId} - ${amountEtk} ETK @ ${priceIdrs} IDRS (${isBuy ? 'BUY' : 'SELL'}) at ${cancellationTime}`,
      );
    } catch (error) {
      this.logger.error('Error handling OrderCancelled event:', error);
    }
  }

  async whiteListEnergyConverter(
    ownerWalletAddress: string,
    energyConverterAddress: string,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(ownerWalletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.etkToken,
        this.tokenABI,
        wallet,
      );

      const tx = (await contract.whiteListEnergyConverter(
        energyConverterAddress,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(ownerWalletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.CONTRACT_INTERACTION,
        description: JSON.stringify({
          energyConverterAddress,
          txHash: tx.hash,
          action: 'Whitelist energy converter contract for ETK',
        }),
        amountPrimary: 0,
        currencyPrimary: 'ETK',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(
        `ETK energy converter whitelist transaction sent: ${tx.hash}`,
      );
      return tx.hash;
    } catch (error) {
      this.logger.error('Error whitelisting energy converter for ETK:', error);
      throw error;
    }
  }

  async approveToken(
    walletAddress: string,
    tokenContract: string,
    spenderContract: string,
    amount: number,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(walletAddress);
      const contract = new ethers.Contract(
        tokenContract,
        this.tokenABI,
        wallet,
      );

      let tokenAmount: bigint;

      // Both ETK and IDRS use 2 decimals
      if (
        tokenContract.toLowerCase() ===
          this.config.contracts.etkToken.toLowerCase() ||
        tokenContract.toLowerCase() ===
          this.config.contracts.idrsToken.toLowerCase()
      ) {
        tokenAmount = BigInt(Math.floor(amount * 100)); // Convert to contract units
      } else {
        tokenAmount = ethers.parseEther(amount.toString()); // Use 18 decimals for other tokens
      }

      const tx = (await contract.approve(
        spenderContract,
        tokenAmount,
      )) as ethers.ContractTransactionResponse;

      // Removed: BlockchainApprovals logging (not used)
      // Token approval tracking can be done via blockchain events if needed

      return tx.hash;
    } catch (error) {
      this.logger.error('Error approving token:', error);
      throw error;
    }
  }

  /**
   * Place a buy order - delegates to TradingMarketService
   */
  async placeBuyOrder(
    walletAddress: string,
    quantity: number,
    price: number,
  ): Promise<string> {
    return this.tradingMarketService.placeBuyOrder(
      walletAddress,
      quantity,
      price,
    );
  }

  /**
   * Place a sell order - delegates to TradingMarketService
   */
  async placeSellOrder(
    walletAddress: string,
    quantity: number,
    price: number,
  ): Promise<string> {
    return this.tradingMarketService.placeSellOrder(
      walletAddress,
      quantity,
      price,
    );
  }

  /**
   * Get market price - delegates to TradingMarketService
   */
  async getMarketPrice(): Promise<number> {
    return this.tradingMarketService.getMarketPrice();
  }

  /**
   * Get total ETK supply in market - delegates to TradingMarketService
   */
  async getTotalETKSupplyInMarket(): Promise<number> {
    return this.tradingMarketService.getTotalETKSupplyInMarket();
  }

  /**
   * Get total IDRS supply in market - delegates to TradingMarketService
   */
  async getTotalIDRSSupplyInMarket(): Promise<number> {
    return this.tradingMarketService.getTotalIDRSSupplyInMarket();
  }

  /**
   * Cancel an order - delegates to TradingMarketService
   */
  async cancelOrder(
    walletAddress: string,
    orderId: string,
    isBuyOrder: boolean,
  ): Promise<string> {
    return this.tradingMarketService.cancelOrder(
      walletAddress,
      orderId,
      isBuyOrder,
    );
  }

  /**
   * Get order details - delegates to TradingMarketService
   */
  async getOrderDetails(
    orderId: string,
    isBuyOrder: boolean,
  ): Promise<{
    id: string;
    user: string;
    amount: number;
    price: number;
    timestamp: number;
    exists: boolean;
  } | null> {
    return this.tradingMarketService.getOrderDetails(orderId, isBuyOrder);
  }

  /**
   * Get market liquidity - delegates to TradingMarketService
   */
  async getMarketLiquidity(): Promise<{
    etkSupply: number;
    idrsSupply: number;
    buyOrderCount: number;
    sellOrderCount: number;
  }> {
    return this.tradingMarketService.getMarketLiquidity();
  }
}
