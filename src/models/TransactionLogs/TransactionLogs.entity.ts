import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TradeOrdersCache } from '../TradeOrdersCache/TradeOrdersCache.entity';
import { Prosumers } from '../Prosumers/Prosumers.entity';
import { EnergySettlements } from '../EnergySettlements/EnergySettlements.entity';

@Entity()
export class TransactionLogs {
  @PrimaryGeneratedColumn({ name: 'log_id' })
  logId: number;

  @Column({ type: 'varchar', name: 'prosumer_id' })
  prosumerId: string;

  @Column({ type: 'varchar', name: 'related_order_id', nullable: true })
  relatedOrderId: string;

  @Column({ type: 'int', name: 'related_settlement_id', nullable: true })
  relatedSettlementId: number;

  @Column({ type: 'varchar', name: 'transaction_type' })
  transactionType: string;

  @Column({ type: 'varchar', name: 'description', nullable: true })
  description: string;

  @Column({ type: 'decimal', name: 'amount_primary' })
  amountPrimary: number;

  @Column({ type: 'varchar', name: 'currency_primary' })
  currencyPrimary: string;

  @Column({ type: 'decimal', name: 'amount_secondary', nullable: true })
  amountSecondary: number;

  @Column({ type: 'varchar', name: 'currency_secondary', nullable: true })
  currencySecondary: string;

  @Column({ type: 'varchar', name: 'blockchain_tx_hash', nullable: true })
  blockchainTxHash: string;

  @Column({ type: 'timestamp', name: 'transaction_timestamp' })
  transactionTimestamp: Date;

  @ManyToOne(() => TradeOrdersCache)
  @JoinColumn({ name: 'related_order_id' })
  tradeorderscache: TradeOrdersCache;

  @ManyToOne(() => Prosumers)
  @JoinColumn({ name: 'prosumer_id' })
  prosumers: Prosumers;

  @ManyToOne(() => EnergySettlements)
  @JoinColumn({ name: 'related_settlement_id' })
  energysettlements: EnergySettlements;
}
