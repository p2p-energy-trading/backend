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
import { BlockchainService } from '../../services/blockchain/blockchain.service';
import { WalletsService } from '../../models/wallet/wallet.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { AuthenticatedUser } from '../../common/interfaces';
import { ResponseFormatter } from '../../common/response-formatter';
import {
  ConvertIDRSDto,
  ConvertIDRSResponseDto,
  NetworkInfoResponseDto,
  ContractAddressesResponseDto,
} from '../../common/dto/blockchain.dto';

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
    type: ConvertIDRSDto,
    description: 'IDRS conversion request',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversion successful',
    type: ConvertIDRSResponseDto,
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
    @Body() body: ConvertIDRSDto,
  ) {
    const { walletAddress, amount, direction } = body;
    const userId = req.user.userId;

    // Verify wallet ownership
    const wallets = await this.walletsService.findAll({ userId });
    const wallet = wallets.find(
      (w: { walletAddress: string }) => w.walletAddress === walletAddress,
    );

    if (!wallet) {
      throw new BadRequestException(
        'Wallet not found or does not belong to this prosumer',
      );
    }

    try {
      if (String(direction) === 'on-ramp') {
        // IDR → IDRS (mint IDRS tokens)
        const txHash = await this.blockchainService.mintIDRSTokens(
          walletAddress,
          amount,
        );

        this.logger.log(
          `On-ramp successful: ${amount} IDRS minted to ${walletAddress}`,
        );

        return ResponseFormatter.success(
          {
            direction: 'on-ramp',
            amount,
            walletAddress,
            transactionHash: txHash,
            timestamp: new Date().toISOString(),
          },
          `On-ramp successful: ${amount} IDRS minted`,
        );
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

        return ResponseFormatter.success(
          {
            direction: 'off-ramp',
            amount,
            walletAddress,
            transactionHash: txHash,
            timestamp: new Date().toISOString(),
          },
          `Off-ramp successful: ${amount} IDRS burned`,
        );
      }
    } catch (error) {
      this.logger.error(
        `IDRS conversion failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return ResponseFormatter.error(
        'Conversion failed',
        error instanceof Error ? error.message : 'Unknown error',
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
    type: NetworkInfoResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiBearerAuth()
  getNetworkInfo() {
    return ResponseFormatter.success(
      {
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://localhost:8545',
        networkName: 'Private Ethereum Network',
        connected: true,
      },
      'Network information retrieved successfully',
    );
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
    type: ContractAddressesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiBearerAuth()
  getContractAddresses() {
    return ResponseFormatter.success(
      {
        etkToken: process.env.CONTRACT_ETK_TOKEN || null,
        idrsToken: process.env.CONTRACT_IDRS_TOKEN || null,
        market: process.env.CONTRACT_MARKET || null,
        energyConverter: process.env.CONTRACT_ENERGY_CONVERTER || null,
      },
      'Contract addresses retrieved successfully',
    );
  }
}
