import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketTrade } from './marketTrade.entity';
import { CreateMarketTradesInput } from './dto/marketTrade.input';
import { MarketTradesArgs } from './dto/marketTrade.args';
import { User } from '../user/user.entity';
import { Wallet } from '../wallet/wallet.entity';

@Injectable()
export class MarketTradesService {
  constructor(
    @InjectRepository(MarketTrade)
    private readonly repo: Repository<MarketTrade>,
    @InjectRepository(User)
    private readonly ProsumersRepo: Repository<User>,
    @InjectRepository(Wallet)
    private readonly WalletsRepo: Repository<Wallet>,
  ) {}

  async findAll(args?: MarketTradesArgs): Promise<MarketTrade[]> {
    // Simple filter: remove undefined keys
    const where = {};
    if (args && args.tradeId !== undefined) where['tradeId'] = args.tradeId;
    if (args && args.buyerOrderId !== undefined)
      where['buyerOrderId'] = args.buyerOrderId;
    if (args && args.sellerOrderId !== undefined)
      where['sellerOrderId'] = args.sellerOrderId;
    if (args && args.buyerUserId !== undefined)
      where['buyerUserId'] = args.buyerUserId;
    if (args && args.sellerUserId !== undefined)
      where['sellerUserId'] = args.sellerUserId;
    if (args && args.buyerWalletAddress !== undefined)
      where['buyerWalletAddress'] = args.buyerWalletAddress;
    if (args && args.sellerWalletAddress !== undefined)
      where['sellerWalletAddress'] = args.sellerWalletAddress;
    if (args && args.tradedEtkAmount !== undefined)
      where['tradedEtkAmount'] = args.tradedEtkAmount;
    if (args && args.priceIdrsPerEtk !== undefined)
      where['priceIdrsPerEtk'] = args.priceIdrsPerEtk;
    if (args && args.totalIdrsValue !== undefined)
      where['totalIdrsValue'] = args.totalIdrsValue;
    if (args && args.blockchainTxHash !== undefined)
      where['blockchainTxHash'] = args.blockchainTxHash;
    if (args && args.tradeTimestamp !== undefined)
      where['tradeTimestamp'] = args.tradeTimestamp;
    if (args && args.gasFeeWei !== undefined)
      where['gasFeeWei'] = args.gasFeeWei;
    if (args && args.createdAt !== undefined)
      where['createdAt'] = args.createdAt;

    return this.repo.find({ where });
  }

  async findOne(tradeId: number): Promise<MarketTrade> {
    const relations = ['prosumers', 'wallets', 'prosumers2', 'wallets2'];
    const entity = await this.repo.findOne({ where: { tradeId }, relations });
    if (!entity) {
      throw new Error(`MarketTrades with tradeId ${'$'}{tradeId} not found`);
    }
    return entity;
  }

  async create(input: CreateMarketTradesInput): Promise<MarketTrade> {
    // Convert input types to match entity types
    const createData: Partial<MarketTrade> = {
      buyerOrderId: input.buyerOrderId,
      sellerOrderId: input.sellerOrderId,
      buyerUserId: input.buyerUserId,
      sellerUserId: input.sellerUserId,
      buyerWalletAddress: input.buyerWalletAddress,
      sellerWalletAddress: input.sellerWalletAddress,
      tradedEtkAmount: input.tradedEtkAmount,
      priceIdrsPerEtk: input.priceIdrsPerEtk,
      totalIdrsValue: input.totalIdrsValue,
      blockchainTxHash: input.blockchainTxHash,
      gasFeeWei: input.gasFeeWei,
      createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
      tradeTimestamp: input.tradeTimestamp
        ? new Date(input.tradeTimestamp)
        : new Date(),
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.tradeId);
  }

