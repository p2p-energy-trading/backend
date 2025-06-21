import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  } from 'typeorm';
import { BlockchainApprovals } from '../../BlockchainApprovals/entities/BlockchainApprovals.entity';
import { DeviceCommands } from '../../DeviceCommands/entities/DeviceCommands.entity';
import { IdrsConversions } from '../../IdrsConversions/entities/IdrsConversions.entity';
import { MarketTrades } from '../../MarketTrades/entities/MarketTrades.entity';
import { SmartMeters } from '../../SmartMeters/entities/SmartMeters.entity';
import { TradeOrdersCache } from '../../TradeOrdersCache/entities/TradeOrdersCache.entity';
import { TransactionLogs } from '../../TransactionLogs/entities/TransactionLogs.entity';
import { Wallets } from '../../Wallets/entities/Wallets.entity';

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

  @OneToMany(() => BlockchainApprovals, (BlockchainApprovals) => BlockchainApprovals.prosumers)
  blockchainapprovalsList: BlockchainApprovals[];

  @OneToMany(() => DeviceCommands, (DeviceCommands) => DeviceCommands.prosumers)
  devicecommandsList: DeviceCommands[];

  @OneToMany(() => IdrsConversions, (IdrsConversions) => IdrsConversions.prosumers)
  idrsconversionsList: IdrsConversions[];

  @OneToMany(() => MarketTrades, (MarketTrades) => MarketTrades.prosumers)
  markettradesList: MarketTrades[];

  @OneToMany(() => MarketTrades, (MarketTrades) => MarketTrades.prosumers)
  markettradesList2: MarketTrades[];

  @OneToMany(() => SmartMeters, (SmartMeters) => SmartMeters.prosumers)
  smartmetersList: SmartMeters[];

  @OneToMany(() => TradeOrdersCache, (TradeOrdersCache) => TradeOrdersCache.prosumers)
  tradeorderscacheList: TradeOrdersCache[];

  @OneToMany(() => TransactionLogs, (TransactionLogs) => TransactionLogs.prosumers)
  transactionlogsList: TransactionLogs[];

  @OneToMany(() => Wallets, (Wallets) => Wallets.prosumers)
  walletsList: Wallets[];
}
