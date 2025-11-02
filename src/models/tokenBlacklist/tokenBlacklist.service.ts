import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { createHash } from 'crypto';
import { TokenBlacklist } from './tokenBlacklist.entity';

export enum BlacklistType {
  TOKEN = 'TOKEN',
  USER = 'USER',
}

export enum BlacklistReason {
  LOGOUT = 'LOGOUT',
  LOGOUT_ALL_DEVICES = 'LOGOUT_ALL_DEVICES',
  SECURITY_BREACH = 'SECURITY_BREACH',
  ADMIN_ACTION = 'ADMIN_ACTION',
  EXPIRED = 'EXPIRED',
}

@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);

  constructor(
    @InjectRepository(TokenBlacklist)
    private blacklistRepository: Repository<TokenBlacklist>,
    private configService: ConfigService,
  ) {}

  // Blacklist specific token
  async blacklistToken(
    token: string,
    userId: string,
    reason: BlacklistReason = BlacklistReason.LOGOUT,
    ipAddress?: string,
    userAgent?: string,
    notes?: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.getJwtExpirationMs());

    // this.logger.debug(
    //   `Original token: ${token}, Prosumer ID: ${userId}, Reason: ${reason}`,
    // );

    // this.logger.debug(
    //   `Blacklisting token for prosumer ${userId}: ${tokenHash}`,
    // );

    // Check if token is already blacklisted
    const existing = await this.blacklistRepository.findOne({
      where: {
        tokenHash,
        blacklistType: BlacklistType.TOKEN,
        isActive: true,
      },
    });

    if (existing) {
      return; // Already blacklisted
    }

    const blacklistEntry = this.blacklistRepository.create({
      blacklistType: BlacklistType.TOKEN,
      userId,
      tokenHash,
      reason,
      ipAddress,
      userAgent,
      expiresAt,
      createdBy: 'SYSTEM',
      notes,
    });

    await this.blacklistRepository.save(blacklistEntry);
  }

  // Blacklist all tokens for a user (logout from all devices)
  async blacklistUser(
    userId: string,
    reason: BlacklistReason = BlacklistReason.LOGOUT_ALL_DEVICES,
    ipAddress?: string,
    userAgent?: string,
    createdBy: string = 'SYSTEM',
    notes?: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + this.getJwtExpirationMs());

    // Check if user is already blacklisted
    const existing = await this.blacklistRepository.findOne({
      where: {
        userId,
        blacklistType: BlacklistType.USER,
        isActive: true,
      },
    });

    if (existing) {
      // Update expiration time
      existing.expiresAt = expiresAt;
      existing.reason = reason;
      existing.notes = notes || existing.notes;
      await this.blacklistRepository.save(existing);
      return;
    }

    const blacklistEntry = this.blacklistRepository.create({
      blacklistType: BlacklistType.USER,
      userId,
      tokenHash: undefined,
      reason,
      ipAddress,
      userAgent,
      expiresAt,
      createdBy,
      notes,
    });

    await this.blacklistRepository.save(blacklistEntry);
  }

  // Check if token is blacklisted
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      // this.logger.debug(`Checking if token is blacklisted: ${token}`);
      if (!token) {
        this.logger.warn('Token is empty or undefined');
        return false;
      }
      const tokenHash = this.hashToken(token);
      // this.logger.debug(`Hashed token: ${tokenHash}`);

      const blacklisted = await this.blacklistRepository.findOne({
        where: {
          tokenHash,
          blacklistType: BlacklistType.TOKEN,
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
      });

      // this.logger.debug(
      //   `Token ${tokenHash} is ${blacklisted ? 'blacklisted' : 'not blacklisted'}`,
      // );

      return !!blacklisted;
    } catch (error) {
      this.logger.error(
        `Error checking token blacklist status: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  // Check if user is blacklisted (all tokens invalid)
  async isUserBlacklisted(userId: string): Promise<boolean> {
    const blacklisted = await this.blacklistRepository.findOne({
      where: {
        userId,
        blacklistType: BlacklistType.USER,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
    });

    return !!blacklisted;
  }

  // Check if token or user is blacklisted (combined check)
  async isBlacklisted(token: string, userId: string): Promise<boolean> {
    const [tokenBlacklisted, userBlacklisted] = await Promise.all([
      this.isTokenBlacklisted(token),
      this.isUserBlacklisted(userId),
    ]);

    return tokenBlacklisted || userBlacklisted;
  }

  // Clear user from blacklist (allow login again)
  async clearUserBlacklist(userId: string): Promise<void> {
    await this.blacklistRepository.update(
      {
        userId,
        blacklistType: BlacklistType.USER,
        isActive: true,
      },
      {
        isActive: false,
      },
    );
  }

  // Clear specific token from blacklist
  async clearTokenBlacklist(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    await this.blacklistRepository.update(
      {
        tokenHash,
        blacklistType: BlacklistType.TOKEN,
        isActive: true,
      },
      {
        isActive: false,
      },
    );
  }

  // Get blacklist history for a user
  async getBlacklistHistory(
    userId: string,
    limit: number = 50,
  ): Promise<TokenBlacklist[]> {
    return this.blacklistRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // Clean up expired blacklist entries
  async cleanupExpiredEntries(): Promise<number> {
    const result = await this.blacklistRepository.update(
      {
        expiresAt: MoreThan(new Date()),
        isActive: true,
      },
      {
        isActive: false,
      },
    );

    return result.affected || 0;
  }

  // Get active blacklist count
  async getActiveBlacklistCount(): Promise<{ tokens: number; users: number }> {
    const [tokens, users] = await Promise.all([
      this.blacklistRepository.count({
        where: {
          blacklistType: BlacklistType.TOKEN,
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
      }),
      this.blacklistRepository.count({
        where: {
          blacklistType: BlacklistType.USER,
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
      }),
    ]);

    return { tokens, users };
  }

  // Bulk blacklist tokens (for security incidents)
  async bulkBlacklistTokens(
    tokenProsumerPairs: Array<{ token: string; userId: string }>,
    reason: BlacklistReason = BlacklistReason.SECURITY_BREACH,
    createdBy: string = 'ADMIN',
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + this.getJwtExpirationMs());

    const blacklistEntries = tokenProsumerPairs.map(({ token, userId }) =>
      this.blacklistRepository.create({
        blacklistType: BlacklistType.TOKEN,
        userId,
        tokenHash: this.hashToken(token),
        reason,
        expiresAt,
        createdBy,
        notes: 'Bulk blacklist operation',
      }),
    );

    await this.blacklistRepository.save(blacklistEntries);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getJwtExpirationMs(): number {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';

    // Convert to milliseconds
    if (expiresIn.includes('d')) {
      return parseInt(expiresIn) * 24 * 60 * 60 * 1000;
    }
    if (expiresIn.includes('h')) {
      return parseInt(expiresIn) * 60 * 60 * 1000;
    }
    if (expiresIn.includes('m')) {
      return parseInt(expiresIn) * 60 * 1000;
    }
    if (expiresIn.includes('s')) {
      return parseInt(expiresIn) * 1000;
    }

    return 60 * 60 * 1000; // default 1 hour
  }
}
