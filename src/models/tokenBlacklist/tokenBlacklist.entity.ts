// entities/token-blacklist.entity.ts
import { User } from '../user/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

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

@Entity('token_blacklist')
@Index(['userId'])
@Index(['blacklistType'])
@Index(['tokenHash'])
@Index(['expiresAt'])
@Index(['isActive'])
export class TokenBlacklist {
  @PrimaryGeneratedColumn({ name: 'blacklist_id' })
  blacklistId: number;

  @Column({
    type: 'enum',
    enum: BlacklistType,
    name: 'blacklist_type',
  })
  blacklistType: BlacklistType;

  @Column({ name: 'user_id', length: 255 })
  userId: string;

  @Column({ name: 'token_hash', length: 255, nullable: true })
  tokenHash: string;

  @Column({
    type: 'enum',
    enum: BlacklistReason,
    default: BlacklistReason.LOGOUT,
  })
  reason: BlacklistReason;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', length: 255, nullable: true })
  createdBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  prosumer: User;
}
