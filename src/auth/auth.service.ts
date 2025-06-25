import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { ProsumersService } from '../modules/Prosumers/Prosumers.service';
import { WalletsService } from '../modules/Wallets/Wallets.service';
import { CryptoService } from '../common/crypto.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { TransactionLogsService } from '../modules/TransactionLogs/TransactionLogs.service';
import { TransactionType, WalletImportMethod } from '../common/enums';
import { BlacklistService } from 'src/modules/TokenBlacklist/TokenBlacklist.service';
import { BlacklistReason } from 'src/modules/TokenBlacklist/entities/TokenBlacklist.entity';
import { Request } from 'express';

interface ValidatedProsumer {
  prosumerId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prosumersService: ProsumersService,
    private walletsService: WalletsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cryptoService: CryptoService,
    private transactionLogsService: TransactionLogsService,
    private blacklistService: BlacklistService,
  ) {}

  async validateProsumer(
    email: string,
    password: string,
  ): Promise<ValidatedProsumer | null> {
    try {
      // Find prosumer by email
      const prosumers = await this.prosumersService.findAll({ email });
      const prosumer = prosumers[0];

      this.logger.debug(
        `Validating prosumer with email ${email}, found: ${prosumer ? 'yes' : 'no'}`,
      );

      // generate hash
      // const hashedPassword = await this.cryptoService.hashPassword('password');
      // this.logger.debug(
      //   `Hashed password for prosumer with email ${email}: ${hashedPassword}`,
      // );

      // const encryptedWalletPrivateKey = this.cryptoService.encrypt(
      //   '3a4e16c3706eec96f018394580ee4b5f267c3a55717dc5c6e45c821d899a3407',
      //   this.configService.get('WALLET_ENCRYPTION_KEY') || 'default-wallet-key',
      // );
      // this.logger.debug(
      //   `Encrypted wallet private key for prosumer with email ${email}: ${encryptedWalletPrivateKey}`,
      // );

      if (!prosumer) {
        return null;
      }

      // Verify password
      const isPasswordValid = await this.cryptoService.verifyPassword(
        password,
        prosumer.passwordHash,
      );
      if (!isPasswordValid) {
        return null;
      }

      // Return prosumer without password hash
      const result = {
        prosumerId: prosumer.prosumerId,
        email: prosumer.email,
        name: prosumer.name,
        createdAt: prosumer.createdAt.toISOString(),
        updatedAt: prosumer.updatedAt.toISOString(),
      };

      return result;
    } catch (error) {
      this.logger.error(
        `Error validating prosumer with email ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  // Generate hanya access token saja
  generateTokens(prosumer: ValidatedProsumer) {
    const payload = {
      prosumerId: prosumer.prosumerId,
      email: prosumer.email,
      sub: prosumer.prosumerId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      prosumer: {
        prosumerId: prosumer.prosumerId,
        email: prosumer.email,
        name: prosumer.name,
      },
    };
  }

  // Remove refresh token functionality
  async login(loginDto: LoginDto) {
    const prosumer = await this.validateProsumer(
      loginDto.email,
      loginDto.password,
    );
    if (!prosumer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(prosumer);
  }

  async register(registerDto: RegisterDto) {
    try {
      // Check if prosumer already exists
      const existingProsumers = await this.prosumersService.findAll({
        email: registerDto.email,
      });
      if (existingProsumers.length > 0) {
        throw new BadRequestException('Email already registered');
      }

      // Hash password
      const hashedPassword = await this.cryptoService.hashPassword(
        registerDto.password,
      );

      // Generate prosumer ID
      const prosumerId = `prosumer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create prosumer
      const prosumer = await this.prosumersService.create({
        prosumerId,
        email: registerDto.email,
        passwordHash: hashedPassword,
        name: registerDto.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Generate wallet for the prosumer
      const wallet = await this.generateWalletForProsumer(
        prosumer.prosumerId,
        `${registerDto.name}'s Wallet`,
      );

      // Log registration
      await this.transactionLogsService.create({
        prosumerId: prosumer.prosumerId,
        transactionType: TransactionType.WALLET_CREATED,
        description: JSON.stringify({
          message: 'Prosumer registered and wallet created',
          walletAddress: wallet.walletAddress,
        }),
        amountPrimary: 0,
        currencyPrimary: 'ETK',
        transactionTimestamp: new Date().toISOString(),
      });

      // Return login response
      return this.login({
        email: registerDto.email,
        password: registerDto.password,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Registration failed');
    }
  }

  private async generateWalletForProsumer(
    prosumerId: string,
    walletName: string,
  ) {
    // Generate Ethereum wallet
    const wallet = ethers.Wallet.createRandom();

    // Encrypt private key
    const encryptedPrivateKey = this.cryptoService.encrypt(
      wallet.privateKey,
      this.configService.get('WALLET_ENCRYPTION_KEY') || 'default-wallet-key',
    );

    // Create wallet record
    return this.walletsService.create({
      walletAddress: wallet.address,
      prosumerId: prosumerId,
      walletName,
      encryptedPrivateKey,
      importMethod: WalletImportMethod.GENERATED,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });
  }

  async getProfile(prosumerId: string) {
    try {
      const prosumer = await this.prosumersService.findOne(prosumerId);
      // const { passwordHash, ...profile } = prosumer;
      const prosumerWithoutPassword = {
        prosumerId: prosumer.prosumerId,
        email: prosumer.email,
        name: prosumer.name,
        createdAt: prosumer.createdAt.toISOString(),
        updatedAt: prosumer.updatedAt.toISOString(),
      };

      // Get associated wallets
      const wallets = await this.walletsService.findByProsumerId(prosumerId);

      return {
        prosumerWithoutPassword,
        wallets: wallets.map((wallet) => ({
          walletAddress: wallet.walletAddress,
          walletName: wallet.walletName,
          isActive: wallet.isActive,
          createdAt: wallet.createdAt,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Error fetching profile for prosumerId ${prosumerId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new UnauthorizedException('Profile not found');
    }
  }

  async logout(prosumerId: string, accessToken?: string, request?: Request) {
    try {
      // Extract request metadata
      const ipAddress: string =
        request?.ip || request?.connection?.remoteAddress || 'unknown';
      const userAgent: string = request?.get?.('User-Agent') || 'unknown';

      // Extract access token dari header jika tidak diberikan
      if (!accessToken && request?.headers?.authorization) {
        const [type, token] = request.headers.authorization.split(' ');
        if (type === 'Bearer') {
          accessToken = token;
        }
      }

      // Blacklist access token if available
      if (accessToken) {
        await this.blacklistService.blacklistToken(
          accessToken,
          prosumerId,
          BlacklistReason.LOGOUT,
          ipAddress,
          userAgent,
          'User initiated logout',
        );
      }

      // Log logout activity
      await this.transactionLogsService.create({
        prosumerId: prosumerId,
        transactionType: TransactionType.DEVICE_COMMAND,
        description: JSON.stringify({
          message: 'User logged out',
          timestamp: new Date().toISOString(),
          ipAddress: ipAddress,
          userAgent: userAgent,
        }),
        amountPrimary: 0,
        currencyPrimary: 'ETK',
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(`Prosumer ${prosumerId} logged out successfully`);

      return {
        message: 'Logged out successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error during logout for prosumerId ${prosumerId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadRequestException('Logout failed');
    }
  }

  async logoutAll(prosumerId: string, request?: Request) {
    try {
      // Extract request metadata
      const ipAddress: string =
        request?.ip || request?.connection?.remoteAddress || 'unknown';
      const userAgent: string = request?.get?.('User-Agent') || 'unknown';

      // Blacklist all tokens for this user
      await this.blacklistService.blacklistUser(
        prosumerId,
        BlacklistReason.LOGOUT_ALL_DEVICES,
        ipAddress,
        userAgent,
        'SYSTEM',
        'User initiated logout from all devices',
      );

      // Log logout from all devices
      await this.transactionLogsService.create({
        prosumerId: prosumerId,
        transactionType: TransactionType.DEVICE_COMMAND,
        description: JSON.stringify({
          message: 'User logged out from all devices',
          timestamp: new Date().toISOString(),
          ipAddress: ipAddress,
          userAgent: userAgent,
        }),
        amountPrimary: 0,
        currencyPrimary: 'ETK',
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(`Prosumer ${prosumerId} logged out from all devices`);

      return {
        message: 'Logged out from all devices successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error during logout all for prosumerId ${prosumerId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadRequestException('Logout from all devices failed');
    }
  }
}
