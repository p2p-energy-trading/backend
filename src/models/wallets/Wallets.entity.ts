import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IdrsConversions } from '../idrsConversion/idrsConversion.entity';
import { MarketTrades } from '../marketTrade/marketTrade.entity';
import { TradeOrdersCache } from '../tradeOrdersCache/TradeOrdersCache.entity';
import { Prosumers } from '../prosumer/user.entity';

// Removed: BlockchainApprovals (not used)

@Entity()
export class Wallets {
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

  @OneToMany(
    () => IdrsConversions,
    (IdrsConversions) => IdrsConversions.wallets,
  )
  idrsconversionsList: IdrsConversions[];

  @OneToMany(() => MarketTrades, (MarketTrades) => MarketTrades.wallets)
  markettradesList: MarketTrades[];

  @OneToMany(() => MarketTrades, (MarketTrades) => MarketTrades.wallets)
  markettradesList2: MarketTrades[];

  @OneToMany(
    () => TradeOrdersCache,
    (TradeOrdersCache) => TradeOrdersCache.wallets,
  )
  tradeorderscacheList: TradeOrdersCache[];

  @ManyToOne(() => Prosumers)
  @JoinColumn({ name: 'prosumer_id' })
  prosumers: Prosumers;
}
