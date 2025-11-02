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

@Entity('user')
export class User {
  @PrimaryColumn({ type: 'varchar', name: 'user_id' })
  userId: string;

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

  @OneToMany(() => IdrsConversion, (IdrsConversions) => IdrsConversions.users)
  idrsconversionsList: IdrsConversion[];

  @OneToMany(() => MarketTrade, (MarketTrades) => MarketTrades.users)
  markettradesList: MarketTrade[];

  @OneToMany(() => MarketTrade, (MarketTrades) => MarketTrades.users)
  markettradesList2: MarketTrade[];

  @OneToMany(() => SmartMeter, (SmartMeters) => SmartMeters.users)
  smartmetersList: SmartMeter[];

  // Removed: tradeorderscacheList (replaced by Redis)

  @OneToMany(() => TransactionLog, (TransactionLogs) => TransactionLogs.users)
  transactionlogsList: TransactionLog[];

  @OneToMany(() => Wallet, (Wallets) => Wallets.users)
  walletsList: Wallet[];
}
