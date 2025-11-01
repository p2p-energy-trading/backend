import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { IdrsConversion } from '../idrsConversion/idrsConversion.entity';
import { MarketTrade } from '../marketTrade/marketTrade.entity';
import { SmartMeter } from '../smartMeter/smartMeter.entity';
// Removed: TradeOrdersCache (replaced by Redis)
import { TransactionLog } from '../transactionLog/transactionLog.entity';
import { Wallet } from '../wallet/wallet.entity';

// Removed imports for unused entities:
// - BlockchainApprovals (not used)
// - DeviceCommands (replaced by Redis)

@Entity('prosumer')
export class User {
  @PrimaryColumn({ type: 'varchar', name: 'prosumer_id' })
  prosumerId: string;

  @Column({ type: 'varchar', name: 'email' })
  email: string;

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', name: 'name', nullable: true })
  name: string;

  @Column({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar', name: 'primary_wallet_address', nullable: true })
  primaryWalletAddress: string;

  // Removed OneToMany relations for unused entities:
  // - BlockchainApprovals (not used)
  // - DeviceCommands (replaced by Redis)

  @OneToMany(
    () => IdrsConversion,
    (IdrsConversions) => IdrsConversions.prosumers,
  )
  idrsconversionsList: IdrsConversion[];

  @OneToMany(() => MarketTrade, (MarketTrades) => MarketTrades.prosumers)
  markettradesList: MarketTrade[];

  @OneToMany(() => MarketTrade, (MarketTrades) => MarketTrades.prosumers)
  markettradesList2: MarketTrade[];

  @OneToMany(() => SmartMeter, (SmartMeters) => SmartMeters.prosumers)
  smartmetersList: SmartMeter[];

  // Removed: tradeorderscacheList (replaced by Redis)

  @OneToMany(
    () => TransactionLog,
    (TransactionLogs) => TransactionLogs.prosumers,
  )
  transactionlogsList: TransactionLog[];

  @OneToMany(() => Wallet, (Wallets) => Wallets.prosumers)
  walletsList: Wallet[];
}
