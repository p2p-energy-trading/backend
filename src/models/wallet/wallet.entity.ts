import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IdrsConversion } from '../idrsConversion/idrsConversion.entity';
import { MarketTrade } from '../marketTrade/marketTrade.entity';
import { TradeOrdersCache } from '../tradeOrderCache/tradeOrderCache.entity';
import { User } from '../user/user.entity';

// Removed: BlockchainApprovals (not used)

@Entity('wallet')
export class Wallet {
  @PrimaryColumn({ type: 'varchar', name: 'wallet_address' })
  walletAddress: string;

  @Column({ type: 'varchar', name: 'prosumer_id' })
  prosumerId: string;

  @Column({ type: 'varchar', name: 'wallet_name', nullable: true })
  walletName: string;

  @Column({ type: 'varchar', name: 'encrypted_private_key', nullable: true })
  encryptedPrivateKey: string;

  @Column({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'varchar', name: 'import_method' })
  importMethod: string;

  @Column({ type: 'boolean', name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', name: 'last_used_at', nullable: true })
  lastUsedAt: Date;

  // Removed OneToMany relation for unused entity:
  // - BlockchainApprovals (not used)

  @OneToMany(() => IdrsConversion, (IdrsConversions) => IdrsConversions.wallets)
  idrsconversionsList: IdrsConversion[];

  @OneToMany(() => MarketTrade, (MarketTrades) => MarketTrades.wallets)
  markettradesList: MarketTrade[];

  @OneToMany(() => MarketTrade, (MarketTrades) => MarketTrades.wallets)
  markettradesList2: MarketTrade[];

  @OneToMany(
    () => TradeOrdersCache,
    (TradeOrdersCache) => TradeOrdersCache.wallets,
  )
  tradeorderscacheList: TradeOrdersCache[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'prosumer_id' })
  prosumers: User;
}
