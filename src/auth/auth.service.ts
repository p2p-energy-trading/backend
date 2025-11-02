import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { UsersService } from '../models/user/user.service';
import { WalletsService } from '../models/wallet/wallet.service';
import { CryptoService } from '../common/crypto.service';
import { RegisterDto } from './dto/auth.dto';
import { TransactionLogsService } from '../models/transactionLog/transactionLog.service';
import { TransactionType, WalletImportMethod } from '../common/enums';
import { BlacklistService } from 'src/models/tokenBlacklist/tokenBlacklist.service';
import { BlacklistReason } from 'src/models/tokenBlacklist/tokenBlacklist.entity';
import { Request } from 'express';
import { SmartMetersService } from '../models/smartMeter/smartMeter.service';

interface ValidatedUser {
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private walletsService: WalletsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cryptoService: CryptoService,
    private transactionLogsService: TransactionLogsService,
    private blacklistService: BlacklistService,
    private smartMetersService: SmartMetersService,
  ) {}

  /**
   * Validate User Credentials
   *
   * Called by LocalStrategy during authentication.
   * Verifies user email and password using bcrypt.
   *
   * @param email - User email address
   * @param password - Plain text password from login request
   * @returns ValidatedUser object if credentials are valid, null otherwise
   *
   * @workflow
   * 1. Find user by email in database
   * 2. Verify password hash using bcrypt
   * 3. Return sanitized user object (without password hash)
   *
   * @see LocalStrategy.validate() - Calls this method during login
   * @see CryptoService.verifyPassword() - Password verification
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<ValidatedUser | null> {
    try {
      // Find user by email
      const users = await this.usersService.findAll({ email });
      const user = users[0];

      if (!user) {
        this.logger.warn(`Login attempt with non-existent email: ${email}`);
        return null;
      }

      // Verify password using bcrypt
      const isPasswordValid = await this.cryptoService.verifyPassword(
        password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        this.logger.warn(
          `Failed login attempt for email: ${email} - Invalid password`,
        );
        return null;
      }

      // Return user without sensitive data
      const result = {
        userId: user.userId,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      this.logger.log(`Successful authentication for email: ${email}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error validating user with email ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Generate JWT Access Token
   *
   * Creates JWT token containing user identification.
   * Token is used for authenticating subsequent API requests.
   *
   * @param user - Validated user object from authentication
   * @returns Object containing access_token and user info
   *
   * @security
   * - Token signed with JWT_SECRET from environment
   * - Default expiration: 24 hours (configurable via JWT_EXPIRATION)
   * - Payload contains: userId, email, sub (subject)
   *
   * @see JwtStrategy.validate() - Verifies this token on protected endpoints
   * @see AuthController.login() - Returns this to client after successful authentication
   */
  generateTokens(user: ValidatedUser) {
    const payload = {
      userId: user.userId,
      email: user.email,
      sub: user.userId, // JWT standard: subject identifier
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`JWT token generated for user: ${user.userId}`);

    return {
      access_token: accessToken,
      tokenType: 'Bearer',
      expiresIn: this.getJwtExpirationSeconds(),
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
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
   * Register New User
   *
   * Creates a new user account with wallet generation.
   * Returns validated user object (without generating JWT).
   *
   * @param registerDto - Registration data (email, password, name)
   * @returns ValidatedUser object for token generation in controller
   *
   * @workflow
   * 1. Check if email already exists
   * 2. Hash password with bcrypt
   * 3. Create user record in database
   * 4. Generate Ethereum wallet for user
   * 5. Log registration activity
   * 6. Return validated user object
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
  async register(registerDto: RegisterDto): Promise<ValidatedUser> {
    try {
      // Check if user already exists
      const existingUsers = await this.usersService.findAll({
        email: registerDto.email,
      });
      if (existingUsers.length > 0) {
        throw new BadRequestException('Email already registered');
      }

      // Hash password
      const hashedPassword = await this.cryptoService.hashPassword(
        registerDto.password,
      );

      // Generate user ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create user
      const user = await this.usersService.create({
        userId,
        email: registerDto.email,
        passwordHash: hashedPassword,
        name: registerDto.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Generate wallet for the user
      const wallet = await this.generateWalletForUser(
        user.userId,
        `${registerDto.name}'s Wallet`,
      );

      // Log registration
      await this.transactionLogsService.create({
        userId: user.userId,
        transactionType: TransactionType.WALLET_CREATED,
        description: JSON.stringify({
          message: 'User registered and wallet created',
          walletAddress: wallet.walletAddress,
        }),
        amountPrimary: 0,
        currencyPrimary: 'ETK',
        transactionTimestamp: new Date().toISOString(),
      });

      this.logger.log(`New user registered: ${user.userId} (${user.email})`);

      // Return validated user (no token generation here)
      const validatedUser: ValidatedUser = {
        userId: user.userId,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      return validatedUser;
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

  private async generateWalletForUser(userId: string, walletName: string) {
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
      userId: userId,
      walletName,
      encryptedPrivateKey,
      importMethod: WalletImportMethod.GENERATED,

      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });
  }

  async getProfile(userId: string) {
    try {
      const user = await this.usersService.findOne(userId);
      // const { passwordHash, ...profile } = user;
      const profile = {
        userId: user.userId,
        email: user.email,
        name: user.name,
        primaryWalletAddress: user.primaryWalletAddress,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      // Get associated wallets
      const wallets = await this.walletsService.findByUserId(userId);
      const meters = await this.smartMetersService.findByUserId(userId);

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
        `Error fetching profile for userId ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new UnauthorizedException('Profile not found');
    }
  }

  async logout(userId: string, accessToken?: string, request?: Request) {
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
          userId,
          BlacklistReason.LOGOUT,
          ipAddress,
          userAgent,
          'User initiated logout',
        );
      }

      // Log logout activity
      await this.transactionLogsService.create({
        userId: userId,
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

      this.logger.log(`User ${userId} logged out successfully`);

      return {
        message: 'Logged out successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error during logout for userId ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadRequestException('Logout failed');
    }
  }

  async logoutAll(userId: string, request?: Request) {
    try {
      // Extract request metadata
      const ipAddress: string =
        request?.ip || request?.connection?.remoteAddress || 'unknown';
      const userAgent: string = request?.get?.('User-Agent') || 'unknown';

      // Blacklist all tokens for this user
      await this.blacklistService.blacklistUser(
        userId,
        BlacklistReason.LOGOUT_ALL_DEVICES,
        ipAddress,
        userAgent,
        'SYSTEM',
        'User initiated logout from all devices',
      );

      // Log logout from all devices
      await this.transactionLogsService.create({
        userId: userId,
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

      this.logger.log(`User ${userId} logged out from all devices`);

      return {
        message: 'Logged out from all devices successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error during logout all for userId ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadRequestException('Logout from all devices failed');
    }
  }
}
