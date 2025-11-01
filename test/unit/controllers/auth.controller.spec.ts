import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';
import { RegisterDto } from '../../../src/auth/dto/auth.dto';
import { Request as ExpressRequest } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  const mockValidatedProsumer = {
    prosumerId: 'prosumer_123',
    email: 'john.doe@example.com',
    name: 'John Doe',
    createdAt: '2025-10-27T10:00:00Z',
    updatedAt: '2025-10-27T10:00:00Z',
  };

  const mockTokenResponse = {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    prosumer: {
      prosumerId: 'prosumer_123',
      email: 'john.doe@example.com',
      name: 'John Doe',
    },
  };

  const mockProfileResponse = {
    profile: {
      prosumerId: 'prosumer_123',
      email: 'john.doe@example.com',
      name: 'John Doe',
      primaryWalletAddress: '0xec7CeB00FC447E2003DE6874b0E1eCD895250230',
      createdAt: '2025-10-27T10:00:00Z',
      updatedAt: '2025-10-27T10:00:00Z',
    },
    wallets: [
      {
        walletAddress: '0xec7CeB00FC447E2003DE6874b0E1eCD895250230',
        walletName: 'John Doe Wallet',
        isActive: true,
        createdAt: '2025-10-27T10:00:00Z',
      },
    ],
    meters: [
      {
        meterId: 'METER001',
        location: 'Sukasari, Bandung',
        status: 'ACTIVE',
        createdAt: '2025-10-27T10:00:00Z',
        lastSeen: '2025-10-27T10:00:00Z',
        deviceModel: 'Generic Smart Meter',
        deviceVersion: '1.0.0',
      },
    ],
  };

  beforeEach(async () => {
    const mockAuthService = {
      generateTokens: jest.fn() as any,
      register: jest.fn() as any,
      getProfile: jest.fn() as any,
      logout: jest.fn() as any,
      logoutAll: jest.fn() as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return JWT token and user info on successful login', async () => {
      const mockRequest = {
        user: mockValidatedProsumer,
      };

      authService.generateTokens.mockResolvedValue(mockTokenResponse as any);

      const result = await controller.login(mockRequest);

      expect(authService.generateTokens).toHaveBeenCalledWith(
        mockValidatedProsumer,
      );
      expect(result).toEqual(mockTokenResponse);
    });

    it('should handle generateTokens errors', async () => {
      const mockRequest = {
        user: mockValidatedProsumer,
      };

      authService.generateTokens.mockRejectedValue(
        new Error('Token generation failed'),
      );

      await expect(controller.login(mockRequest)).rejects.toThrow(
        'Token generation failed',
      );
      expect(authService.generateTokens).toHaveBeenCalledWith(
        mockValidatedProsumer,
      );
    });

    it('should work with LocalAuthGuard validated user', async () => {
      const mockRequest = {
        user: {
          ...mockValidatedProsumer,
          // LocalAuthGuard adds validated user to req.user
        },
      };

      authService.generateTokens.mockResolvedValue(mockTokenResponse as any);

      const result = await controller.login(mockRequest);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('prosumer');
      expect(result.prosumer.prosumerId).toBe('prosumer_123');
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'john.doe@example.com',
      password: 'SecurePassword123',
      name: 'John Doe',
    };

    it('should register new user and return auto-login token', async () => {
      authService.register.mockResolvedValue(mockValidatedProsumer);
      authService.generateTokens.mockResolvedValue(mockTokenResponse as any);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.generateTokens).toHaveBeenCalledWith(
        mockValidatedProsumer,
      );
      expect(result).toEqual({
        success: true,
        message: 'User registered successfully',
        loginInfo: mockTokenResponse,
      });
    });

    it('should handle registration errors (duplicate email)', async () => {
      authService.register.mockRejectedValue(
        new Error('Email already registered'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.generateTokens).not.toHaveBeenCalled();
    });

    it('should handle token generation errors after registration', async () => {
      authService.register.mockResolvedValue(mockValidatedProsumer);
      authService.generateTokens.mockRejectedValue(
        new Error('Token generation failed'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Token generation failed',
      );
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.generateTokens).toHaveBeenCalledWith(
        mockValidatedProsumer,
      );
    });

    it('should return consistent response format', async () => {
      authService.register.mockResolvedValue(mockValidatedProsumer);
      authService.generateTokens.mockResolvedValue(mockTokenResponse as any);

      const result = await controller.register(registerDto);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message', 'User registered successfully');
      expect(result).toHaveProperty('loginInfo');
      expect(result.loginInfo).toHaveProperty('access_token');
      expect(result.loginInfo).toHaveProperty('prosumer');
    });

    it('should validate RegisterDto structure', async () => {
      const validRegisterDto: RegisterDto = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      authService.register.mockResolvedValue(mockValidatedProsumer);
      authService.generateTokens.mockResolvedValue(mockTokenResponse as any);

      await controller.register(validRegisterDto);

      expect(authService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.any(String),
          password: expect.any(String),
          name: expect.any(String),
        }),
      );
    });
  });

  describe('getProfile', () => {
    it('should return complete user profile with wallets and meters', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_123' },
      };

      authService.getProfile.mockResolvedValue(mockProfileResponse as any);

      const result = await controller.getProfile(mockRequest);

      expect(authService.getProfile).toHaveBeenCalledWith('prosumer_123');
      expect(result).toEqual(mockProfileResponse);
      expect(result.profile).toHaveProperty('prosumerId');
      expect(result.profile).toHaveProperty('email');
      expect(result.wallets).toBeInstanceOf(Array);
      expect(result.meters).toBeInstanceOf(Array);
    });

    it('should handle profile not found', async () => {
      const mockRequest = {
        user: { prosumerId: 'nonexistent_user' },
      };

      authService.getProfile.mockRejectedValue(new Error('User not found'));

      await expect(controller.getProfile(mockRequest)).rejects.toThrow(
        'User not found',
      );
      expect(authService.getProfile).toHaveBeenCalledWith('nonexistent_user');
    });

    it('should extract prosumerId from JWT authenticated request', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_456' },
      };

      authService.getProfile.mockResolvedValue(mockProfileResponse as any);

      await controller.getProfile(mockRequest);

      expect(authService.getProfile).toHaveBeenCalledWith('prosumer_456');
    });

    it('should return profile with proper structure', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_123' },
      };

      authService.getProfile.mockResolvedValue(mockProfileResponse as any);

      const result = await controller.getProfile(mockRequest);

      expect(result).toMatchObject({
        profile: expect.objectContaining({
          prosumerId: expect.any(String),
          email: expect.any(String),
          name: expect.any(String),
        }),
        wallets: expect.any(Array),
        meters: expect.any(Array),
      });
    });

    it('should handle profile with no wallets or meters', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_123' },
      };

      const emptyProfileResponse = {
        profile: mockProfileResponse.profile,
        wallets: [],
        meters: [],
      };

      authService.getProfile.mockResolvedValue(emptyProfileResponse);

      const result = await controller.getProfile(mockRequest);

      expect(result.wallets).toHaveLength(0);
      expect(result.meters).toHaveLength(0);
    });
  });

  describe('logout', () => {
    it('should logout current session successfully', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_123' },
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      } as ExpressRequest & { user: { prosumerId: string } };

      const mockLogoutResponse = {
        message: 'Logged out successfully',
        timestamp: '2025-10-27T10:00:00Z',
      };

      authService.logout.mockResolvedValue(mockLogoutResponse);

      const result = await controller.logout(mockRequest);

      expect(authService.logout).toHaveBeenCalledWith(
        'prosumer_123',
        undefined,
        mockRequest,
      );
      expect(result).toEqual(mockLogoutResponse);
    });

    it('should handle logout errors', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_123' },
        headers: {
          authorization: 'Bearer token',
        },
      } as ExpressRequest & { user: { prosumerId: string } };

      authService.logout.mockRejectedValue(new Error('Logout failed'));

      await expect(controller.logout(mockRequest)).rejects.toThrow(
        'Logout failed',
      );
      expect(authService.logout).toHaveBeenCalledWith(
        'prosumer_123',
        undefined,
        mockRequest,
      );
    });

    it('should pass request object to service for token extraction', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_123' },
        headers: {
          authorization: 'Bearer test_token',
        },
      } as ExpressRequest & { user: { prosumerId: string } };

      authService.logout.mockResolvedValue({
        message: 'Logged out successfully',
        timestamp: '2025-10-27T10:00:00Z',
      });

      await controller.logout(mockRequest);

      // Service should receive the request object to extract token from Authorization header
      expect(authService.logout).toHaveBeenCalledWith(
        'prosumer_123',
        undefined,
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: 'Bearer test_token',
          }),
        }),
      );
    });

    it('should return proper logout response structure', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_123' },
      } as ExpressRequest & { user: { prosumerId: string } };

      const mockLogoutResponse = {
        message: 'Logged out successfully',
        timestamp: '2025-10-27T10:00:00Z',
      };

      authService.logout.mockResolvedValue(mockLogoutResponse);

      const result = await controller.logout(mockRequest);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('logoutAll', () => {
    it('should logout all sessions successfully', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_123' },
        headers: {
          authorization: 'Bearer token',
        },
      } as ExpressRequest & { user: { prosumerId: string } };

      const mockLogoutAllResponse = {
        message: 'Logged out from all devices successfully',
        timestamp: '2025-10-27T10:00:00Z',
      };

      authService.logoutAll.mockResolvedValue(mockLogoutAllResponse);

      const result = await controller.logoutAll(mockRequest);

      expect(authService.logoutAll).toHaveBeenCalledWith(
        'prosumer_123',
        mockRequest,
      );
      expect(result).toEqual(mockLogoutAllResponse);
    });

    it('should handle logoutAll errors', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_123' },
      } as ExpressRequest & { user: { prosumerId: string } };

      authService.logoutAll.mockRejectedValue(new Error('Logout all failed'));

      await expect(controller.logoutAll(mockRequest)).rejects.toThrow(
        'Logout all failed',
      );
      expect(authService.logoutAll).toHaveBeenCalledWith(
        'prosumer_123',
        mockRequest,
      );
    });

    it('should pass request object to service', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_456' },
        headers: {
          authorization: 'Bearer test_token',
        },
      } as ExpressRequest & { user: { prosumerId: string } };

      authService.logoutAll.mockResolvedValue({
        message: 'Logged out from all devices successfully',
        timestamp: '2025-10-27T10:00:00Z',
      });

      await controller.logoutAll(mockRequest);

      expect(authService.logoutAll).toHaveBeenCalledWith(
        'prosumer_456',
        mockRequest,
      );
    });

    it('should return proper logoutAll response structure', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_123' },
      } as ExpressRequest & { user: { prosumerId: string } };

      const mockLogoutAllResponse = {
        message: 'Logged out from all devices successfully',
        timestamp: '2025-10-27T10:00:00Z',
      };

      authService.logoutAll.mockResolvedValue(mockLogoutAllResponse);

      const result = await controller.logoutAll(mockRequest);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
      expect(result.message).toContain('all devices');
    });

    it('should invalidate all user tokens across devices', async () => {
      const mockRequest = {
        user: { prosumerId: 'prosumer_123' },
      } as ExpressRequest & { user: { prosumerId: string } };

      authService.logoutAll.mockResolvedValue({
        message: 'Logged out from all devices successfully',
        timestamp: '2025-10-27T10:00:00Z',
      });

      await controller.logoutAll(mockRequest);

      // Should call logoutAll which invalidates all tokens for the user
      expect(authService.logoutAll).toHaveBeenCalledTimes(1);
      expect(authService.logoutAll).toHaveBeenCalledWith(
        'prosumer_123',
        expect.any(Object),
      );
    });
  });

  describe('Controller Integration', () => {
    it('should have all required methods', () => {
      expect(controller.login).toBeDefined();
      expect(controller.register).toBeDefined();
      expect(controller.getProfile).toBeDefined();
      expect(controller.logout).toBeDefined();
      expect(controller.logoutAll).toBeDefined();
    });

    it('should inject AuthService correctly', () => {
      expect(authService).toBeDefined();
      expect(authService.generateTokens).toBeDefined();
      expect(authService.register).toBeDefined();
      expect(authService.getProfile).toBeDefined();
      expect(authService.logout).toBeDefined();
      expect(authService.logoutAll).toBeDefined();
    });

    it('should use consistent prosumerId across methods', async () => {
      const prosumerId = 'consistent_prosumer_id';

      const mockRequest = {
        user: { prosumerId },
      } as ExpressRequest & { user: { prosumerId: string } };

      authService.getProfile.mockResolvedValue(mockProfileResponse as any);
      authService.logout.mockResolvedValue({
        message: 'Logged out',
        timestamp: '2025-10-27T10:00:00Z',
      });
      authService.logoutAll.mockResolvedValue({
        message: 'Logged out all',
        timestamp: '2025-10-27T10:00:00Z',
      });

      await controller.getProfile(mockRequest);
      await controller.logout(mockRequest);
      await controller.logoutAll(mockRequest);

      expect(authService.getProfile).toHaveBeenCalledWith(prosumerId);
      expect(authService.logout).toHaveBeenCalledWith(
        prosumerId,
        undefined,
        mockRequest,
      );
      expect(authService.logoutAll).toHaveBeenCalledWith(
        prosumerId,
        mockRequest,
      );
    });
  });
});
