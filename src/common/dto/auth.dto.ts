import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, IsEmail } from 'class-validator';
import { WalletInfoDto } from './wallet.dto';

export class RegisterDto {
  @ApiProperty({
    description: 'Username for the prosumer account',
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
    description: 'Username or email',
    example: 'john_doe',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Account password',
    example: 'SecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

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
      prosumerId: 'prosumer_...',
      email: 'john.doe@example.com',
      name: 'John Doe',
    },
  })
  user: {
    prosumerId: string;
    email: string;
    name: string;
  };
}

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
    description: 'Login information',
    example: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      tokenType: 'Bearer',
      expiresIn: 3600,
      prosumer: {
        prosumerId: 'prosumer_...',
        email: 'john.doe@example.com',
        name: 'John Doe',
      },
    },
  })
  loginInfo: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    prosumer: {
      prosumerId: string;
      email: string;
      name: string;
    };
  };
}

class ProfileInfoDto {
  @ApiProperty({
    description: 'Prosumer ID',
    example: 'prosumer_...',
  })
  prosumerId: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Prosumer name',
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

export class ProfileResponseDto {
  @ApiProperty({
    description: 'Prosumer account details',
    type: ProfileInfoDto,
  })
  profile: ProfileInfoDto;

  @ApiProperty({
    description: 'List of associated wallets',
    type: [WalletInfoDto],
    example: [
      {
        walletAddress: '0xabcd...',
        walletName: "Jhon Doe's Wallet",
        isActive: true,
        createdAt: '2025-07-19T12:00:00.000Z',
      },
    ],
  })
  wallets: WalletInfoDto[];

  @ApiProperty({
    description: 'List of associated smart meters',
    type: [MeterInfoDto],
    example: [
      {
        meterId: 'METER001',
        location: 'Bandung, Indonesia',
        status: 'ACTIVE',
        createdAt: '2025-07-19T12:00:00.000Z',
        lastSeen: '2025-07-19T12:00:00.000Z',
        deviceModel: 'Generic Smart Meter',
        deviceVersion: '1.0.0',
      },
    ],
  })
  meters: MeterInfoDto[];
}
