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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ethers } from 'ethers';
import { WalletsService } from '../../models/wallet/wallet.service';
import { IdrsConversionsService } from '../../models/idrsConversion/idrsConversion.service';
import { CryptoService } from '../../common/crypto.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { ResponseFormatter } from '../../common/response-formatter';
import { TransactionType } from '../../common/enums';
import { UsersService } from 'src/models/user/user.service';
import { BlockchainService } from '../../services/blockchain/blockchain.service';
import { TransactionLogsService } from '../../models/transactionLog/transactionLog.service';
import {
  CreateWalletDto,
  CreateWalletResponseDto,
  IdrsConversionDto,
  IdrsConversionResponseDto,
  WalletInfoResponseDto,
  WalletListResponseDto,
  WalletBalanceResponseDto,
  IdrsConversionListResponseDto,
  WalletStatusResponseDto,
  IdrsTransactionHistoryResponseDto,
  TokenMintingHistoryResponseDto,
} from '../../common/dto/wallet.dto';
// import { create } from 'domain';

interface User extends Request {
  user: {
    userId: string;
  };
}

@ApiTags('Wallet')
@ApiBearerAuth('JWT-auth')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(
    private walletsService: WalletsService,
    private idrsConversionsService: IdrsConversionsService,
    private cryptoService: CryptoService,
    private prosumersService: UsersService,
    private blockchainService: BlockchainService,
    private transactionLogsService: TransactionLogsService,
  ) {}

  /**
   * Safely format transaction data with proper type safety
   */
  private formatTransactionData(
    tx: any,
    scope: string,
  ): {
    logId: string | number | null;
    transactionType: string | null;
    description: string | null;
    details: Record<string, any>;
    amountPrimary: string | number | null;
    currencyPrimary: string | null;
    amountSecondary: string | number | null;
    currencySecondary: string | null;
    blockchainTxHash: string | null;
    transactionTimestamp: string | null;
    userId?: string;
  } {
    const txData = tx as {
      logId?: string | number;
      transactionType?: string;
      description?: string;
      amountPrimary?: string | number;
      currencyPrimary?: string;
      amountSecondary?: string | number;
      currencySecondary?: string;
      transactionTimestamp?: string;
      userId?: string;
      blockchainTxHash?: string;
    };

    let parsedDescription: { message?: string; [key: string]: any } = {};
    try {
      const desc = txData.description || '{}';
      if (typeof desc === 'string') {
        parsedDescription = JSON.parse(desc) as {
          message?: string;
          [key: string]: any;
        };
      }
    } catch {
      parsedDescription = { message: txData.description };
    }

    return {
      logId: txData.logId || null,
      transactionType: txData.transactionType || null,
      description:
        (parsedDescription.message as string) || txData.description || null,
      details: parsedDescription, // Show full details for all scopes
      amountPrimary: txData.amountPrimary || null,
      currencyPrimary: txData.currencyPrimary || null,
      amountSecondary: txData.amountSecondary || null,
      currencySecondary: txData.currencySecondary || null,
      blockchainTxHash: txData.blockchainTxHash || null,
      transactionTimestamp: txData.transactionTimestamp || null,
      ...(scope !== 'own' && { userId: txData.userId }),
    };
  }

  @Post('create')
  @ApiOperation({
    summary: 'Create or import a wallet',
    description:
      'Create a new wallet (generate) or import existing wallet using private key or mnemonic',
  })
  @ApiBody({ type: CreateWalletDto })
  @ApiResponse({
    status: 201,
    description: 'Wallet created successfully',
    type: CreateWalletResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters or missing required fields',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Wallet already exists',
  })
  async createWallet(@Body() body: CreateWalletDto, @Request() req: User) {
    const userId = req.user.userId;

    let walletAddress: string;
    let privateKey: string;
    if (String(body.importMethod) === 'GENERATED') {
      // Generate new wallet
      const wallet = ethers.Wallet.createRandom();
      walletAddress = wallet.address;
      privateKey = wallet.privateKey;
    } else if (String(body.importMethod) === 'IMPORTED_PRIVATE_KEY') {
      if (!body.privateKey) {
        throw new BadRequestException('Private key is required for import');
      }
      const wallet = new ethers.Wallet(body.privateKey);
      walletAddress = wallet.address;
      privateKey = body.privateKey;
    } else if (String(body.importMethod) === 'IMPORTED_MNEMONIC') {
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
      userId: userId,
      walletName: body.walletName,
      encryptedPrivateKey,
      importMethod: body.importMethod,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });

    return ResponseFormatter.success(
      {
        walletAddress: wallet.walletAddress,
        walletName: wallet.walletName,
        importMethod: wallet.importMethod,
        createdAt: wallet.createdAt,
      },
      'Wallet created successfully',
    );
  }

  @Get('list')
  @ApiOperation({
    summary: 'Get all wallets',
    description: 'Retrieve all wallets owned by the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallets retrieved successfully',
    type: WalletListResponseDto,
  })
  async getWallets(@Request() req: User) {
    const userId = req.user.userId;

    const wallets = await this.walletsService.findAll({ userId });

    return ResponseFormatter.successWithCount(
      wallets.map((wallet) => ({
        walletAddress: wallet.walletAddress,
        walletName: wallet.walletName,
        importMethod: wallet.importMethod,
        isActive: wallet.isActive,
        createdAt: wallet.createdAt,
        lastUsedAt: wallet.lastUsedAt,
      })),
      'Wallets retrieved successfully',
    );
  }

  @Get(':walletAddress')
  @ApiOperation({
    summary: 'Get wallet details',
    description: 'Retrieve detailed information for a specific wallet',
  })
  @ApiParam({
    name: 'walletAddress',
    description: 'Ethereum wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet details retrieved successfully',
    type: WalletInfoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unauthorized - wallet does not belong to user',
  })
  async getWallet(
    @Param('walletAddress') walletAddress: string,
    @Request() req: User,
  ) {
    const userId = req.user.userId;

    // Verify ownership
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.userId === userId)) {
      throw new BadRequestException('Unauthorized: You do not own this wallet');
    }

    const wallet = await this.walletsService.findOne(walletAddress);

    return ResponseFormatter.success(
      {
        walletAddress: wallet.walletAddress,
        walletName: wallet.walletName,
        importMethod: wallet.importMethod,
        isActive: wallet.isActive,
        createdAt: wallet.createdAt,
        lastUsedAt: wallet.lastUsedAt,
      },
      'Wallet details retrieved successfully',
    );
  }

  @Post('idrs-conversion')
  @ApiOperation({
    summary: 'Convert between IDR and IDRS tokens',
    description:
      'Perform ON_RAMP (IDR to IDRS) or OFF_RAMP (IDRS to IDR) conversion',
  })
  @ApiBody({ type: IdrsConversionDto })
  @ApiResponse({
    status: 201,
    description: 'Conversion completed successfully',
    type: IdrsConversionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters or insufficient balance',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Wallet does not belong to user',
  })
  async convertIdrs(@Body() body: IdrsConversionDto, @Request() req: User) {
    const userId = req.user.userId;

    try {
      // Verify wallet ownership
      const prosumers = await this.prosumersService.findByWalletAddress(
        body.walletAddress,
      );

      if (!prosumers.find((p) => p.userId === userId)) {
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
      if (String(body.conversionType) === 'ON_RAMP') {
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
          userId,
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
      } else if (String(body.conversionType) === 'OFF_RAMP') {
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
          userId,
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
        userId,
        walletAddress: body.walletAddress,
        conversionType: body.conversionType,
        idrAmount:
          String(body.conversionType) === 'ON_RAMP'
            ? body.amount
            : conversionAmount,
        idrsAmount:
          String(body.conversionType) === 'ON_RAMP'
            ? conversionAmount
            : body.amount,
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
        `${body.conversionType} conversion completed for prosumer ${userId}, txHash: ${blockchainTxHash}`,
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

      return ResponseFormatter.success(
        {
          ...res,
          // blockchainTxHash,
          // balanceAfter,
        },
        `${body.conversionType} conversion completed successfully`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `IDRS conversion failed for prosumer ${userId}: ${errorMessage}`,
        errorStack,
      );

      // Log failed transaction
      await this.transactionLogsService.create({
        userId,
        transactionType:
          String(body.conversionType) === 'ON_RAMP'
            ? TransactionType.TOKEN_MINT
            : TransactionType.TOKEN_BURN,
        description: JSON.stringify({
          message: `${body.conversionType} conversion failed`,
          walletAddress: body.walletAddress,
          amount: body.amount,
          error: errorMessage,
        }),
        amountPrimary: body.amount,
        currencyPrimary:
          String(body.conversionType) === 'ON_RAMP' ? 'IDR' : 'IDRS',
        transactionTimestamp: new Date().toISOString(),
      });

      // Create failed conversion record
      await this.idrsConversionsService.create({
        userId,
        walletAddress: body.walletAddress,
        conversionType: body.conversionType,
        idrAmount: String(body.conversionType) === 'ON_RAMP' ? body.amount : 0,
        idrsAmount: String(body.conversionType) === 'ON_RAMP' ? 0 : body.amount,
        exchangeRate: 1.0,
        status: 'FAILED',
        simulationNote: `Conversion failed: ${errorMessage}`,
        createdAt: new Date().toISOString(),
      });

      throw new BadRequestException(`IDRS conversion failed: ${errorMessage}`);
    }
  }

  @Get(':walletAddress/conversions')
  @ApiOperation({
    summary: 'Get IDRS conversion history',
    description: 'Retrieve all IDRS conversions for a specific wallet',
  })
  @ApiParam({
    name: 'walletAddress',
    description: 'Ethereum wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversions retrieved successfully',
    type: IdrsConversionListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unauthorized',
  })
  async getConversions(
    @Param('walletAddress') walletAddress: string,
    @Request() req: User,
  ) {
    const userId = req.user.userId;

    // Verify ownership
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.userId === userId)) {
      throw new BadRequestException('Unauthorized');
    }

    const conversions =
      await this.idrsConversionsService.findByWalletAddress(walletAddress);

    return ResponseFormatter.successWithCount(
      conversions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      'Conversions retrieved successfully',
    );
  }

  @Post(':walletAddress/activate')
  @ApiOperation({
    summary: 'Activate wallet',
    description: 'Activate a previously deactivated wallet',
  })
  @ApiParam({
    name: 'walletAddress',
    description: 'Ethereum wallet address to activate',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet activated successfully',
    type: WalletStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unauthorized or wallet not found',
  })
  async activateWallet(
    @Param('walletAddress') walletAddress: string,
    @Request() req: User,
  ) {
    const userId = req.user.userId;

    // Verify ownership
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.userId === userId)) {
      throw new BadRequestException('Unauthorized');
    }

    // Get current wallet data and update
    const currentWallet = await this.walletsService.findOne(walletAddress);
    await this.walletsService.update(walletAddress, {
      walletAddress: currentWallet.walletAddress,
      userId: currentWallet.userId,
      walletName: currentWallet.walletName,
      encryptedPrivateKey: currentWallet.encryptedPrivateKey,
      createdAt: currentWallet.createdAt.toISOString(),
      importMethod: currentWallet.importMethod,
      isActive: true,
      lastUsedAt: new Date().toISOString(),
    });

    return ResponseFormatter.success(
      { walletAddress, isActive: true },
      'Wallet activated successfully',
    );
  }

  // Change Settlement Primary Wallet
  // This endpoint allows a user to change their primary wallet for settlement purposes.
  // It verifies ownership of the wallet and updates the primary wallet in the prosumer's profile
  @Post(':walletAddress/set-primary')
  @ApiOperation({
    summary: 'Set as primary wallet',
    description: 'Set a wallet as the primary wallet for the user',
  })
  @ApiParam({
    name: 'walletAddress',
    description: 'Ethereum wallet address to set as primary',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiResponse({
    status: 200,
    description: 'Primary wallet updated successfully',
    type: WalletStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unauthorized or wallet not found',
  })
  async setPrimaryWallet(
    @Param('walletAddress') walletAddress: string,
    @Request() req: User,
  ) {
    const userId = req.user.userId;
    // Verify ownership
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.userId === userId)) {
      throw new BadRequestException('Unauthorized');
    }

    // Update primary wallet in prosumer's profile
    await this.prosumersService.updatePrimaryWalletAddress(
      userId,
      walletAddress,
    );

    return ResponseFormatter.success(
      { walletAddress, isPrimary: true },
      'Primary wallet changed successfully',
    );
  }

  @Post(':walletAddress/deactivate')
  @ApiOperation({
    summary: 'Deactivate wallet',
    description: 'Deactivate a wallet (cannot be used for transactions)',
  })
  @ApiParam({
    name: 'walletAddress',
    description: 'Ethereum wallet address to deactivate',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet deactivated successfully',
    type: WalletStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unauthorized or wallet not found',
  })
  async deactivateWallet(
    @Param('walletAddress') walletAddress: string,
    @Request() req: User,
  ) {
    const userId = req.user.userId;

    // Verify ownership
    const currentWallet = await this.walletsService.findOne(walletAddress);
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.userId === userId)) {
      throw new BadRequestException('Unauthorized');
    }

    await this.walletsService.update(walletAddress, {
      walletAddress: currentWallet.walletAddress,
      userId: currentWallet.userId,
      walletName: currentWallet.walletName,
      encryptedPrivateKey: currentWallet.encryptedPrivateKey,
      createdAt: currentWallet.createdAt.toISOString(),
      importMethod: currentWallet.importMethod,
      isActive: false,
      lastUsedAt:
        currentWallet.lastUsedAt?.toISOString() || new Date().toISOString(),
    });

    return ResponseFormatter.success(
      { walletAddress, isActive: false },
      'Wallet deactivated successfully',
    );
  }

  @Get(':walletAddress/balances')
  @ApiOperation({
    summary: 'Get wallet token balances',
    description: 'Retrieve ETK and IDRS token balances for a specific wallet',
  })
  @ApiParam({
    name: 'walletAddress',
    description: 'Ethereum wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiResponse({
    status: 200,
    description: 'Balances retrieved successfully',
    type: WalletBalanceResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found',
  })
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

      return ResponseFormatter.success(
        {
          ETK: etkBalance,
          IDRS: idrsBalance,
        },
        `Balances fetched successfully for wallet ${walletAddress}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to fetch balances for wallet ${walletAddress}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return ResponseFormatter.error(
        `Failed to fetch balances for wallet ${walletAddress}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('transactions/idrs')
  @ApiOperation({
    summary: 'Get IDRS transaction history',
    description: 'Retrieve transaction history for IDRS conversions',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of transactions to return',
    example: '50',
  })
  @ApiQuery({
    name: 'transactionType',
    required: false,
    description: 'Filter by transaction type',
    example: 'IDRS_CONVERSION',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['own', 'public', 'all'],
    description: 'Data scope: own (your transactions), public, all (admin)',
    example: 'own',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully',
    type: IdrsTransactionHistoryResponseDto,
  })
  async getIdrsTransactionHistory(
    @Request() req: User,
    @Query('limit') limit?: string,
    @Query('transactionType') transactionType?: string,
    @Query('scope') scope?: 'own' | 'public' | 'all',
  ) {
    const userId = req.user.userId;

    try {
      const maxLimit = limit ? parseInt(limit) : 50;
      const validScope = scope || 'own'; // Default to 'own' if not specified

      // Validate scope parameter
      if (!['own', 'public', 'all'].includes(validScope)) {
        throw new BadRequestException(
          'Invalid scope parameter. Must be one of: own, public, all',
        );
      }

      // Log admin scope access
      if (validScope === 'all') {
        this.logger.warn(
          `User ${userId} requested 'all' scope for IDRS transaction history`,
        );
      }

      let transactions: any[] = [];

      if (validScope === 'public') {
        // Get all public IDRS transactions (no anonymization needed)
        transactions = await this.transactionLogsService.findAll({
          currencyPrimary: 'IDRS',
          transactionType: transactionType || undefined,
        });
      } else if (validScope === 'all') {
        // Get all IDRS transactions (admin view)
        transactions = await this.transactionLogsService.findAll({
          currencyPrimary: 'IDRS',
          transactionType: transactionType || undefined,
        });
      } else {
        // Default: Get only user's own IDRS transactions
        transactions = await this.transactionLogsService.findAll({
          userId,
          currencyPrimary: 'IDRS',
          transactionType: transactionType || undefined,
        });
      }

      // Format the response to match expected structure
      const formattedTransactions = transactions.map((tx: any) =>
        this.formatTransactionData(tx, validScope),
      );

      // Sort by timestamp (newest first) and limit results
      const sortedTransactions = formattedTransactions
        .sort((a, b) => {
          const timestampA = a?.transactionTimestamp
            ? new Date(a.transactionTimestamp).getTime()
            : 0;
          const timestampB = b?.transactionTimestamp
            ? new Date(b.transactionTimestamp).getTime()
            : 0;
          return timestampB - timestampA;
        })
        .slice(0, maxLimit);

      return ResponseFormatter.successWithMetadata(
        sortedTransactions,
        {
          scope: validScope,
          userId: validScope === 'own' ? userId : 'multiple',
          currencyPrimary: 'IDRS',
          transactionType: transactionType || 'all',
          limit: maxLimit,
          count: sortedTransactions.length,
        },
        `IDRS transaction history fetched successfully (${validScope} scope)`,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error fetching IDRS transaction history for prosumer ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return ResponseFormatter.error(
        'Failed to fetch IDRS transaction history',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('transactions/token-minting')
  @ApiOperation({
    summary: 'Get token minting/burning history',
    description:
      'Retrieve history of ETK token minting and burning from energy settlements',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of transactions to return',
    example: '50',
  })
  @ApiQuery({
    name: 'tokenType',
    required: false,
    description: 'Filter by token type (ETK or IDRS)',
    example: 'ETK',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['own', 'public', 'all'],
    description: 'Data scope: own (your transactions), public, all (admin)',
    example: 'own',
  })
  @ApiResponse({
    status: 200,
    description: 'Token minting history retrieved successfully',
    type: TokenMintingHistoryResponseDto,
  })
  async getTokenMintingHistory(
    @Request() req: User,
    @Query('limit') limit?: string,
    @Query('tokenType') tokenType?: string, // 'ETK' or 'IDRS'
    @Query('scope') scope?: 'own' | 'public' | 'all',
  ) {
    const userId = req.user.userId;

    try {
      const maxLimit = limit ? parseInt(limit) : 50;
      const validScope = scope || 'own'; // Default to 'own' if not specified

      // Validate scope parameter
      if (!['own', 'public', 'all'].includes(validScope)) {
        throw new BadRequestException(
          'Invalid scope parameter. Must be one of: own, public, all',
        );
      }

      // Log admin scope access
      if (validScope === 'all') {
        this.logger.warn(
          `User ${userId} requested 'all' scope for token minting history`,
        );
      }

      let mintTransactions: any[] = [];
      let burnTransactions: any[] = [];

      // Build query parameters based on scope
      const baseQueryParams: {
        userId?: string;
        currencyPrimary?: string;
        transactionType?: string;
      } = {};

      // Add userId only for 'own' scope
      if (validScope === 'own') {
        baseQueryParams.userId = userId;
      }

      // Filter by token type if specified
      if (tokenType) {
        baseQueryParams.currencyPrimary = tokenType.toUpperCase();
      }

      // Get both minting and burning transactions
      [mintTransactions, burnTransactions] = await Promise.all([
        this.transactionLogsService.findAll({
          ...baseQueryParams,
          transactionType: 'TOKEN_MINT',
        }),
        this.transactionLogsService.findAll({
          ...baseQueryParams,
          transactionType: 'TOKEN_BURN',
        }),
      ]);

      // Combine transactions
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const allTransactions = [...mintTransactions, ...burnTransactions];

      // Format the response using the helper function
      const formattedTransactions = allTransactions.map((tx: any) =>
        this.formatTransactionData(tx, validScope),
      );

      // Sort by timestamp (newest first) and limit results
      const sortedTransactions = formattedTransactions
        .sort((a, b) => {
          const timestampA = a?.transactionTimestamp
            ? new Date(a.transactionTimestamp).getTime()
            : 0;
          const timestampB = b?.transactionTimestamp
            ? new Date(b.transactionTimestamp).getTime()
            : 0;
          return timestampB - timestampA;
        })
        .slice(0, maxLimit);

      return ResponseFormatter.successWithMetadata(
        sortedTransactions,
        {
          scope: validScope,
          userId: validScope === 'own' ? userId : 'multiple',
          tokenType: tokenType || 'all',
          limit: maxLimit,
          count: sortedTransactions.length,
          transactionTypes: ['TOKEN_MINT', 'TOKEN_BURN'],
        },
        `Token minting/burning history fetched successfully (${validScope} scope)`,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error fetching token minting history for prosumer ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return ResponseFormatter.error(
        'Failed to fetch token minting/burning history',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
