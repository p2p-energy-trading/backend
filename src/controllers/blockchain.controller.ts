import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { BlockchainService } from '../services/blockchain.service';
import { WalletsService } from '../models/Wallets/Wallets.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { AuthenticatedUser } from '../common/interfaces';

interface ConvertIDRSRequest {
  walletAddress: string;
  amount: number;
  direction: 'on-ramp' | 'off-ramp';
}

/**
 * Blockchain Controller
 * Handles blockchain-specific operations including IDRS conversion
 * Extracted from DashboardController for better organization
 */
@ApiTags('Blockchain')
@Controller('blockchain')
@UseGuards(JwtAuthGuard)
export class BlockchainController {
  private readonly logger = new Logger(BlockchainController.name);

  constructor(
    private blockchainService: BlockchainService,
    private walletsService: WalletsService,
  ) {}

  /**
   * Convert between IDR and IDRS (simulated on-ramp/off-ramp)
   */
  @Post('idrs/convert')
  @ApiOperation({
    summary: 'Convert IDR to IDRS or vice versa',
    description:
      'Simulated on-ramp (IDR → IDRS) or off-ramp (IDRS → IDR) conversion for testing purposes. This is a simulation and does not involve real fiat currency.',
  })
  @ApiBody({
    description: 'IDRS conversion request',
    schema: {
      type: 'object',
      required: ['walletAddress', 'amount', 'direction'],
      properties: {
        walletAddress: {
          type: 'string',
          description: 'Wallet address to receive/send IDRS',
          example: '0x1234567890123456789012345678901234567890',
        },
        amount: {
          type: 'number',
          description:
            'Amount to convert (in IDR for on-ramp, IDRS for off-ramp)',
          example: 100000,
          minimum: 0,
        },
        direction: {
          type: 'string',
          enum: ['on-ramp', 'off-ramp'],
          description:
            'Conversion direction: on-ramp (IDR → IDRS), off-ramp (IDRS → IDR)',
          example: 'on-ramp',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Conversion successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'On-ramp successful: 100000 IDRS minted',
        },
        data: {
          type: 'object',
          properties: {
            direction: { type: 'string', example: 'on-ramp' },
            amount: { type: 'number', example: 100000 },
            walletAddress: {
              type: 'string',
              example: '0x1234567890123456789012345678901234567890',
            },
            transactionHash: {
              type: 'string',
              example:
                '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            },
            timestamp: { type: 'string', example: '2024-01-01T12:00:00.000Z' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters or insufficient balance',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiBearerAuth()
  async convertIDRS(
    @Request() req: AuthenticatedUser,
    @Body() body: ConvertIDRSRequest,
  ) {
    const { walletAddress, amount, direction } = body;
    const prosumerId = req.user.prosumerId;

    // Validate inputs
    if (!walletAddress || !amount || !direction) {
      throw new BadRequestException('Missing required fields');
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (!['on-ramp', 'off-ramp'].includes(direction)) {
      throw new BadRequestException(
        'Direction must be either "on-ramp" or "off-ramp"',
      );
    }

    // Verify wallet ownership
    const wallets = await this.walletsService.findAll({ prosumerId });
    const wallet = wallets.find(
      (w: { walletAddress: string }) => w.walletAddress === walletAddress,
    );

    if (!wallet) {
      throw new BadRequestException(
        'Wallet not found or does not belong to this prosumer',
      );
    }

    try {
      if (direction === 'on-ramp') {
        // IDR → IDRS (mint IDRS tokens)
        const txHash = await this.blockchainService.mintIDRSTokens(
          walletAddress,
          amount,
        );

        this.logger.log(
          `On-ramp successful: ${amount} IDRS minted to ${walletAddress}`,
        );

        return {
          success: true,
          message: `On-ramp successful: ${amount} IDRS minted`,
          data: {
            direction: 'on-ramp',
            amount,
            walletAddress,
            transactionHash: txHash,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        // IDRS → IDR (burn IDRS tokens)
        // First check if wallet has enough IDRS balance
        const idrsBalance = await this.blockchainService.getTokenBalance(
          walletAddress,
          process.env.CONTRACT_IDRS_TOKEN!,
        );

        if (idrsBalance < amount) {
          throw new BadRequestException(
            `Insufficient IDRS balance. Available: ${idrsBalance}, Required: ${amount}`,
          );
        }

        const txHash = await this.blockchainService.burnIDRSTokens(
          walletAddress,
          amount,
        );

        this.logger.log(
          `Off-ramp successful: ${amount} IDRS burned from ${walletAddress}`,
        );

        return {
          success: true,
          message: `Off-ramp successful: ${amount} IDRS burned`,
          data: {
            direction: 'off-ramp',
            amount,
            walletAddress,
            transactionHash: txHash,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      this.logger.error(
        `IDRS conversion failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException(
        `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get blockchain network information
   */
  @Get('network')
  @ApiOperation({
    summary: 'Get Blockchain Network Information',
    description:
      'Get information about the connected blockchain network including RPC URL',
  })
  @ApiResponse({
    status: 200,
    description: 'Network information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            rpcUrl: { type: 'string', example: 'http://localhost:8545' },
            networkName: {
              type: 'string',
              example: 'Private Ethereum Network',
            },
            connected: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiBearerAuth()
  async getNetworkInfo(@Request() req: AuthenticatedUser) {
    return {
      success: true,
      data: {
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://localhost:8545',
        networkName: 'Private Ethereum Network',
        connected: true,
      },
    };
  }

  /**
   * Get contract addresses
   */
  @Get('contracts')
  @ApiOperation({
    summary: 'Get Smart Contract Addresses',
    description:
      'Get the addresses of deployed smart contracts (ETK Token, IDRS Token, Market, Energy Converter)',
  })
  @ApiResponse({
    status: 200,
    description: 'Contract addresses retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            etkToken: {
              type: 'string',
              example: '0x1234567890123456789012345678901234567890',
            },
            idrsToken: {
              type: 'string',
              example: '0x2345678901234567890123456789012345678901',
            },
            market: {
              type: 'string',
              example: '0x3456789012345678901234567890123456789012',
            },
            energyConverter: {
              type: 'string',
              example: '0x4567890123456789012345678901234567890123',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiBearerAuth()
  async getContractAddresses(@Request() req: AuthenticatedUser) {
    return {
      success: true,
      data: {
        etkToken: process.env.CONTRACT_ETK_TOKEN || null,
        idrsToken: process.env.CONTRACT_IDRS_TOKEN || null,
        market: process.env.CONTRACT_MARKET || null,
        energyConverter: process.env.CONTRACT_ENERGY_CONVERTER || null,
      },
    };
  }
}
