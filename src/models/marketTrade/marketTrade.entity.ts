import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Wallet } from '../wallet/wallet.entity';

@Entity('market_trade')
export class MarketTrade {
  @PrimaryGeneratedColumn({ name: 'trade_id' })
  tradeId: number;

  @Column({ type: 'varchar', name: 'buyer_order_id' })
  buyerOrderId: string;

  @Column({ type: 'varchar', name: 'seller_order_id' })
  sellerOrderId: string;

  @Column({ type: 'varchar', name: 'buyer_prosumer_id' })
  buyerProsumerId: string;

  @Column({ type: 'varchar', name: 'seller_prosumer_id' })
  sellerProsumerId: string;

  @Column({ type: 'varchar', name: 'buyer_wallet_address' })
  buyerWalletAddress: string;

  @Column({ type: 'varchar', name: 'seller_wallet_address' })
  sellerWalletAddress: string;

  @Column({ type: 'decimal', name: 'traded_etk_amount' })
  tradedEtkAmount: number;

  @Column({ type: 'decimal', name: 'price_idrs_per_etk' })
  priceIdrsPerEtk: number;

  @Column({ type: 'decimal', name: 'total_idrs_value' })
  totalIdrsValue: number;

  @Column({ type: 'varchar', name: 'blockchain_tx_hash', nullable: true })
  blockchainTxHash: string;

  @Column({ type: 'timestamp', name: 'trade_timestamp' })
  tradeTimestamp: Date;

  @Column({ type: 'decimal', name: 'gas_fee_wei', nullable: true })
  gasFeeWei: number;

  @Column({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyer_prosumer_id' })
  prosumers: User;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'buyer_wallet_address' })
  wallets: Wallet;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_prosumer_id' })
  prosumers2: User;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'seller_wallet_address' })
  wallets2: Wallet;
}
