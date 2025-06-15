import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { WalletsService } from '../graphql/Wallets/Wallets.service';
import { TransactionLogsService } from '../graphql/TransactionLogs/TransactionLogs.service';
import { TradeOrdersCacheService } from '../graphql/TradeOrdersCache/TradeOrdersCache.service';
import { MarketTradesService } from '../graphql/MarketTrades/MarketTrades.service';
import { BlockchainApprovalsService } from '../graphql/BlockchainApprovals/BlockchainApprovals.service';
import { CryptoService } from '../common/crypto.service';
import { TransactionType, OrderType } from '../common/enums';
import { BlockchainConfig } from '../common/interfaces';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private config: BlockchainConfig;

  // Contract ABIs (simplified for demo)
  private readonly energyConverterABI = [
    'function convertEnergyToTokens(address prosumer, uint256 energyAmount) external returns (uint256)',
    'function burnTokensForEnergy(address prosumer, uint256 tokenAmount) external returns (uint256)',
    'event EnergyConverted(address indexed prosumer, uint256 energyAmount, uint256 tokenAmount)',
    'event TokensBurned(address indexed prosumer, uint256 tokenAmount, uint256 energyAmount)',
  ];

  private readonly marketABI = [
    'function placeBuyOrder(uint256 quantity, uint256 price) external returns (uint256)',
    'function placeSellOrder(uint256 quantity, uint256 price) external returns (uint256)',
    'function cancelOrder(uint256 orderId) external',
    'event OrderPlaced(uint256 indexed orderId, address indexed trader, uint8 orderType, uint256 quantity, uint256 price)',
    'event OrderMatched(uint256 indexed buyOrderId, uint256 indexed sellOrderId, uint256 quantity, uint256 price)',
    'event OrderCancelled(uint256 indexed orderId)',
  ];

  private readonly tokenABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)',
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
  ) {
    this.initializeProvider();
  }

  private initializeProvider() {
    this.config = {
      rpcUrl:
        this.configService.get('BLOCKCHAIN_RPC_URL') || 'http://localhost:8545',
      chainId: parseInt(
        this.configService.get('BLOCKCHAIN_CHAIN_ID') || '1337',
      ),
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

    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    try {
      // Listen to market events
      const marketContract = new ethers.Contract(
        this.config.contracts.market,
        this.marketABI,
        this.provider,
      );

      marketContract.on(
        'OrderPlaced',
        async (orderId, trader, orderType, quantity, price, event) => {
          await this.handleOrderPlaced(
            orderId,
            trader,
            orderType,
            quantity,
            price,
            event,
          );
        },
      );

      marketContract.on(
        'OrderMatched',
        async (buyOrderId, sellOrderId, quantity, price, event) => {
          await this.handleOrderMatched(
            buyOrderId,
            sellOrderId,
            quantity,
            price,
            event,
          );
        },
      );

      this.logger.log('Blockchain event listeners setup complete');
    } catch (error) {
      this.logger.error('Error setting up event listeners:', error);
    }
  }

  async convertEnergyToTokens(
    walletAddress: string,
    energyKwh: number,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(walletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        wallet,
      );

      // Convert kWh to Wei equivalent (assuming 1 kWh = 1 ETK = 10^18 wei)
      const energyAmount = ethers.parseEther(energyKwh.toString());

      const tx = await contract.convertEnergyToTokens(
        walletAddress,
        energyAmount,
      );

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId: 'SYSTEM', // Default for energy conversion
        transactionType: TransactionType.TOKEN_MINT,
        description: JSON.stringify({
          energyKwh,
          txHash: (tx as any).hash,
          walletAddress,
          action: 'Energy conversion to tokens',
        }),
        amountPrimary: energyKwh,
        currencyPrimary: 'ETK',
        blockchainTxHash: (tx as any).hash,
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Energy conversion transaction sent: ${(tx as any).hash}`,
      );
      return (tx as any).hash;
    } catch (error) {
      this.logger.error('Error converting energy to tokens:', error);
      throw error;
    }
  }

  async burnTokensForEnergy(
    walletAddress: string,
    tokenAmount: number,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(walletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.energyConverter,
        this.energyConverterABI,
        wallet,
      );

      const amount = ethers.parseEther(tokenAmount.toString());
      const tx = await contract.burnTokensForEnergy(walletAddress, amount);

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId: 'SYSTEM',
        transactionType: TransactionType.TOKEN_BURN,
        description: JSON.stringify({
          tokenAmount,
          txHash: (tx as any).hash,
          walletAddress,
          action: 'Token burn for energy consumption',
        }),
        amountPrimary: tokenAmount,
        currencyPrimary: 'ETK',
        blockchainTxHash: (tx as any).hash,
        transactionTimestamp: new Date().toISOString(),
      });

      return (tx as any).hash;
    } catch (error) {
      this.logger.error('Error burning tokens:', error);
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

      const tokenAmount = ethers.parseEther(amount.toString());
      const tx = await contract.approve(spenderContract, tokenAmount);

      // Log approval
      await this.blockchainApprovalsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(walletAddress)) || 'UNKNOWN',
        walletAddress,
        spenderContractAddress: spenderContract,
        tokenContractAddress: tokenContract,
        approvedAmount: Number(amount),
        approvalTxHash: (tx as any).hash,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      return (tx as any).hash;
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
    return this.placeOrder(walletAddress, OrderType.BID, quantity, price);
  }

  async placeSellOrder(
    walletAddress: string,
    quantity: number,
    price: number,
  ): Promise<string> {
    return this.placeOrder(walletAddress, OrderType.ASK, quantity, price);
  }

  private async placeOrder(
    walletAddress: string,
    orderType: OrderType,
    quantity: number,
    price: number,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(walletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.market,
        this.marketABI,
        wallet,
      );

      const quantityWei = ethers.parseEther(quantity.toString());
      const priceWei = ethers.parseEther(price.toString());

      let tx;
      if (orderType === OrderType.BID) {
        tx = await contract.placeBuyOrder(quantityWei, priceWei);
      } else {
        tx = await contract.placeSellOrder(quantityWei, priceWei);
      }

      // Log transaction
      await this.transactionLogsService.create({
        prosumerId:
          (await this.getProsumerIdByWallet(walletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.ORDER_PLACED,
        description: JSON.stringify({
          orderType,
          quantity,
          price,
          txHash: (tx as any).hash,
        }),
        amountPrimary: quantity,
        currencyPrimary: orderType === OrderType.BID ? 'IDRS' : 'ETK',
        blockchainTxHash: (tx as any).hash,
        transactionTimestamp: new Date().toISOString(),
      });

      return (tx as any).hash;
    } catch (error) {
      this.logger.error('Error placing order:', error);
      throw error;
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
      const balance = await contract.balanceOf(walletAddress);
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

  private async getWalletSigner(walletAddress: string): Promise<ethers.Wallet> {
    try {
      const walletRecord = await this.walletsService.findOne(walletAddress);
      const encryptionKey =
        this.configService.get('WALLET_ENCRYPTION_KEY') || 'default-wallet-key';
      const privateKey = this.cryptoService.decrypt(
        walletRecord.encryptedPrivateKey,
        encryptionKey,
      );

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
      const prosumers = await this.walletsService.findProsumers(walletAddress);
      return prosumers[0]?.prosumerId || null;
    } catch (error) {
      return null;
    }
  }

  private async handleOrderPlaced(
    orderId: any,
    trader: string,
    orderType: number,
    quantity: any,
    price: any,
    event: any,
  ) {
    try {
      const prosumerId = await this.getProsumerIdByWallet(trader);
      if (!prosumerId) {
        this.logger.warn(`No prosumer found for wallet ${trader}`);
        return;
      }

      await this.tradeOrdersCacheService.create({
        orderId: orderId.toString(),
        prosumerId,
        walletAddress: trader,
        orderType: orderType === 0 ? OrderType.BID : OrderType.ASK,
        pair: 'ETK/IDRS',
        amountEtk: parseFloat(ethers.formatEther(quantity)),
        priceIdrsPerEtk: parseFloat(ethers.formatEther(price)),
        totalIdrsValue:
          parseFloat(ethers.formatEther(quantity)) *
          parseFloat(ethers.formatEther(price)),
        statusOnChain: 'OPEN',
        createdAtOnChain: new Date().toISOString(),
        updatedAtCache: new Date().toISOString(),
        blockchainTxHashPlaced: event?.transactionHash || null,
      });

      this.logger.log(`Order placed: ${orderId} by ${trader}`);
    } catch (error) {
      this.logger.error('Error handling OrderPlaced event:', error);
    }
  }

  private async handleOrderMatched(
    buyOrderId: any,
    sellOrderId: any,
    quantity: any,
    price: any,
    event: any,
  ) {
    try {
      // Update order statuses
      await this.tradeOrdersCacheService.update(buyOrderId.toString(), {
        orderId: buyOrderId.toString(),
        prosumerId: 'temp',
        walletAddress: 'temp',
        orderType: 'BID',
        pair: 'ETK/IDRS',
        amountEtk: 0,
        priceIdrsPerEtk: 0,
        statusOnChain: 'FILLED',
        createdAtOnChain: new Date().toISOString(),
        updatedAtCache: new Date().toISOString(),
      });

      await this.tradeOrdersCacheService.update(sellOrderId.toString(), {
        orderId: sellOrderId.toString(),
        prosumerId: 'temp',
        walletAddress: 'temp',
        orderType: 'ASK',
        pair: 'ETK/IDRS',
        amountEtk: 0,
        priceIdrsPerEtk: 0,
        statusOnChain: 'FILLED',
        createdAtOnChain: new Date().toISOString(),
        updatedAtCache: new Date().toISOString(),
      });

      // Create trade record
      const buyOrder = await this.tradeOrdersCacheService.findOne(
        buyOrderId.toString(),
      );
      const sellOrder = await this.tradeOrdersCacheService.findOne(
        sellOrderId.toString(),
      );

      const buyerProsumerId = await this.getProsumerIdByWallet(
        buyOrder.walletAddress,
      );
      const sellerProsumerId = await this.getProsumerIdByWallet(
        sellOrder.walletAddress,
      );

      if (!buyerProsumerId || !sellerProsumerId) {
        this.logger.warn(
          `Missing prosumer IDs for trade: buyer=${buyerProsumerId}, seller=${sellerProsumerId}`,
        );
        return;
      }

      await this.marketTradesService.create({
        buyerOrderId: buyOrderId.toString(),
        sellerOrderId: sellOrderId.toString(),
        buyerProsumerId,
        sellerProsumerId,
        buyerWalletAddress: buyOrder.walletAddress,
        sellerWalletAddress: sellOrder.walletAddress,
        tradedEtkAmount: parseFloat(ethers.formatEther(quantity)),
        priceIdrsPerEtk: parseFloat(ethers.formatEther(price)),
        totalIdrsValue:
          parseFloat(ethers.formatEther(quantity)) *
          parseFloat(ethers.formatEther(price)),
        blockchainTxHash: event?.transactionHash || null,
        tradeTimestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      this.logger.log(`Trade executed: ${buyOrderId} x ${sellOrderId}`);
    } catch (error) {
      this.logger.error('Error handling OrderMatched event:', error);
    }
  }
}