  async update(
    tradeId: number,
    input: CreateMarketTradesInput,
  ): Promise<MarketTrade> {
    const existing = await this.findOne(tradeId);

    // Convert input types to match entity types
    const updateData: Partial<MarketTrade> = {
      buyerOrderId: input.buyerOrderId,
      sellerOrderId: input.sellerOrderId,
      buyerUserId: input.buyerUserId,
      sellerUserId: input.sellerUserId,
      buyerWalletAddress: input.buyerWalletAddress,
      sellerWalletAddress: input.sellerWalletAddress,
      tradedEtkAmount: input.tradedEtkAmount,
      priceIdrsPerEtk: input.priceIdrsPerEtk,
      totalIdrsValue: input.totalIdrsValue,
      blockchainTxHash: input.blockchainTxHash,
      gasFeeWei: input.gasFeeWei,
      tradeTimestamp: input.tradeTimestamp
        ? new Date(input.tradeTimestamp)
        : existing.tradeTimestamp,
      createdAt: input.createdAt
        ? new Date(input.createdAt)
        : existing.createdAt,
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(tradeId);
  }

  async remove(tradeId: number): Promise<boolean> {
    const result = await this.repo.delete({ tradeId });
    return (result.affected ?? 0) > 0;
  }

  async findRecentTrades(limit: number = 100): Promise<MarketTrade[]> {
    try {
      return await this.repo.find({
        order: {
          tradeTimestamp: 'DESC',
        },
        take: limit,
      });
    } catch (error) {
      console.error('Error finding recent trades:', error);
      throw error;
    }
  }

  async getPriceHistory(
    interval: string,
    limit: number,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    try {
      // Convert interval to SQL interval
      const sqlInterval = this.convertIntervalToSQL(interval);

      // Use raw SQL for efficient OHLCV calculation
      const query = `
        WITH time_buckets AS (
          SELECT 
            DATE_TRUNC('${sqlInterval}', trade_timestamp) as time_bucket,
            trade_timestamp,
            price_idrs_per_etk,
            traded_etk_amount,
            ROW_NUMBER() OVER (
              PARTITION BY DATE_TRUNC('${sqlInterval}', trade_timestamp) 
              ORDER BY trade_timestamp ASC
            ) as rn_asc,
            ROW_NUMBER() OVER (
              PARTITION BY DATE_TRUNC('${sqlInterval}', trade_timestamp) 
              ORDER BY trade_timestamp DESC
            ) as rn_desc
          FROM market_trades 
          WHERE trade_timestamp >= $1 AND trade_timestamp <= $2
        ),
        ohlcv_data AS (
          SELECT 
            time_bucket,
            MAX(CASE WHEN rn_asc = 1 THEN price_idrs_per_etk END) as open,
            MAX(price_idrs_per_etk) as high,
            MIN(price_idrs_per_etk) as low,
            MAX(CASE WHEN rn_desc = 1 THEN price_idrs_per_etk END) as close,
            SUM(traded_etk_amount) as volume,
            COUNT(*) as trades_count
          FROM time_buckets
          GROUP BY time_bucket
        )
        SELECT 
          time_bucket as time,
          COALESCE(open, 0) as open,
          COALESCE(high, 0) as high,
          COALESCE(low, 0) as low,
          COALESCE(close, 0) as close,
          COALESCE(volume, 0) as volume,
          trades_count
        FROM ohlcv_data
        ORDER BY time_bucket ASC
        LIMIT $3
      `;

      const result = await this.repo.query(query, [startTime, endTime, limit]);

      return result.map((row: any) => ({
        time: row.time,
        open: parseFloat(row.open) || 0,
        high: parseFloat(row.high) || 0,
        low: parseFloat(row.low) || 0,
        close: parseFloat(row.close) || 0,
        volume: parseFloat(row.volume) || 0,
        trades: parseInt(row.trades_count) || 0,
      }));
    } catch (error) {
      console.error('Error getting price history:', error);
      throw error;
    }
  }

  async getPriceCandles(interval: string, limit: number): Promise<any[]> {
    try {
      const endTime = new Date();
      const startTime = new Date(
        endTime.getTime() - this.getIntervalMs(interval) * limit,
      );

      return await this.getPriceHistory(interval, limit, startTime, endTime);
    } catch (error) {
      console.error('Error getting price candles:', error);
      throw error;
    }
  }

  private convertIntervalToSQL(interval: string): string {
    const intervalMap: Record<string, string> = {
      '1s': 'second',
      '1m': 'minute',
      '5m': 'minute', // Will be grouped by 5-minute intervals
      '15m': 'minute', // Will be grouped by 15-minute intervals
      '1h': 'hour',
      '1d': 'day',
    };

    return intervalMap[interval] || 'minute';
  }

  private getIntervalMs(interval: string): number {
    const intervalMap: Record<string, number> = {
      '1s': 1000,
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };

    return intervalMap[interval] || 60 * 1000;
  }
}
