import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
// Removed: TradeOrdersCache (replaced by Redis)
import { User } from '../user/user.entity';
import { EnergySettlement } from '../energySettlement/energySettlement.entity';

@Entity('transaction_log')
export class TransactionLog {
  @PrimaryGeneratedColumn({ name: 'log_id' })
  logId: number;

  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

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

  // Removed: ManyToOne relation to TradeOrdersCache (replaced by Redis)
  // related_order_id remains as a simple column for reference

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  users: User;

  @ManyToOne(() => EnergySettlement)
  @JoinColumn({ name: 'related_settlement_id' })
  energysettlements: EnergySettlement;
}
