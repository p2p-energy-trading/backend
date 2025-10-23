import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({
    summary: 'Login to the system',
    description:
      'Authenticate user with username/email and password, returns JWT token',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials',
  })
  login(@Request() req: { user: ValidatedProsumer }) {
    // User sudah divalidasi oleh LocalAuthGuard, tersedia di req.user
    return this.authService.generateTokens(req.user);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register new account',
    description:
      'Create a new prosumer account with username, email, and password',
  })
  @ApiBody({
    type: RegisterDto,
    examples: {
      example1: {
        summary: 'Basic registration',
        value: {
          username: 'john_doe',
          email: 'john.doe@example.com',
          password: 'SecurePassword123',
          fullName: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Username or email already exists',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieve authenticated user profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getProfile(@Request() req: { user: { prosumerId: string } }) {
    return this.authService.getProfile(req.user.prosumerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout from current session',
    description: 'Invalidate the current JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async logout(
    @Request() req: ExpressRequest & { user: { prosumerId: string } },
  ) {
    // Token akan diambil otomatis dari Authorization header
    return await this.authService.logout(req.user.prosumerId, undefined, req);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout from all sessions',
    description: 'Invalidate all JWT tokens for the user across all devices',
  })
  @ApiResponse({
    status: 200,
    description: 'All sessions logged out successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async logoutAll(
    @Request() req: ExpressRequest & { user: { prosumerId: string } },
  ) {
    return await this.authService.logoutAll(req.user.prosumerId, req);
  }
}
