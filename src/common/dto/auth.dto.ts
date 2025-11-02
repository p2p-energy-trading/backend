import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, IsEmail } from 'class-validator';
import { WalletInfoDto } from './wallet.dto';

export class RegisterDto {
  @ApiProperty({
    description: 'Username for the user account',
    example: 'john_doe',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password (minimum 6 characters)',
    example: 'SecurePassword123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'Email',
    example: 'john_doe@example.com',
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Account password',
    example: 'SecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

/**
 * Login Response Data (inside ResponseFormatter wrapper)
 */
export class LoginDataDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'User information',
    example: {
      userId: 'user_...',
      email: 'john.doe@example.com',
      name: 'John Doe',
    },
  })
  prosumer: {
    userId: string;
    email: string;
    name: string;
  };
}

/**
 * Complete Login Response with ResponseFormatter wrapper
 */
export class LoginResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Login successful',
  })
  message: string;

  @ApiProperty({
    description: 'Login data with JWT token',
    example: {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      tokenType: 'Bearer',
      expiresIn: 3600,
      prosumer: {
        userId: 'user_...',
        email: 'john.doe@example.com',
        name: 'John Doe',
      },
    },
  })
  data: LoginDataDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    timestamp: string;
  };
}

/**
 * Register Response Data (inside ResponseFormatter wrapper)
 */
export class RegisterDataDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Registered prosumer information',
    example: {
      userId: 'user_...',
      email: 'john.doe@example.com',
      name: 'John Doe',
      createdAt: '2025-11-01T10:30:00.000Z',
      updatedAt: '2025-11-01T10:30:00.000Z',
    },
  })
  prosumer: {
    userId: string;
    email: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Complete Register Response with ResponseFormatter wrapper
 */
export class RegisterResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'User registered successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Registration data with auto-login JWT token',
  })
  data: RegisterDataDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    timestamp: string;
  };
}

class ProfileInfoDto {
  @ApiProperty({
    description: 'Prosumer ID',
    example: 'user_...',
  })
  userId: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Primary wallet address',
    example: '0xabcd...',
    nullable: true,
  })
  primaryWalletAddress: string | null;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2025-07-19T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last account update timestamp',
    example: '2025-07-19T12:00:00.000Z',
  })
  updatedAt: string;
}

class MeterInfoDto {
  @ApiProperty({
    description: 'Smart meter device ID',
    example: 'METER001',
  })
  meterId: string;

  @ApiProperty({
    description: 'Physical location of the smart meter',
    example: 'Bandung, Indonesia',
  })
  location: string;

  @ApiProperty({
    description: 'Current operational status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR'],
  })
  status: string;

  @ApiProperty({
    description: 'Meter registration timestamp',
    example: '2025-07-19T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last heartbeat/communication timestamp',
    example: '2025-07-19T12:00:00.000Z',
    nullable: true,
  })
  lastSeen: string | null;

  @ApiProperty({
    description: 'Smart meter device model',
    example: 'Generic Smart Meter',
  })
  deviceModel: string;

  @ApiProperty({
    description: 'Device firmware/software version',
    example: '1.0.0',
  })
  deviceVersion: string;
}

/**
 * Profile Response with ResponseFormatter wrapper
 */
export class ProfileResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Profile retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Profile data with account, wallets, and meters information',
    example: {
      profile: {
        userId: 'user_...',
        email: 'john.doe@example.com',
        name: 'John Doe',
        primaryWalletAddress: '0xabcd...',
        createdAt: '2025-11-01T10:30:00.000Z',
        updatedAt: '2025-11-01T10:30:00.000Z',
      },
      wallets: [
        {
          walletAddress: '0xabcd...',
          walletName: "John Doe's Wallet",
          isActive: true,
          createdAt: '2025-11-01T10:30:00.000Z',
        },
      ],
      meters: [
        {
          meterId: 'METER001',
          location: 'Bandung, Indonesia',
          status: 'ACTIVE',
          createdAt: '2025-11-01T10:30:00.000Z',
          lastSeen: '2025-11-01T10:30:00.000Z',
          deviceModel: 'Generic Smart Meter',
          deviceVersion: '1.0.0',
        },
      ],
    },
  })
  data: {
    profile: ProfileInfoDto;
    wallets: WalletInfoDto[];
    meters: MeterInfoDto[];
  };

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    timestamp: string;
  };
}
