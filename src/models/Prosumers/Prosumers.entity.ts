import { Entity, Column, PrimaryColumn, OneToMany, OneToOne } from 'typeorm';
import { BlockchainApprovals } from '../BlockchainApprovals/BlockchainApprovals.entity';
import { DeviceCommands } from '../DeviceCommands/DeviceCommands.entity';
import { IdrsConversions } from '../IdrsConversions/IdrsConversions.entity';
import { MarketTrades } from '../MarketTrades/MarketTrades.entity';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';
import { TradeOrdersCache } from '../TradeOrdersCache/TradeOrdersCache.entity';
import { TransactionLogs } from '../TransactionLogs/TransactionLogs.entity';
import { Wallets } from '../Wallets/Wallets.entity';

@Entity()
export class Prosumers {
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

  @OneToMany(
    () => BlockchainApprovals,
    (BlockchainApprovals) => BlockchainApprovals.prosumers,
  )
  blockchainapprovalsList: BlockchainApprovals[];

  @OneToMany(() => DeviceCommands, (DeviceCommands) => DeviceCommands.prosumers)
  devicecommandsList: DeviceCommands[];

  @OneToMany(
    () => IdrsConversions,
    (IdrsConversions) => IdrsConversions.prosumers,
  )
  idrsconversionsList: IdrsConversions[];

  @OneToMany(() => MarketTrades, (MarketTrades) => MarketTrades.prosumers)
  markettradesList: MarketTrades[];

  @OneToMany(() => MarketTrades, (MarketTrades) => MarketTrades.prosumers)
  markettradesList2: MarketTrades[];

  @OneToMany(() => SmartMeters, (SmartMeters) => SmartMeters.prosumers)
  smartmetersList: SmartMeters[];

  @OneToMany(
    () => TradeOrdersCache,
    (TradeOrdersCache) => TradeOrdersCache.prosumers,
  )
  tradeorderscacheList: TradeOrdersCache[];

  @OneToMany(
    () => TransactionLogs,
    (TransactionLogs) => TransactionLogs.prosumers,
  )
  transactionlogsList: TransactionLogs[];

  @OneToMany(() => Wallets, (Wallets) => Wallets.prosumers)
  walletsList: Wallets[];
}
