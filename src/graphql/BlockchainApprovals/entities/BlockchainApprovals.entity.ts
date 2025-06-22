import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Prosumers } from '../../Prosumers/entities/Prosumers.entity';
import { Wallets } from '../../Wallets/entities/Wallets.entity';

@Entity()
export class BlockchainApprovals {
  @PrimaryGeneratedColumn({ name: 'approval_id' })
  approvalId: number;

  @Column({ type: 'varchar', name: 'prosumer_id' })
  prosumerId: string;

  @Column({ type: 'varchar', name: 'wallet_address' })
  walletAddress: string;

  @Column({ type: 'varchar', name: 'spender_contract_address' })
  spenderContractAddress: string;

  @Column({ type: 'varchar', name: 'token_contract_address' })
  tokenContractAddress: string;

  @Column({ type: 'decimal', name: 'approved_amount' })
  approvedAmount: number;

  @Column({ type: 'varchar', name: 'approval_tx_hash', nullable: true })
  approvalTxHash: string;

  @Column({ type: 'varchar', name: 'status' })
  status: string;

  @Column({ type: 'timestamp', name: 'expires_at', nullable: true })
  expiresAt: Date;

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
