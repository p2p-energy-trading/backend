import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, ethers } from 'ethers';
import { WalletsService } from '../modules/Wallets/Wallets.service';
import { TransactionLogsService } from '../modules/TransactionLogs/TransactionLogs.service';
import { TradeOrdersCacheService } from '../modules/TradeOrdersCache/TradeOrdersCache.service';
import { MarketTradesService } from '../modules/MarketTrades/MarketTrades.service';
import { BlockchainApprovalsService } from '../modules/BlockchainApprovals/BlockchainApprovals.service';
import { CryptoService } from '../common/crypto.service';
import { TransactionType, OrderType } from '../common/enums';
import { BlockchainConfig } from '../common/interfaces';
import { EnergySettlementService } from './energy-settlement.service';
import { ProsumersService } from 'src/modules/Prosumers/Prosumers.service';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private config: BlockchainConfig;

  // Contract ABIs (simplified for demo)
  private readonly energyConverterABI = [
    'function processSettlement(string meterId, address prosumerAddress, int256 netEnergyWh, bytes32 settlementId) external returns (uint256)',
    'function authorizeMeter(string meterId, address meterAddress) external',
    'function deauthorizeMeter(string meterId, address meterAddress) external',
    'function calculateEtkAmount(uint256 energyWh) external view returns (uint256)',
    'function calculateEnergyWh(uint256 etkAmount) external view returns (uint256)',
    'function updateConversionRatio(uint256 newRatio) external',
    'function updateMinSettlement(uint256 newMinWh) external',
    'function getSettlement(bytes32 settlementId) external view returns (string, address, int256, uint256, uint256, bool)',
    'function getSettlementCount() external view returns (uint256)',
    'function getSettlementIdByIndex(uint256 index) external view returns (bytes32)',
    'function isMeterAuthorized(address meterAddress) external view returns (bool)',
    'function isMeterIdAuthorized(string meterId) external view returns (bool)',
    'function emergencyWithdrawETK(uint256 amount) external',
    'function transferOwnership(address newOwner) external',
    'function conversionRatio() external view returns (uint256)',
    'function minSettlementWh() external view returns (uint256)',
    'function owner() external view returns (address)',
    'event SettlementProcessed(bytes32 indexed settlementId, string indexed meterId, address indexed prosumerAddress, int256 netEnergyWh, uint256 etkAmount, uint256 timestamp)',
    'event MeterAuthorized(string meterId, address meterAddress, address authorizedBy)',
    'event MeterDeauthorized(string meterId, address meterAddress, address deauthorizedBy)',
    'event ConversionRatioUpdated(uint256 oldRatio, uint256 newRatio, address updatedBy)',
    'event MinSettlementUpdated(uint256 oldMinWh, uint256 newMinWh, address updatedBy)',
  ];

  private readonly marketABI = [
    'function placeOrder(uint256 _uuid, uint256 _amount, uint256 _price, bool _isBuy) external',
    'function cancelOrder(uint256 id, bool isBuy) external',
    'function getBuyOrders() external view returns (address[] memory, uint256[] memory, uint256[] memory)',
    'function getSellOrders() external view returns (address[] memory, uint256[] memory, uint256[] memory)',
    'function getMarketPrice() external view returns (uint256)',
    'event OrderPlaced(uint256 indexed id, address indexed user, uint256 amount, uint256 price, bool isBuy, uint256 timestamp)',
    'event TransactionCompleted(address indexed buyer, address indexed seller, uint256 amount, uint256 price, uint256 timestamp)',
    'event OrderCancelled(address indexed user, uint256 amount, uint256 price, bool isBuy, uint256 timestamp)',
  ];

  private readonly tokenABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
    'function totalSupply() external view returns (uint256)',
    'function mint(uint256 amount) external',
    'function burn(uint256 amount) external',
    'function whiteListMarket(address marketAddress) external',
    'function whiteListEnergyConverter(address energyConverterAddress) external',
    'function decimals() external view returns (uint8)',
    'function name() external view returns (string)',
    'function symbol() external view returns (string)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
  ];

  constructor(
    private configService: ConfigService,
    private walletsService: WalletsService,
    private transactionLogsService: TransactionLogsService,
    private tradeOrdersCacheService: TradeOrdersCacheService,
    private marketTradesService: MarketTradesService,
    private blockchainApprovalsService: BlockchainApprovalsService,
    private cryptoService: CryptoService,
    @Inject(forwardRef(() => EnergySettlementService))
    private energySettlementService: EnergySettlementService,
    private prosumerService: ProsumersService,
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

    this.logger.debug(this.config);

    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    this.setupEventListeners();
  }

  public getCalculateEtkAmount(energyWh: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );

      // Convert to integer by rounding to avoid floating point precision issues
      const energyWhInteger = Math.round(energyWh);

      contract
        .calculateEtkAmount(energyWhInteger)
        .then((result: bigint) => {
          // Convert from contract units (2 decimals) to ETK
          resolve(Number(result) / 100);
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
            event: ethers.Log,
          ) => {
            void this.handleTransactionCompleted(
              buyer,
              seller,
              amount,
              price,
              timestamp,
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
            event: ethers.Log,
          ) => {
            void this.handleOrderCancelled(
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
    originalSettlementId?: number,
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
        netEnergyWh,
        settlementIdBytes32,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(prosumerAddress)) || 'UNKNOWN',
        transactionType:
          netEnergyWh > 0
            ? TransactionType.TOKEN_MINT
            : TransactionType.TOKEN_BURN,
        description: JSON.stringify({
          meterId,
          prosumerAddress,
          netEnergyWh,
          settlementId,
          txHash: tx.hash,
          action: `Energy settlement processing - ${netEnergyWh > 0 ? 'Export (Mint)' : 'Import (Burn)'}`,
        }),
        amountPrimary: Math.abs(netEnergyWh / 1000), // Convert Wh to kWh
        currencyPrimary: 'ETK',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
        relatedSettlementId: originalSettlementId,
      });

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
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );
      const etkAmount = (await contract.calculateEtkAmount(energyWh)) as bigint;
      // Convert from contract units (2 decimals) to ETK
      return Number(etkAmount) / 100;
    } catch (error) {
      this.logger.error('Error calculating ETK amount:', error);
      return 0;
    }
  }

  async calculateEnergyWh(etkAmount: number): Promise<number> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        this.provider,
      );
      // Convert ETK to contract units (2 decimals)
      const etkAmountUnits = Math.floor(etkAmount * 100);
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

  // Update the old energy conversion methods to use the new contract pattern
  async convertEnergyToTokens(
    walletAddress: string,
    energyKwh: number,
  ): Promise<string> {
    // This method is now deprecated in favor of processEnergySettlement
    // but kept for backward compatibility
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
    // This method is now deprecated in favor of processEnergySettlement
    // but kept for backward compatibility
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
        this.tokenABI,
        wallet,
      );

      // Convert to ETK units (2 decimals: 1 ETK = 100 units)
      const tokenAmount = Math.floor(amount * 100);

      const tx = (await contract.mint(
        tokenAmount,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(walletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.TOKEN_MINT,
        description: JSON.stringify({
          amount,
          tokenAmount,
          txHash: tx.hash,
          walletAddress,
          action: 'ETK token mint',
        }),
        amountPrimary: amount,
        currencyPrimary: 'ETK',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

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
        this.tokenABI,
        wallet,
      );

      // Convert to ETK units (2 decimals: 1 ETK = 100 units)
      const tokenAmount = Math.floor(amount * 100);

      const tx = (await contract.burn(
        tokenAmount,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(walletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.TOKEN_BURN,
        description: JSON.stringify({
          amount,
          tokenAmount,
          txHash: tx.hash,
          walletAddress,
          action: 'ETK token burn',
        }),
        amountPrimary: amount,
        currencyPrimary: 'ETK',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

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
      const wallet = await this.getWalletSigner(walletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.idrsToken,
        this.tokenABI,
        wallet,
      );

      // Convert to IDRS units (2 decimals: 1 IDRS = 100 units)
      const tokenAmount = Math.floor(amount * 100);

      const tx = (await contract.mint(
        tokenAmount,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(walletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.TOKEN_MINT,
        description: JSON.stringify({
          amount,
          tokenAmount,
          txHash: tx.hash,
          walletAddress,
          action: 'IDRS token mint',
        }),
        amountPrimary: amount,
        currencyPrimary: 'IDRS',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(`IDRS mint transaction sent: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      this.logger.error('Error minting IDRS tokens:', error);
      throw error;
    }
  }

  async burnIDRSTokens(walletAddress: string, amount: number): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(walletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.idrsToken,
        this.tokenABI,
        wallet,
      );

      // Convert to IDRS units (2 decimals: 1 IDRS = 100 units)
      const tokenAmount = Math.floor(amount * 100);

      const tx = (await contract.burn(
        tokenAmount,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(walletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.TOKEN_BURN,
        description: JSON.stringify({
          amount,
          tokenAmount,
          txHash: tx.hash,
          walletAddress,
          action: 'IDRS token burn',
        }),
        amountPrimary: amount,
        currencyPrimary: 'IDRS',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(`IDRS burn transaction sent: ${tx.hash}`);
      return tx.hash;
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
        this.tokenABI,
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
        this.tokenABI,
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
        this.tokenABI,
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
        this.tokenABI,
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
    return new ethers.Wallet(
      this.configService.get<string>('BLOCKCHAIN_OWNER_PRIVATE_KEY') || '',
      this.provider,
    );
  }

  private async getWalletSigner(walletAddress: string): Promise<ethers.Wallet> {
    try {
      const walletRecord = await this.walletsService.findOne(walletAddress);
      // const encryptionKey: string =
      //   this.configService.get<string>('WALLET_ENCRYPTION_KEY') ||
      //   'default-wallet-key';
      // const privateKey = this.cryptoService.decrypt(
      //   walletRecord.encryptedPrivateKey,
      //   encryptionKey,
      // );
      const privateKey = walletRecord.encryptedPrivateKey;

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
        createdAtOnChain: new Date(Number(timestamp) * 1000).toISOString(),
        updatedAtCache: new Date().toISOString(),
        blockchainTxHashPlaced: event.transactionHash ?? null,
      });

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

      // Both tokens use 2 decimals now
      const amountEtk = Number(amount) / 100; // ETK uses 2 decimals
      const priceIdrs = Number(price) / 100; // IDRS uses 2 decimals

      await this.marketTradesService.create({
        buyerOrderId: 'unknown', // We don't have order IDs in TransactionCompleted event
        sellerOrderId: 'unknown',
        buyerProsumerId,
        sellerProsumerId,
        buyerWalletAddress: buyer,
        sellerWalletAddress: seller,
        tradedEtkAmount: amountEtk,
        priceIdrsPerEtk: priceIdrs,
        totalIdrsValue: amountEtk * priceIdrs,
        blockchainTxHash: event.transactionHash ?? null,
        tradeTimestamp: new Date(Number(timestamp) * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      this.logger.log(
        `Trade completed: ${buyer} x ${seller} - ${amountEtk} ETK @ ${priceIdrs} IDRS`,
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
            this.logger.debug(`Found potential txHash in args: ${arg}`);
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
      const timestampDate = new Date(Number(timestamp) * 1000);
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

          this.logger.debug(
            `txHash: ${txHash}, settlementId: ${settlementId}, meterId: ${meterIdDb}, prosumerAddress: ${prosumerAddress}, netEnergyWh: ${energyWhValue}, etkAmount: ${etkAmountValue}, timestamp: ${timestampDate.toISOString()}`,
          );

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
            this.logger.debug(
              `Confirming settlement ${settlementIdDb} with txHash ${txHash}`,
            );

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
    event: ethers.Log,
  ) {
    try {
      // Both tokens use 2 decimals now
      const amountEtk = Number(amount) / 100; // ETK uses 2 decimals
      const priceIdrs = Number(price) / 100; // IDRS uses 2 decimals

      const cancellationTime = new Date(Number(timestamp) * 1000).toISOString();
      const txHash = event.transactionHash ?? null;

      // Log transaction for order cancellation
      await this.transactionLogsService.create({
        prosumerId: (await this.getProsumerIdByWallet(user)) || 'UNKNOWN',
        transactionType: TransactionType.ORDER_CANCELLED,
        description: JSON.stringify({
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

      this.logger.log(
        `Order cancelled by ${user}: ${amountEtk} ETK @ ${priceIdrs} IDRS (${isBuy ? 'BUY' : 'SELL'}) at ${cancellationTime}`,
      );

      // Note: We don't have the order ID in the cancelled event,
      // so we can't update the specific order in cache
      // This could be improved by maintaining a mapping or updating the contract
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

      // Log approval
      await this.blockchainApprovalsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(walletAddress)) || 'UNKNOWN',
        walletAddress,
        spenderContractAddress: spenderContract,
        tokenContractAddress: tokenContract,
        approvedAmount: Number(amount),
        approvalTxHash: tx.hash,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      return tx.hash;
    } catch (error) {
      this.logger.error('Error approving token:', error);
      throw error;
    }
  }

  async placeBuyOrder(
    walletAddress: string,
    quantity: number,
    price: number,
  ): Promise<string> {
    return this.placeOrder(walletAddress, quantity, price, true);
  }

  async placeSellOrder(
    walletAddress: string,
    quantity: number,
    price: number,
  ): Promise<string> {
    return this.placeOrder(walletAddress, quantity, price, false);
  }

  private async placeOrder(
    walletAddress: string,
    quantity: number,
    price: number,
    isBuy: boolean,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(walletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.market,
        this.marketABI,
        wallet,
      );

      // Generate UUID for the order
      const uuid = Math.floor(Math.random() * 1000000000000);

      // Both ETK and IDRS use 2 decimals now
      const amountWei = BigInt(Math.floor(quantity * 100)); // ETK uses 2 decimals
      const priceWei = BigInt(Math.floor(price * 100)); // IDRS uses 2 decimals

      const tx = (await contract.placeOrder(
        uuid,
        amountWei,
        priceWei,
        isBuy,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(walletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.ORDER_PLACED,
        description: JSON.stringify({
          orderType: isBuy ? OrderType.BID : OrderType.ASK,
          quantity,
          price,
          uuid,
          txHash: tx.hash,
        }),
        amountPrimary: quantity,
        currencyPrimary: isBuy ? 'IDRS' : 'ETK',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

      return tx.hash;
    } catch (error) {
      this.logger.error('Error placing order:', error);
      throw error;
    }
  }

  async getMarketPrice(): Promise<number> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.market,
        this.marketABI,
        this.provider,
      );
      const price = (await contract.getMarketPrice()) as bigint;
      // Convert from contract units (2 decimals) to IDRS
      return Number(price) / 100;
    } catch (error) {
      this.logger.error('Error getting market price:', error);
      return 0;
    }
  }
}
