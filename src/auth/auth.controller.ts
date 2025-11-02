import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard, LocalAuthGuard } from './guards/auth.guards';
import { Request as ExpressRequest } from 'express';
import { ResponseFormatter } from '../common/response-formatter';
import {
  LoginDto,
  LoginResponseDto,
  RegisterResponseDto,
  ProfileResponseDto,
} from '../common/dto/auth.dto';

interface ValidatedUser {
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Authentication Controller
 *
 * Handles user authentication and account management operations including:
 * - User login and registration
 * - Profile retrieval
 * - Session management (logout single/all devices)
 *
 * @remarks
 * All endpoints except login and register require JWT authentication.
 * Tokens are managed using a blacklist mechanism for logout functionality.
 *
 * @see {@link AuthService} for business logic implementation
 * @see {@link JwtAuthGuard} for JWT token validation
 * @see {@link LocalAuthGuard} for username/password authentication
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  /**
   * Login Endpoint
   *
   * Authenticates a user with email and password.
   * Returns JWT access token wrapped in ResponseFormatter structure.
   *
   * @param req - Request object containing validated user from LocalAuthGuard
   * @returns ResponseFormatter with JWT token data
   *
   * @example
   * POST /auth/login
   * Body: {
   *   "email": "john.doe@example.com",
   *   "password": "SecurePassword123"
   * }
   *
   * Response: {
   *   "success": true,
   *   "message": "Login successful",
   *   "data": {
   *     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *     "tokenType": "Bearer",
   *     "expiresIn": 3600,
   *     "user": {
   *      "userId": "user_...",
   *      "email": "john.doe@example.com",
   *      "name": "John Doe"
   *   },
   *   "metadata": {
   *     "timestamp": "2025-11-01T10:30:00.000Z"
   *   }
   * }
   *
   * @remarks
   * Authentication uses email (not username) as the identifier.
   * Password is verified using bcrypt hash comparison.
   * LocalAuthGuard (Passport) handles credential validation via LocalStrategy.
   *
   * @throws {UnauthorizedException} Invalid credentials (wrong email or password)
   * @throws {UnauthorizedException} user account not found
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User Login',
    description:
      'Authenticate user with email and password. Returns JWT access token for API authentication.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User credentials for authentication',
    examples: {
      standardLogin: {
        summary: 'Login with email and password',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePassword123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful - JWT token returned',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials - Wrong email or password',
  })
  login(@Request() req: { user: ValidatedUser }) {
    try {
      // User already validated by LocalAuthGuard, available in req.user
      return ResponseFormatter.success(
        this.authService.generateTokens(req.user),
        'Login successful',
      );
    } catch (error) {
      this.logger.error('Login error:', error);
      return ResponseFormatter.error(
        'Login failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Register New Account
   *
   * Creates a new user account in the system.
   * Validates that email is unique (email is used as primary identifier).
   * Automatically hashes password using bcrypt.
   * Generates JWT token for auto-login after registration.
   *
   * @param registerDto - Registration data including email, password, and name
   * @returns ResponseFormatter with JWT token and created user information
   *
   * @example
   * POST /auth/register
   * Body: {
   *   "email": "john.doe@example.com",
   *   "password": "SecurePassword123",
   *   "name": "John Doe"
   * }
   *
   * Response: {
   *   "success": true,
   *   "message": "User registered successfully",
   *   "data": {
   *     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *     "tokenType": "Bearer",
   *     "expiresIn": 3600,
   *     "user": {
   *       "userId": "user_...",
   *       "email": "john.doe@example.com",
   *       "name": "John Doe",
   *       "createdAt": "2025-11-01T10:30:00.000Z",
   *       "updatedAt": "2025-11-01T10:30:00.000Z"
   *     }
   *   },
   *   "metadata": {
   *     "timestamp": "2025-11-01T10:30:00.000Z"
   *   }
   * }
   *
   * @remarks
   * After successful registration, user is automatically logged in.
   * A wallet is automatically generated for the new user.
   * Email is used as the unique identifier (not username).
   *
   * @throws {BadRequestException} Email already registered
   * @throws {BadRequestException} Invalid email format
   * @throws {BadRequestException} Password too weak
   */
  @Post('register')
  @ApiOperation({
    summary: 'Register New User Account',
    description:
      'Create a new user account with unique email. Password will be securely hashed before storage. Returns JWT token for auto-login. Wallet is automatically generated.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'Registration information for new user account',
    examples: {
      basicRegistration: {
        summary: 'Basic user registration',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePassword123',
          name: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully - Auto-login with JWT token',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Email already registered or validation failed',
  })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<
    | ReturnType<typeof ResponseFormatter.success>
    | ReturnType<typeof ResponseFormatter.error>
  > {
    try {
      // Register user (returns ValidatedUser)
      const validatedUser = await this.authService.register(registerDto);

      // Generate JWT token for auto-login (same pattern as login endpoint)
      const loginInfo = this.authService.generateTokens(validatedUser);

      return ResponseFormatter.success(
        {
          ...loginInfo,
          user: validatedUser,
        },
        'User registered successfully',
      );
    } catch (error) {
      this.logger.error('Registration error:', error);
      return ResponseFormatter.error(
        'Registration failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Get User Profile
   *
   * Retrieves the complete profile of the authenticated user including:
   * - Basic account information (userId, email, name)
   * - Associated wallets with their addresses and metadata
   * - Connected smart meters with operational status
   *
   * Requires valid JWT token in Authorization header.
   *
   * @param req - Request object containing authenticated user from JWT
   * @returns ResponseFormatter with complete user profile
   *
   * @example
   * GET /auth/profile
   * Headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
   *
   * Response: {
   *   "success": true,
   *   "message": "Profile retrieved successfully",
   *   "data": {
   *     "profile": {
   *       "userId": "user_...",
   *       "email": "john.doe@example.com",
   *       "name": "John Doe",
   *       "primaryWalletAddress": "0xabcd...",
   *       "createdAt": "2025-11-01T10:30:00.000Z",
   *       "updatedAt": "2025-11-01T10:30:00.000Z"
   *     },
   *     "wallets": [
   *       {
   *         "walletAddress": "0xabcd...",
   *         "walletName": "John Doe's Wallet",
   *         "isActive": true,
   *         "createdAt": "2025-11-01T10:30:00.000Z"
   *       }
   *     ],
   *     "meters": [
   *       {
   *         "meterId": "METER001",
   *         "location": "Bandung, Indonesia",
   *         "status": "ACTIVE",
   *         "createdAt": "2025-11-01T10:30:00.000Z",
   *         "lastSeen": "2025-11-01T10:30:00.000Z",
   *         "deviceModel": "Generic Smart Meter",
   *         "deviceVersion": "1.0.0"
   *       }
   *     ]
   *   },
   *   "metadata": {
   *     "timestamp": "2025-11-01T10:30:00.000Z"
   *   }
   * }
   *
   * @throws {UnauthorizedException} Invalid or expired JWT token
   * @throws {NotFoundException} User not found
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get User Profile',
    description:
      'Retrieve authenticated user profile with complete information including associated wallets and smart meters. Returns account details, list of Ethereum wallets, and connected IoT devices.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getProfile(@Request() req: { user: { userId: string } }) {
    try {
      const profile = await this.authService.getProfile(req.user.userId);
      return ResponseFormatter.success(
        profile,
        'Profile retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Get profile error:', error);
      return ResponseFormatter.error(
        'Failed to retrieve profile',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Logout from Current Session
   *
   * Invalidates the current JWT token by adding it to the blacklist.
   * Only affects the current device/session. Other active sessions remain valid.
   *
   * @param req - Request object containing authenticated user and JWT token
   * @returns ResponseFormatter with success confirmation
   *
   * @example
   * POST /auth/logout
   * Headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
   *
   * Response: {
   *   "success": true,
   *   "message": "Logged out successfully",
   *   "data": {
   *     "message": "Logout successful"
   *   },
   *   "metadata": {
   *     "timestamp": "2025-11-01T10:30:00.000Z"
   *   }
   * }
   *
   * @remarks
   * The token is extracted from the Authorization header and added to a blacklist.
   * Blacklisted tokens are automatically cleaned up after expiration.
   *
   * @throws {UnauthorizedException} Invalid or expired JWT token
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout from Current Session',
    description:
      'Invalidate the current JWT token. This will only logout the current device/session. Use logout-all to logout from all devices.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful - Token invalidated',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired JWT token',
  })
  async logout(@Request() req: ExpressRequest & { user: { userId: string } }) {
    try {
      // Token will be extracted automatically from Authorization header
      const result = await this.authService.logout(
        req.user.userId,
        undefined,
        req,
      );
      return ResponseFormatter.success(result, 'Logged out successfully');
    } catch (error) {
      this.logger.error('Logout error:', error);
      return ResponseFormatter.error(
        'Logout failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Logout from All Sessions
   *
   * Invalidates all JWT tokens for the authenticated user across all devices.
   * This is useful for security purposes when user suspects unauthorized access.
   *
   * @param req - Request object containing authenticated user
   * @returns ResponseFormatter with success confirmation
   *
   * @example
   * POST /auth/logout-all
   * Headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
   *
   * Response: {
   *   "success": true,
   *   "message": "Logged out from all devices successfully",
   *   "data": {
   *     "message": "All sessions logged out successfully",
   *     "devicesLoggedOut": 5
   *   },
   *   "metadata": {
   *     "timestamp": "2025-11-01T10:30:00.000Z"
   *   }
   * }
   *
   * @remarks
   * This endpoint adds a user-level blacklist entry that invalidates all existing tokens.
   * User will need to login again from all devices to get new tokens.
   * Useful for security incidents or when user changes password.
   *
   * @throws {UnauthorizedException} Invalid or expired JWT token
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout from All Sessions',
    description:
      'Invalidate all JWT tokens for the user across all devices. User will need to re-authenticate from all devices. Recommended for security incidents.',
  })
  @ApiResponse({
    status: 200,
    description:
      'All sessions logged out successfully - All tokens invalidated',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired JWT token',
  })
  async logoutAll(
    @Request() req: ExpressRequest & { user: { userId: string } },
  ) {
    try {
      const result = await this.authService.logoutAll(req.user.userId, req);
      return ResponseFormatter.success(
        result,
        'Logged out from all devices successfully',
      );
    } catch (error) {
      this.logger.error('Logout all error:', error);
      return ResponseFormatter.error(
        'Logout all failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
