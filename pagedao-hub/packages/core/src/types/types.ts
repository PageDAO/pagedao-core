// src/state/types.ts
import { ChainId } from '@pagedao/core';

export interface TokenPrice {
  price: number;
  change24h: number;
  lastUpdated: number; // timestamp
}

export interface PoolData {
  address: string;
  reserve0: number;
  reserve1: number;
  tvl: number;
  volume24h?: number;
  fee?: number;
}

export interface TokenSupply {
  circulating: number;
  total: number;
  lastUpdated: number; // timestamp
}

export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}

export interface AppState {
  // Token price data
  token: {
    prices: Record<ChainId, TokenPrice>;
    weightedPrice: number;
    weightedPriceChange24h: number;
    priceHistory: {
      timeframe: '24h' | '7d' | '30d' | '90d' | '1y';
      data: Record<ChainId, PriceHistoryPoint[]>;
      aggregated: PriceHistoryPoint[];
      lastUpdated: number;
    };
    supply: TokenSupply;
    loading: {
      prices: boolean;
      history: boolean;
      supply: boolean;
    };
    error: {
      prices: string | null;
      history: string | null;
      supply: string | null;
    };
  };

  // Liquidity data
  liquidity: {
    totalTvl: number;
    tvlByChain: Record<ChainId, number>;
    pools: Record<ChainId, PoolData[]>;
    loading: boolean;
    error: string | null;
    lastUpdated: number;
  };

  // UI state
  ui: {
    theme: 'light' | 'dark';
    selectedTimeframe: '24h' | '7d' | '30d' | '90d' | '1y';
    selectedChains: ChainId[];
    dashboardView: 'overview' | 'prices' | 'liquidity' | 'governance';
    notifications: Array<{
      id: string;
      type: 'info' | 'success' | 'warning' | 'error';
      message: string;
      timestamp: number;
    }>;
  };

  // Webhook received data
  webhooks: {
    lastUpdate: {
      source: string;
      data: any;
      timestamp: number;
    } | null;
    history: Array<{
      source: string;
      event: string;
      timestamp: number;
    }>;
  };
}
