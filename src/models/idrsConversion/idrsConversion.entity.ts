import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Prosumers } from '../prosumer/user.entity';
import { Wallets } from '../wallet/Wallets.entity';

@Entity()
export class IdrsConversions {
  @PrimaryGeneratedColumn({ name: 'conversion_id' })
  conversionId: number;

  @Column({ type: 'varchar', name: 'prosumer_id' })
  prosumerId: string;

  @Column({ type: 'varchar', name: 'wallet_address' })
  walletAddress: string;

  @Column({ type: 'varchar', name: 'conversion_type' })
  conversionType: string;

  @Column({ type: 'decimal', name: 'idr_amount', nullable: true })
  idrAmount: number;

  @Column({ type: 'decimal', name: 'idrs_amount' })
  idrsAmount: number;

  @Column({ type: 'decimal', name: 'exchange_rate', nullable: true })
  exchangeRate: number;

  @Column({ type: 'varchar', name: 'blockchain_tx_hash', nullable: true })
  blockchainTxHash: string;

  @Column({ type: 'varchar', name: 'status' })
  status: string;

  @Column({ type: 'varchar', name: 'simulation_note', nullable: true })
  simulationNote: string;

  @Column({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', name: 'confirmed_at', nullable: true })
  confirmedAt: Date;

  @ManyToOne(() => Prosumers)
  @JoinColumn({ name: 'prosumer_id' })
  prosumers: Prosumers;

  @ManyToOne(() => Wallets)
  @JoinColumn({ name: 'wallet_address' })
  wallets: Wallets;
}
