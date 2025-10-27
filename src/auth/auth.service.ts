import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { ProsumersService } from '../models/prosumer/Prosumers.service';
import { WalletsService } from '../models/Wallets/Wallets.service';
import { CryptoService } from '../common/crypto.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { TransactionLogsService } from '../models/TransactionLogs/TransactionLogs.service';
import { TransactionType, WalletImportMethod } from '../common/enums';
import { BlacklistService } from 'src/models/TokenBlacklist/TokenBlacklist.service';
import { BlacklistReason } from 'src/models/TokenBlacklist/TokenBlacklist.entity';
import { Request } from 'express';
import { SmartMetersService } from '../models/SmartMeters/SmartMeters.service';

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
    private smartMetersService: SmartMetersService,
  ) {}

  /**
   * Validate Prosumer Credentials
   *
   * Called by LocalStrategy during authentication.
   * Verifies prosumer email and password using bcrypt.
   *
   * @param email - Prosumer email address
   * @param password - Plain text password from login request
   * @returns ValidatedProsumer object if credentials are valid, null otherwise
   *
   * @workflow
   * 1. Find prosumer by email in database
   * 2. Verify password hash using bcrypt
   * 3. Return sanitized prosumer object (without password hash)
   *
   * @see LocalStrategy.validate() - Calls this method during login
   * @see CryptoService.verifyPassword() - Password verification
   */
  async validateProsumer(
    email: string,
    password: string,
  ): Promise<ValidatedProsumer | null> {
    try {
      // Find prosumer by email
      const prosumers = await this.prosumersService.findAll({ email });
      const prosumer = prosumers[0];

      if (!prosumer) {
        this.logger.warn(`Login attempt with non-existent email: ${email}`);
        return null;
      }

      // Verify password using bcrypt
      const isPasswordValid = await this.cryptoService.verifyPassword(
        password,
        prosumer.passwordHash,
      );

      if (!isPasswordValid) {
        this.logger.warn(
          `Failed login attempt for email: ${email} - Invalid password`,
        );
        return null;
      }

      // Return prosumer without sensitive data
      const result = {
        prosumerId: prosumer.prosumerId,
        email: prosumer.email,
        name: prosumer.name,
        createdAt: prosumer.createdAt.toISOString(),
        updatedAt: prosumer.updatedAt.toISOString(),
      };

      this.logger.log(`Successful authentication for email: ${email}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error validating prosumer with email ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Generate JWT Access Token
   *
   * Creates JWT token containing prosumer identification.
   * Token is used for authenticating subsequent API requests.
   *
   * @param prosumer - Validated prosumer object from authentication
   * @returns Object containing access_token and prosumer info
   *
   * @security
   * - Token signed with JWT_SECRET from environment
   * - Default expiration: 24 hours (configurable via JWT_EXPIRATION)
   * - Payload contains: prosumerId, email, sub (subject)
   *
   * @see JwtStrategy.validate() - Verifies this token on protected endpoints
   * @see AuthController.login() - Returns this to client after successful authentication
   */
  generateTokens(prosumer: ValidatedProsumer) {
    const payload = {
      prosumerId: prosumer.prosumerId,
      email: prosumer.email,
      sub: prosumer.prosumerId, // JWT standard: subject identifier
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`JWT token generated for prosumer: ${prosumer.prosumerId}`);

    return {
      access_token: accessToken,
      tokenType: 'Bearer',
      expiresIn: this.getJwtExpirationSeconds(),
      prosumer: {
        prosumerId: prosumer.prosumerId,
        email: prosumer.email,
        name: prosumer.name,
      },
    };
  }

  private getJwtExpirationSeconds(): number {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';

    // Convert to seconds
    if (expiresIn.includes('d')) {
      return parseInt(expiresIn) * 24 * 60 * 60;
    }
    if (expiresIn.includes('h')) {
      return parseInt(expiresIn) * 60 * 60;
    }
    if (expiresIn.includes('m')) {
      return parseInt(expiresIn) * 60;
    }
    if (expiresIn.includes('s')) {
      return parseInt(expiresIn);
    }

    return 60 * 60; // default 1 hour
  }

  /**
   * Register New Prosumer
   *
   * Creates a new prosumer account with wallet generation.
   * Returns validated prosumer object (without generating JWT).
   *
   * @param registerDto - Registration data (email, password, name)
   * @returns ValidatedProsumer object for token generation in controller
   *
   * @workflow
   * 1. Check if email already exists
   * 2. Hash password with bcrypt
   * 3. Create prosumer record in database
   * 4. Generate Ethereum wallet for prosumer
   * 5. Log registration activity
   * 6. Return validated prosumer object
   *
   * @remarks
   * Token generation is handled by controller via generateTokens().
   * This follows the same pattern as login (separation of concerns).
   *
   * @throws {BadRequestException} Email already registered
   * @throws {BadRequestException} Registration failed
   *
   * @see AuthController.register() - Calls generateTokens() after registration
   * @see generateTokens() - JWT token generation
   */
  async register(registerDto: RegisterDto): Promise<ValidatedProsumer> {
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

      this.logger.log(
        `New prosumer registered: ${prosumer.prosumerId} (${prosumer.email})`,
      );

      // Return validated prosumer (no token generation here)
      const validatedProsumer: ValidatedProsumer = {
        prosumerId: prosumer.prosumerId,
        email: prosumer.email,
        name: prosumer.name,
        createdAt: prosumer.createdAt.toISOString(),
        updatedAt: prosumer.updatedAt.toISOString(),
      };

      return validatedProsumer;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Registration failed for email ${registerDto.email}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
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
      const profile = {
        prosumerId: prosumer.prosumerId,
        email: prosumer.email,
        name: prosumer.name,
        primaryWalletAddress: prosumer.primaryWalletAddress,
        createdAt: prosumer.createdAt.toISOString(),
        updatedAt: prosumer.updatedAt.toISOString(),
      };

      // Get associated wallets
      const wallets = await this.walletsService.findByProsumerId(prosumerId);
      const meters = await this.smartMetersService.findByProsumerId(prosumerId);

      return {
        profile,
        wallets: wallets.map((wallet) => ({
          walletAddress: wallet.walletAddress,
          walletName: wallet.walletName,
          isActive: wallet.isActive,
          createdAt: wallet.createdAt,
        })),
        meters: meters.map((meter) => ({
          meterId: meter.meterId,
          location: meter.location,
          status: meter.status,
          createdAt: meter.createdAt.toISOString(),
          lastSeen: meter.lastSeen ? meter.lastSeen.toISOString() : null,
          deviceModel: meter.deviceModel,
          deviceVersion: meter.deviceVersion,
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
