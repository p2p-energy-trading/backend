import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Prosumers } from '../../Prosumers/entities/Prosumers.entity';
import { Wallets } from '../../Wallets/entities/Wallets.entity';
import { TransactionLogs } from '../../TransactionLogs/entities/TransactionLogs.entity';

@Entity()
export class TradeOrdersCache {
  @PrimaryColumn({ type: 'varchar', name: 'order_id' })
  orderId: string;

  @Column({ type: 'varchar', name: 'prosumer_id' })
  prosumerId: string;

  @Column({ type: 'varchar', name: 'wallet_address' })
  walletAddress: string;

  @Column({ type: 'varchar', name: 'order_type' })
  orderType: string;

  @Column({ type: 'varchar', name: 'pair' })
  pair: string;

  @Column({ type: 'decimal', name: 'amount_etk' })
  amountEtk: number;

  @Column({ type: 'decimal', name: 'price_idrs_per_etk' })
  priceIdrsPerEtk: number;

  @Column({ type: 'decimal', name: 'total_idrs_value', nullable: true })
  totalIdrsValue: number;

  @Column({ type: 'varchar', name: 'status_on_chain' })
  statusOnChain: string;

  @Column({ type: 'timestamp', name: 'created_at_on_chain' })
  createdAtOnChain: Date;

  @Column({ type: 'timestamp', name: 'updated_at_cache' })
  updatedAtCache: Date;

  @Column({
    type: 'varchar',
    name: 'blockchain_tx_hash_placed',
    nullable: true,
  })
  blockchainTxHashPlaced: string;

  @Column({
    type: 'varchar',
    name: 'blockchain_tx_hash_filled',
    nullable: true,
  })
  blockchainTxHashFilled: string;

  @Column({
    type: 'varchar',
    name: 'blockchain_tx_hash_cancelled',
    nullable: true,
  })
  blockchainTxHashCancelled: string;

  @ManyToOne(() => Prosumers)
  @JoinColumn({ name: 'prosumer_id' })
  prosumers: Prosumers;

  @ManyToOne(() => Wallets)
  @JoinColumn({ name: 'wallet_address' })
  wallets: Wallets;

  @OneToMany(
    () => TransactionLogs,
    (TransactionLogs) => TransactionLogs.tradeorderscache,
  )
  transactionlogsList: TransactionLogs[];
}
