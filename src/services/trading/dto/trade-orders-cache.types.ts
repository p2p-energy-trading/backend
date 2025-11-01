/**
 * Type definitions for Trade Orders Cache (Redis-based)
 * These replace the old PostgreSQL-based DTOs
 */

export interface CreateTradeOrdersCacheInput {
  orderId: string;
  prosumerId: string;
  walletAddress: string;
  orderType: string;
  pair: string;
  amountEtk: number;
  priceIdrsPerEtk: number;
  totalIdrsValue?: number;
  statusOnChain: string;
  createdAtOnChain?: string;
  updatedAtCache?: string;
  blockchainTxHashPlaced?: string;
  blockchainTxHashFilled?: string;
  blockchainTxHashCancelled?: string;
}

export interface TradeOrdersCacheArgs {
  orderId?: string;
  prosumerId?: string;
  walletAddress?: string;
  orderType?: string;
  pair?: string;
  amountEtk?: number;
  priceIdrsPerEtk?: number;
  totalIdrsValue?: number;
  statusOnChain?: string;
  createdAtOnChain?: string;
  updatedAtCache?: string;
  blockchainTxHashPlaced?: string;
  blockchainTxHashFilled?: string;
  blockchainTxHashCancelled?: string;
}
