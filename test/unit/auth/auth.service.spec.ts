import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../../src/auth/auth.service';
import { ProsumersService } from '../../../src/models/user/user.service';
import { WalletsService } from '../../../src/models/wallet/wallet.service';
import { CryptoService } from '../../../src/common/crypto.service';
import { TransactionLogsService } from '../../../src/models/transactionLog/transactionLog.service';
import { BlacklistService } from '../../../src/models/tokenBlacklist/tokenBlacklist.service';
import { SmartMetersService } from '../../../src/models/smartMeter/smartMeter.service';
import { RegisterDto } from '../../../src/auth/dto/auth.dto';
import { createMockUser } from '../../helpers/mock-factories.helper';
import {
  createMockJwtService,
  createMockConfigService,
} from '../../helpers/mock-external-services.helper';

describe('AuthService - Unit Tests', () => {
  let authService: AuthService;
  let prosumersService: jest.Mocked<ProsumersService>;
  let walletsService: jest.Mocked<WalletsService>;
  let cryptoService: jest.Mocked<CryptoService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let transactionLogsService: jest.Mocked<TransactionLogsService>;
  let blacklistService: jest.Mocked<BlacklistService>;
  let smartMetersService: jest.Mocked<SmartMetersService>;

  beforeEach(async () => {
    // Create mock services
    const mockProsumersService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockWalletsService = {
      findByProsumerId: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
    };

    const mockCryptoService = {
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    const mockTransactionLogsService = {
      create: jest.fn(),
    };

    const mockBlacklistService = {
      blacklistToken: jest.fn(),
      blacklistUser: jest.fn(),
      isTokenBlacklisted: jest.fn(),
    };

    const mockSmartMetersService = {
      findByProsumerId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ProsumersService,
          useValue: mockProsumersService,
        },
        {
          provide: WalletsService,
          useValue: mockWalletsService,
        },
        {
          provide: CryptoService,
          useValue: mockCryptoService,
        },
        {
          provide: JwtService,
          useValue: createMockJwtService(),
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
        {
          provide: TransactionLogsService,
          useValue: mockTransactionLogsService,
        },
        {
          provide: BlacklistService,
          useValue: mockBlacklistService,
        },
        {
          provide: SmartMetersService,
          useValue: mockSmartMetersService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prosumersService = module.get(ProsumersService);
    walletsService = module.get(WalletsService);
    cryptoService = module.get(CryptoService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    transactionLogsService = module.get(TransactionLogsService);
    blacklistService = module.get(BlacklistService);
    smartMetersService = module.get(SmartMetersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateProsumer', () => {
    it('should return validated prosumer for valid credentials', async () => {
      // Arrange
      const mockUser = await createMockUser();
      const email = 'test@example.com';
      const password = 'password123';

      prosumersService.findAll.mockResolvedValue([mockUser]);
      cryptoService.verifyPassword.mockResolvedValue(true);

      // Act
      const result = await authService.validateProsumer(email, password);

      // Assert
      expect(result).toBeDefined();
      expect(result?.prosumerId).toBe(mockUser.prosumerId);
      expect(result?.email).toBe(mockUser.email);
      expect(prosumersService.findAll).toHaveBeenCalledWith({ email });
      expect(cryptoService.verifyPassword).toHaveBeenCalledWith(
        password,
        mockUser.passwordHash,
      );
    });

    it('should return null for non-existent email', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const password = 'password123';

      prosumersService.findAll.mockResolvedValue([]);

      // Act
      const result = await authService.validateProsumer(email, password);

      // Assert
      expect(result).toBeNull();
      expect(prosumersService.findAll).toHaveBeenCalledWith({ email });
      expect(cryptoService.verifyPassword).not.toHaveBeenCalled();
    });

    it('should return null for invalid password', async () => {
      // Arrange
      const mockUser = await createMockUser();
      const email = 'test@example.com';
      const wrongPassword = 'wrongpassword';

      prosumersService.findAll.mockResolvedValue([mockUser]);
      cryptoService.verifyPassword.mockResolvedValue(false);

      // Act
      const result = await authService.validateProsumer(email, wrongPassword);

      // Assert
      expect(result).toBeNull();
      expect(cryptoService.verifyPassword).toHaveBeenCalledWith(
        wrongPassword,
        mockUser.passwordHash,
      );
    });

    it('should return null and log error on exception', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';

      prosumersService.findAll.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await authService.validateProsumer(email, password);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('generateTokens', () => {
    it('should generate JWT token with prosumer payload', () => {
      // Arrange
      const mockProsumer = {
        prosumerId: 'test-prosumer-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockToken = 'mock-jwt-token';
      (jwtService.sign as jest.Mock).mockReturnValue(mockToken);

      // Act
      const result = authService.generateTokens(mockProsumer);

      // Assert
      expect(result).toBeDefined();
      expect(result.access_token).toBe(mockToken);
      expect(result.tokenType).toBe('Bearer');
      expect(result.prosumer.prosumerId).toBe(mockProsumer.prosumerId);
      expect(result.prosumer.email).toBe(mockProsumer.email);
      expect(jwtService.sign).toHaveBeenCalledWith({
        prosumerId: mockProsumer.prosumerId,
        email: mockProsumer.email,
        sub: mockProsumer.prosumerId,
      });
    });

    it('should include expiration time in response', () => {
      // Arrange
      const mockProsumer = {
        prosumerId: 'test-prosumer-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (jwtService.sign as jest.Mock).mockReturnValue('mock-token');

      // Act
      const result = authService.generateTokens(mockProsumer);

      // Assert
      expect(result.expiresIn).toBeDefined();
      expect(typeof result.expiresIn).toBe('number');
      expect(result.expiresIn).toBeGreaterThan(0);
    });
  });

  describe('register', () => {
    it('should successfully register new prosumer with wallet', async () => {
      // Arrange
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      const mockCreatedUser = await createMockUser({
        prosumerId: 'prosumer_new_123',
        email: registerDto.email,
        name: registerDto.name,
      });

      const mockWallet = {
        walletAddress: '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
        prosumerId: mockCreatedUser.prosumerId,
        walletName: `${registerDto.name}'s Wallet`,
      };

      prosumersService.findAll.mockResolvedValue([]);
      cryptoService.hashPassword.mockResolvedValue('hashed-password');
      prosumersService.create.mockResolvedValue(mockCreatedUser as any);
      cryptoService.encrypt.mockReturnValue('encrypted-private-key');
      walletsService.create.mockResolvedValue(mockWallet as any);
      transactionLogsService.create.mockResolvedValue({} as any);

      // Act
      const result = await authService.register(registerDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.prosumerId).toBeDefined();
      expect(result.email).toBe(registerDto.email);
      expect(result.name).toBe(registerDto.name);
      expect(prosumersService.findAll).toHaveBeenCalledWith({
        email: registerDto.email,
      });
      expect(cryptoService.hashPassword).toHaveBeenCalledWith(
        registerDto.password,
      );
      expect(prosumersService.create).toHaveBeenCalled();
      expect(walletsService.create).toHaveBeenCalled();
      expect(transactionLogsService.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      // Arrange
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      };

      const existingUser = await createMockUser({
        email: registerDto.email,
      });

      prosumersService.findAll.mockResolvedValue([existingUser]);

      // Act & Assert
      await expect(authService.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(authService.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );
      expect(cryptoService.hashPassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on database error', async () => {
      // Arrange
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      prosumersService.findAll.mockResolvedValue([]);
      cryptoService.hashPassword.mockResolvedValue('hashed-password');
      prosumersService.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(authService.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(authService.register(registerDto)).rejects.toThrow(
        'Registration failed',
      );
    });
  });

  describe('getProfile', () => {
    it('should return prosumer profile with wallets and meters', async () => {
      // Arrange
      const prosumerId = 'test-prosumer-1';
      const mockUser = await createMockUser({ prosumerId });
      const mockWallets = [
        {
          walletAddress: '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
          walletName: 'Main Wallet',
          isActive: true,
          createdAt: new Date(),
        },
      ];
      const mockMeters = [
        {
          meterId: 'meter-001',
          location: 'Home',
          status: 'online',
          createdAt: new Date(),
          lastSeen: new Date(),
          deviceModel: 'SM-100',
          deviceVersion: '1.0.0',
        },
      ];

      prosumersService.findOne.mockResolvedValue(mockUser as any);
      walletsService.findByProsumerId.mockResolvedValue(mockWallets as any);
      smartMetersService.findByProsumerId.mockResolvedValue(mockMeters as any);

      // Act
      const result = await authService.getProfile(prosumerId);

      // Assert
      expect(result).toBeDefined();
      expect(result.profile.prosumerId).toBe(prosumerId);
      expect(result.wallets).toHaveLength(1);
      expect(result.meters).toHaveLength(1);
      expect(prosumersService.findOne).toHaveBeenCalledWith(prosumerId);
      expect(walletsService.findByProsumerId).toHaveBeenCalledWith(prosumerId);
      expect(smartMetersService.findByProsumerId).toHaveBeenCalledWith(
        prosumerId,
      );
    });

    it('should throw UnauthorizedException if prosumer not found', async () => {
      // Arrange
      const prosumerId = 'non-existent';

      prosumersService.findOne.mockRejectedValue(new Error('Not found'));

      // Act & Assert
      await expect(authService.getProfile(prosumerId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.getProfile(prosumerId)).rejects.toThrow(
        'Profile not found',
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout prosumer and blacklist token', async () => {
      // Arrange
      const prosumerId = 'test-prosumer-1';
      const accessToken = 'mock-jwt-token';
      const mockRequest = {
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      blacklistService.blacklistToken.mockResolvedValue(undefined);
      transactionLogsService.create.mockResolvedValue({} as any);

      // Act
      const result = await authService.logout(
        prosumerId,
        accessToken,
        mockRequest,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.message).toBe('Logged out successfully');
      expect(blacklistService.blacklistToken).toHaveBeenCalledWith(
        accessToken,
        prosumerId,
        expect.any(String),
        '127.0.0.1',
        'Mozilla/5.0',
        expect.any(String),
      );
      expect(transactionLogsService.create).toHaveBeenCalled();
    });

    it('should extract token from Authorization header if not provided', async () => {
      // Arrange
      const prosumerId = 'test-prosumer-1';
      const mockRequest = {
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      blacklistService.blacklistToken.mockResolvedValue(undefined);
      transactionLogsService.create.mockResolvedValue({} as any);

      // Act
      const result = await authService.logout(
        prosumerId,
        undefined,
        mockRequest,
      );

      // Assert
      expect(result).toBeDefined();
      expect(blacklistService.blacklistToken).toHaveBeenCalledWith(
        'mock-jwt-token',
        prosumerId,
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });

    it('should throw BadRequestException on blacklist error', async () => {
      // Arrange
      const prosumerId = 'test-prosumer-1';
      const accessToken = 'mock-jwt-token';

      blacklistService.blacklistToken.mockRejectedValue(
        new Error('Blacklist error'),
      );

      // Act & Assert
      await expect(authService.logout(prosumerId, accessToken)).rejects.toThrow(
        BadRequestException,
      );
      await expect(authService.logout(prosumerId, accessToken)).rejects.toThrow(
        'Logout failed',
      );
    });
  });

  describe('logoutAll', () => {
    it('should successfully logout from all devices', async () => {
      // Arrange
      const prosumerId = 'test-prosumer-1';
      const mockRequest = {
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      blacklistService.blacklistUser.mockResolvedValue(undefined);
      transactionLogsService.create.mockResolvedValue({} as any);

      // Act
      const result = await authService.logoutAll(prosumerId, mockRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result.message).toBe('Logged out from all devices successfully');
      expect(blacklistService.blacklistUser).toHaveBeenCalledWith(
        prosumerId,
        expect.any(String),
        '127.0.0.1',
        'Mozilla/5.0',
        'SYSTEM',
        expect.any(String),
      );
      expect(transactionLogsService.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException on blacklist error', async () => {
      // Arrange
      const prosumerId = 'test-prosumer-1';

      blacklistService.blacklistUser.mockRejectedValue(
        new Error('Blacklist error'),
      );

      // Act & Assert
      await expect(authService.logoutAll(prosumerId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(authService.logoutAll(prosumerId)).rejects.toThrow(
        'Logout from all devices failed',
      );
    });
  });
});
