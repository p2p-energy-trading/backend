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
   * Authenticates a user with username/email and password.
   * Returns JWT access token for subsequent API requests.
   *
   * @param req - Request object containing validated user from LocalAuthGuard
   * @returns JWT token and user information
   *
   * @example
   * POST /auth/login
   * Body: {
   *   "username": "john_doe",
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
   * @throws {UnauthorizedException} Invalid credentials
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User Login',
    description:
      'Authenticate user with username/email and password. Returns JWT access token for API authentication.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User credentials for authentication',
    examples: {
      usernameLogin: {
        summary: 'Login with username',
        value: {
          username: 'john_doe',
          password: 'SecurePassword123',
        },
      },
      emailLogin: {
        summary: 'Login with email',
        value: {
          username: 'john.doe@example.com',
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
    description: 'Invalid credentials or user not found',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
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
   * Validates that username and email are unique.
   * Automatically hashes password using bcrypt.
   *
   * @param registerDto - Registration data including username, email, password, and full name
   * @returns Created prosumer information (password excluded)
   *
   * @example
   * POST /auth/register
   * Body: {
   *   "username": "john_doe",
   *   "email": "john.doe@example.com",
   *   "password": "SecurePassword123",
   *   "fullName": "John Doe"
   * }
   *
   * Response: {
   *   "prosumerId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
   *   "username": "john_doe",
   *   "email": "john.doe@example.com",
   *   "fullName": "John Doe",
   *   "createdAt": "2025-10-23T06:48:00.000Z"
   * }
   *
   * @throws {BadRequestException} Username or email already exists
   * @throws {BadRequestException} Invalid email format
   * @throws {BadRequestException} Password too weak
   */
  @Post('register')
  @ApiOperation({
    summary: 'Register New Account',
    description:
      'Create a new prosumer account with unique username and email. Password will be securely hashed before storage.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'Registration information for new account',
    examples: {
      basicRegistration: {
        summary: 'Basic registration',
        value: {
          username: 'john_doe',
          email: 'john.doe@example.com',
          password: 'SecurePassword123',
          fullName: 'John Doe',
        },
      },
      prosumerRegistration: {
        summary: 'Prosumer with details',
        value: {
          username: 'solar_user',
          email: 'solar@example.com',
          password: 'MySecurePass456!',
          fullName: 'Solar Energy User',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Username or email already exists, or validation failed',
    schema: {
      example: {
        statusCode: 400,
        message: 'Username already exists',
        error: 'Bad Request',
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Get User Profile
   *
   * Retrieves the complete profile of the authenticated user.
   * Requires valid JWT token in Authorization header.
   *
   * @param req - Request object containing authenticated user from JWT
   * @returns User profile information including wallet count, smart meter count, etc.
   *
   * @example
   * GET /auth/profile
   * Headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
   *
   * Response: {
   *   "prosumerId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
   *   "username": "john_doe",
   *   "email": "john.doe@example.com",
   *   "fullName": "John Doe",
   *   "createdAt": "2025-10-23T06:48:00.000Z",
   *   "updatedAt": "2025-10-23T07:15:00.000Z"
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
      'Retrieve authenticated user profile information including account details, timestamps, and related entities.',
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
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
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
        message: 'Logout successful',
        timestamp: '2025-10-23T07:15:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
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
        message: 'All sessions logged out successfully',
        devicesLoggedOut: 5,
        timestamp: '2025-10-23T07:15:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  async logoutAll(
    @Request() req: ExpressRequest & { user: { prosumerId: string } },
  ) {
    return await this.authService.logoutAll(req.user.prosumerId, req);
  }
}
