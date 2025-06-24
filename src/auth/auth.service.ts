import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ProsumersService } from '../modules/Prosumers/Prosumers.service';
import { WalletsService } from '../modules/Wallets/Wallets.service';
import { CryptoService } from '../common/crypto.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { TransactionLogsService } from '../modules/TransactionLogs/TransactionLogs.service';
import { TransactionType, WalletImportMethod } from '../common/enums';

@Injectable()
export class AuthService {
  constructor(
    private prosumersService: ProsumersService,
    private walletsService: WalletsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cryptoService: CryptoService,
    private transactionLogsService: TransactionLogsService,
  ) {}

  async validateProsumer(email: string, password: string): Promise<any> {
    try {
      // Find prosumer by email
      const prosumers = await this.prosumersService.findAll({ email });
      const prosumer = prosumers[0];

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
      const { passwordHash, ...result } = prosumer;
      return result;
    } catch (error) {
      return null;
    }
  }

  async login(loginDto: LoginDto) {
    const prosumer = await this.validateProsumer(
      loginDto.email,
      loginDto.password,
    );
    if (!prosumer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      prosumerId: prosumer.prosumerId,
      email: prosumer.email,
      sub: prosumer.prosumerId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      prosumer: {
        prosumerId: prosumer.prosumerId,
        email: prosumer.email,
        name: prosumer.name,
      },
    };
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

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const prosumer = await this.prosumersService.findOne(payload.prosumerId);

      const newPayload = {
        prosumerId: prosumer.prosumerId,
        email: prosumer.email,
        sub: prosumer.prosumerId,
      };

      const accessToken = this.jwtService.sign(newPayload);

      return {
        access_token: accessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateWalletForProsumer(
    prosumerId: string,
    walletName: string,
  ) {
    // Generate Ethereum wallet
    const ethers = require('ethers');
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
      const { passwordHash, ...profile } = prosumer;

      // Get associated wallets
      const wallets = await this.walletsService.findByProsumerId(prosumerId);

      return {
        ...profile,
        wallets: wallets.map((wallet) => ({
          walletAddress: wallet.walletAddress,
          walletName: wallet.walletName,
          isActive: wallet.isActive,
          createdAt: wallet.createdAt,
        })),
      };
    } catch (error) {
      throw new UnauthorizedException('Profile not found');
    }
  }
}
