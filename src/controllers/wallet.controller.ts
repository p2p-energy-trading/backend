import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { WalletsService } from '../modules/Wallets/Wallets.service';
import { IdrsConversionsService } from '../modules/IdrsConversions/IdrsConversions.service';
import { CryptoService } from '../common/crypto.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import {
  ConversionType,
  WalletImportMethod,
  TransactionType,
} from '../common/enums';
import { ProsumersService } from 'src/modules/Prosumers/Prosumers.service';
import { BlockchainService } from '../services/blockchain.service';
import { TransactionLogsService } from '../modules/TransactionLogs/TransactionLogs.service';
// import { create } from 'domain';

interface CreateWalletRequest {
  walletName: string;
  importMethod: 'GENERATED' | 'IMPORTED_PRIVATE_KEY' | 'IMPORTED_MNEMONIC';
  privateKey?: string;
  mnemonic?: string;
}

interface IdrsConversionRequest {
  walletAddress: string;
  conversionType: 'ON_RAMP' | 'OFF_RAMP';
  amount: number;
}

interface User extends Request {
  user: {
    prosumerId: string;
  };
}

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(
    private walletsService: WalletsService,
    private idrsConversionsService: IdrsConversionsService,
    private cryptoService: CryptoService,
    private prosumersService: ProsumersService,
    private blockchainService: BlockchainService,
    private transactionLogsService: TransactionLogsService,
  ) {}

  @Post('create')
  async createWallet(@Body() body: CreateWalletRequest, @Request() req: User) {
    const prosumerId = req.user.prosumerId;

    let walletAddress: string;
    let privateKey: string;
    if (body.importMethod === 'GENERATED') {
      // Generate new wallet
      const wallet = ethers.Wallet.createRandom();
      walletAddress = wallet.address;
      privateKey = wallet.privateKey;
    } else if (body.importMethod === 'IMPORTED_PRIVATE_KEY') {
      if (!body.privateKey) {
        throw new BadRequestException('Private key is required for import');
      }
      const wallet = new ethers.Wallet(body.privateKey);
      walletAddress = wallet.address;
      privateKey = body.privateKey;
    } else if (body.importMethod === 'IMPORTED_MNEMONIC') {
      if (!body.mnemonic) {
        throw new BadRequestException('Mnemonic is required for import');
      }
      const wallet = ethers.Wallet.fromPhrase(body.mnemonic);
      walletAddress = wallet.address;
      privateKey = wallet.privateKey;
    } else {
      throw new BadRequestException('Invalid import method');
    }

    // Encrypt private key
    const encryptedPrivateKey = this.cryptoService.encrypt(
      privateKey,
      process.env.WALLET_ENCRYPTION_KEY || 'default-wallet-key',
    );

    // Create wallet record
    const wallet = await this.walletsService.create({
      walletAddress,
      prosumerId: prosumerId,
      walletName: body.walletName,
      encryptedPrivateKey,
      importMethod: body.importMethod as WalletImportMethod,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });

    return {
      success: true,
      data: {
        walletAddress: wallet.walletAddress,
        walletName: wallet.walletName,
        importMethod: wallet.importMethod,
        createdAt: wallet.createdAt,
      },
      message: 'Wallet created successfully',
    };
  }

  @Get('list')
  async getWallets(@Request() req: User) {
    const prosumerId = req.user.prosumerId;

    const wallets = await this.walletsService.findAll({ prosumerId });

    return {
      success: true,
      data: wallets.map((wallet) => ({
        walletAddress: wallet.walletAddress,
        walletName: wallet.walletName,
        importMethod: wallet.importMethod,
        isActive: wallet.isActive,
        createdAt: wallet.createdAt,
        lastUsedAt: wallet.lastUsedAt,
      })),
    };
  }

  @Get(':walletAddress')
  async getWallet(
    @Param('walletAddress') walletAddress: string,
    @Request() req: User,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify ownership
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
      throw new BadRequestException('Unauthorized: You do not own this wallet');
    }

    const wallet = await this.walletsService.findOne(walletAddress);

    return {
      success: true,
      data: {
        walletAddress: wallet.walletAddress,
        walletName: wallet.walletName,
        importMethod: wallet.importMethod,
        isActive: wallet.isActive,
        createdAt: wallet.createdAt,
        lastUsedAt: wallet.lastUsedAt,
      },
    };
  }

  @Post('idrs-conversion')
  async convertIdrs(@Body() body: IdrsConversionRequest, @Request() req: User) {
    const prosumerId = req.user.prosumerId;

    try {
      // Verify wallet ownership
      const prosumers = await this.prosumersService.findByWalletAddress(
        body.walletAddress,
      );

      if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
        throw new BadRequestException(
          'Unauthorized: You do not own this wallet',
        );
      }

      // Exchange rate: 1 IDR = 1 IDRS (stablecoin)
      const exchangeRate = 1.0;
      const conversionAmount = body.amount * exchangeRate;

      let blockchainTxHash: string | undefined;
      let status = 'PENDING';

      // Perform blockchain transaction based on conversion type
      if (body.conversionType === 'ON_RAMP') {
        // ON_RAMP: IDR → IDRS (Mint IDRS tokens)
        this.logger.log(
          `ON_RAMP: Minting ${conversionAmount} IDRS tokens for wallet ${body.walletAddress}`,
        );

        blockchainTxHash = await this.blockchainService.mintIDRSTokens(
          body.walletAddress,
          conversionAmount,
        );

        // Log transaction
        await this.transactionLogsService.create({
          prosumerId,
          transactionType: TransactionType.TOKEN_MINT,
          description: JSON.stringify({
            message: 'IDRS tokens minted for ON_RAMP conversion',
            walletAddress: body.walletAddress,
            idrAmount: body.amount,
            idrsAmount: conversionAmount,
            exchangeRate,
            txHash: blockchainTxHash,
          }),
          amountPrimary: conversionAmount,
          currencyPrimary: 'IDRS',
          transactionTimestamp: new Date().toISOString(),
        });

        status = 'SUCCESS';
      } else if (body.conversionType === 'OFF_RAMP') {
        // OFF_RAMP: IDRS → IDR (Burn IDRS tokens)
        this.logger.log(
          `OFF_RAMP: Burning ${body.amount} IDRS tokens from wallet ${body.walletAddress}`,
        );

        // Check if user has sufficient IDRS balance
        const idrsBalance = await this.blockchainService.getTokenBalance(
          body.walletAddress,
          process.env.CONTRACT_IDRS_TOKEN!,
        );

        if (idrsBalance < body.amount) {
          throw new BadRequestException(
            `Insufficient IDRS balance. Available: ${idrsBalance}, Required: ${body.amount}`,
          );
        }

        blockchainTxHash = await this.blockchainService.burnIDRSTokens(
          body.walletAddress,
          body.amount,
        );

        // Log transaction
        await this.transactionLogsService.create({
          prosumerId,
          transactionType: TransactionType.TOKEN_BURN,
          description: JSON.stringify({
            message: 'IDRS tokens burned for OFF_RAMP conversion',
            walletAddress: body.walletAddress,
            idrsAmount: body.amount,
            idrAmount: conversionAmount,
            exchangeRate,
            txHash: blockchainTxHash,
          }),
          amountPrimary: body.amount,
          currencyPrimary: 'IDRS',
          transactionTimestamp: new Date().toISOString(),
        });

        status = 'SUCCESS';
      }

      // Create conversion record in database
      const conversion = await this.idrsConversionsService.create({
        prosumerId,
        walletAddress: body.walletAddress,
        conversionType: body.conversionType as ConversionType,
        idrAmount:
          body.conversionType === 'ON_RAMP' ? body.amount : conversionAmount,
        idrsAmount:
          body.conversionType === 'ON_RAMP' ? conversionAmount : body.amount,
        exchangeRate,
        blockchainTxHash: blockchainTxHash || '',
        status,
        simulationNote: blockchainTxHash
          ? `Blockchain transaction: ${blockchainTxHash}`
          : 'No blockchain transaction',
        createdAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
      });

      this.logger.log(
        `${body.conversionType} conversion completed for prosumer ${prosumerId}, txHash: ${blockchainTxHash}`,
      );

      // Get wallet balances after conversion
      // const balanceAfter = await this.getWalletBalances(body.walletAddress);

      const res = {
        walletAddress: conversion.walletAddress,
        conversionType: conversion.conversionType,
        idrAmount: conversion.idrAmount,
        idrsAmount: conversion.idrsAmount,
        exchangeRate: conversion.exchangeRate,
        blockchainTxHash: conversion.blockchainTxHash,
        status: conversion.status,
        createdAt: conversion.createdAt,
        confirmedAt: conversion.confirmedAt,
      };

      return {
        success: true,
        data: {
          ...res,
          // blockchainTxHash,
          // balanceAfter,
        },
        message: `${body.conversionType} conversion completed successfully`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `IDRS conversion failed for prosumer ${prosumerId}: ${errorMessage}`,
        errorStack,
      );

      // Log failed transaction
      await this.transactionLogsService.create({
        prosumerId,
        transactionType:
          body.conversionType === 'ON_RAMP'
            ? TransactionType.TOKEN_MINT
            : TransactionType.TOKEN_BURN,
        description: JSON.stringify({
          message: `${body.conversionType} conversion failed`,
          walletAddress: body.walletAddress,
          amount: body.amount,
          error: errorMessage,
        }),
        amountPrimary: body.amount,
        currencyPrimary: body.conversionType === 'ON_RAMP' ? 'IDR' : 'IDRS',
        transactionTimestamp: new Date().toISOString(),
      });

      // Create failed conversion record
      await this.idrsConversionsService.create({
        prosumerId,
        walletAddress: body.walletAddress,
        conversionType: body.conversionType as ConversionType,
        idrAmount: body.conversionType === 'ON_RAMP' ? body.amount : 0,
        idrsAmount: body.conversionType === 'ON_RAMP' ? 0 : body.amount,
        exchangeRate: 1.0,
        status: 'FAILED',
        simulationNote: `Conversion failed: ${errorMessage}`,
        createdAt: new Date().toISOString(),
      });

      throw new BadRequestException(`IDRS conversion failed: ${errorMessage}`);
    }
  }

  @Get(':walletAddress/conversions')
  async getConversions(
    @Param('walletAddress') walletAddress: string,
    @Request() req: User,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify ownership
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
      throw new BadRequestException('Unauthorized');
    }

    const conversions =
      await this.idrsConversionsService.findByWalletAddress(walletAddress);

    return {
      success: true,
      data: conversions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    };
  }

  @Post(':walletAddress/activate')
  async activateWallet(
    @Param('walletAddress') walletAddress: string,
    @Request() req: User,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify ownership
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
      throw new BadRequestException('Unauthorized');
    }

    // Get current wallet data and update
    const currentWallet = await this.walletsService.findOne(walletAddress);
    await this.walletsService.update(walletAddress, {
      walletAddress: currentWallet.walletAddress,
      prosumerId: currentWallet.prosumerId,
      walletName: currentWallet.walletName,
      encryptedPrivateKey: currentWallet.encryptedPrivateKey,
      createdAt: currentWallet.createdAt.toISOString(),
      importMethod: currentWallet.importMethod,
      isActive: true,
      lastUsedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Wallet activated successfully',
    };
  }

  // Change Settlement Primary Wallet
  // This endpoint allows a prosumer to change their primary wallet for settlement purposes.
  // It verifies ownership of the wallet and updates the primary wallet in the prosumer's profile
  @Post(':walletAddress/primary')
  async changePrimaryWallet(
    @Param('walletAddress') walletAddress: string,
    @Request() req: User,
  ) {
    const prosumerId = req.user.prosumerId;
    // Verify ownership
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
      throw new BadRequestException('Unauthorized');
    }

    // Update primary wallet in prosumer's profile
    await this.prosumersService.updatePrimaryWalletAddress(
      prosumerId,
      walletAddress,
    );

    return {
      success: true,
      message: 'Primary wallet changed successfully',
    };
  }

  @Post(':walletAddress/deactivate')
  async deactivateWallet(
    @Param('walletAddress') walletAddress: string,
    @Request() req: User,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify ownership
    const currentWallet = await this.walletsService.findOne(walletAddress);
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
      throw new BadRequestException('Unauthorized');
    }

    await this.walletsService.update(walletAddress, {
      walletAddress: currentWallet.walletAddress,
      prosumerId: currentWallet.prosumerId,
      walletName: currentWallet.walletName,
      encryptedPrivateKey: currentWallet.encryptedPrivateKey,
      createdAt: currentWallet.createdAt.toISOString(),
      importMethod: currentWallet.importMethod,
      isActive: false,
      lastUsedAt:
        currentWallet.lastUsedAt?.toISOString() || new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Wallet deactivated successfully',
    };
  }

  @Get(':walletAddress/balances')
  async getWalletBalances(@Param('walletAddress') walletAddress: string) {
    try {
      this.logger.log(`Fetched balances for wallet ${walletAddress}`);
      const [etkBalance, idrsBalance] = await Promise.all([
        // this.blockchainService.getEthBalance(walletAddress),
        this.blockchainService.getTokenBalance(
          walletAddress,
          process.env.CONTRACT_ETK_TOKEN!,
        ),
        this.blockchainService.getTokenBalance(
          walletAddress,
          process.env.CONTRACT_IDRS_TOKEN!,
        ),
      ]);

      return {
        ETK: etkBalance,
        IDRS: idrsBalance,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch balances for wallet ${walletAddress}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        ETK: 0,
        IDRS: 0,
      };
    }
  }
}
