import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
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
import {
  LoginDto,
  LoginResponseDto,
  RegisterResponseDto,
  ProfileResponseDto,
} from '../common/dto/auth.dto';

interface ValidatedProsumer {
  prosumerId: string;
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
  constructor(private authService: AuthService) {}

  /**
   * Login Endpoint
   *
   * Authenticates a prosumer with email and password.
   * Returns JWT access token for subsequent API requests.
   *
   * @param req - Request object containing validated user from LocalAuthGuard
   * @returns JWT token and prosumer information
   *
   * @example
   * POST /auth/login
   * Body: {
   *   "email": "john.doe@example.com",
   *   "password": "SecurePassword123"
   * }
   *
   * Response: {
   *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *   "prosumer": {
   *     "prosumerId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
   *     "email": "john.doe@example.com",
   *     "name": "John Doe"
   *   }
   * }
   *
   * @remarks
   * Authentication uses email (not username) as the identifier.
   * Password is verified using bcrypt hash comparison.
   * LocalAuthGuard (Passport) handles credential validation via LocalStrategy.
   *
   * @throws {UnauthorizedException} Invalid credentials (wrong email or password)
   * @throws {UnauthorizedException} Prosumer account not found
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Prosumer Login',
    description:
      'Authenticate prosumer with email and password. Returns JWT access token for API authentication.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Prosumer credentials for authentication',
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
    schema: {
      example: {
        message: '...',
        error: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  login(@Request() req: { user: ValidatedProsumer }) {
    // User sudah divalidasi oleh LocalAuthGuard, tersedia di req.user
    return this.authService.generateTokens(req.user);
  }

  /**
   * Register New Account
   *
   * Creates a new prosumer account in the system.
   * Validates that email is unique (email is used as primary identifier).
   * Automatically hashes password using bcrypt.
   * Generates JWT token for auto-login after registration.
   *
   * @param registerDto - Registration data including email, password, and name
   * @returns JWT token and created prosumer information (password excluded)
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
   *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *   "prosumer": {
   *     "prosumerId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
   *     "email": "john.doe@example.com",
   *     "name": "John Doe"
   *   }
   * }
   *
   * @remarks
   * After successful registration, prosumer is automatically logged in.
   * A wallet is automatically generated for the new prosumer.
   * Email is used as the unique identifier (not username).
   *
   * @throws {BadRequestException} Email already registered
   * @throws {BadRequestException} Invalid email format
   * @throws {BadRequestException} Password too weak
   */
  @Post('register')
  @ApiOperation({
    summary: 'Register New Prosumer Account',
    description:
      'Create a new prosumer account with unique email. Password will be securely hashed before storage. Returns JWT token for auto-login. Wallet is automatically generated.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'Registration information for new prosumer account',
    examples: {
      basicRegistration: {
        summary: 'Basic prosumer registration',
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
    schema: {
      example: {
        message: 'Email already registered',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    // Register prosumer (returns ValidatedProsumer)
    const validatedProsumer = await this.authService.register(registerDto);

    // Generate JWT token for auto-login (same pattern as login endpoint)
    const loginInfo = await this.authService.generateTokens(validatedProsumer);

    return {
      success: true,
      message: 'User registered successfully',
      loginInfo: { ...loginInfo },
    };
  }

  /**
   * Get User Profile
   *
   * Retrieves the complete profile of the authenticated user including:
   * - Basic account information (prosumerId, email, name)
   * - Associated wallets with their addresses and metadata
   * - Connected smart meters with operational status
   *
   * Requires valid JWT token in Authorization header.
   *
   * @param req - Request object containing authenticated user from JWT
   * @returns Complete user profile with wallets and smart meters
   *
   * @example
   * GET /auth/profile
   * Headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
   *
   * Response: {
   *   "profile": {
   *     "prosumerId": "prosumer_1752482825660_0t9odlzv4",
   *     "email": "mnyasin26@energy.com",
   *     "name": "Yasin",
   *     "primaryWalletAddress": "0xec7CeB00FC447E2003DE6874b0E1eCD895250230",
   *     "createdAt": "2025-07-14T08:47:05.660Z",
   *     "updatedAt": "2025-07-15T11:40:38.234Z"
   *   },
   *   "wallets": [
   *     {
   *       "walletAddress": "0xec7CeB00FC447E2003DE6874b0E1eCD895250230",
   *       "walletName": "Muhamad Nur Yasin Amadudin's Wallet",
   *       "isActive": true,
   *       "createdAt": "2025-07-14T08:47:05.769Z"
   *     }
   *   ],
   *   "meters": [
   *     {
   *       "meterId": "METER001",
   *       "location": "Sukasari, Bandung",
   *       "status": "ACTIVE",
   *       "createdAt": "2025-07-14T08:47:29.386Z",
   *       "lastSeen": "2025-07-29T07:58:55.473Z",
   *       "deviceModel": "Generic Smart Meter",
   *       "deviceVersion": "1.0.0"
   *     }
   *   ]
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
    schema: {
      example: {
        message: '...',
        error: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  async getProfile(@Request() req: { user: { prosumerId: string } }) {
    return this.authService.getProfile(req.user.prosumerId);
  }

  /**
   * Logout from Current Session
   *
   * Invalidates the current JWT token by adding it to the blacklist.
   * Only affects the current device/session. Other active sessions remain valid.
   *
   * @param req - Request object containing authenticated user and JWT token
   * @returns Success message confirming logout
   *
   * @example
   * POST /auth/logout
   * Headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
   *
   * Response: {
   *   "message": "Logout successful",
   *   "timestamp": "2025-10-23T07:15:00.000Z"
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
    schema: {
      example: {
        message: 'Logged out successfully',
        timestamp: '2025-10-23T07:15:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired JWT token',
    schema: {
      example: {
        message: '...',
        error: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  async logout(
    @Request() req: ExpressRequest & { user: { prosumerId: string } },
  ) {
    // Token akan diambil otomatis dari Authorization header
    return await this.authService.logout(req.user.prosumerId, undefined, req);
  }

  /**
   * Logout from All Sessions
   *
   * Invalidates all JWT tokens for the authenticated user across all devices.
   * This is useful for security purposes when user suspects unauthorized access.
   *
   * @param req - Request object containing authenticated user
   * @returns Success message confirming all sessions logged out
   *
   * @example
   * POST /auth/logout-all
   * Headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
   *
   * Response: {
   *   "message": "All sessions logged out successfully",
   *   "devicesLoggedOut": 5,
   *   "timestamp": "2025-10-23T07:15:00.000Z"
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
    schema: {
      example: {
        message: 'Logged out from all devices successfully',
        timestamp: '2025-07-19T12:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired JWT token',
    schema: {
      example: {
        message: '...',
        error: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  async logoutAll(
    @Request() req: ExpressRequest & { user: { prosumerId: string } },
  ) {
    return await this.authService.logoutAll(req.user.prosumerId, req);
  }
}
