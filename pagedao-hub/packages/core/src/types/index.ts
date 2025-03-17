// pagedao-hub/packages/core/src/types/index.ts

// Existing type from the codebase
export interface BlockchainConnector {
    getChainId(): ChainId;
    fetchTokenPrice(): Promise<number>;
    fetchPoolReserves(): Promise<PoolReserves>;
    fetchTVL(): Promise<number>;
    isAvailable(): Promise<boolean>;
  }
  
  // Chain identifiers
  export type ChainId = 'ethereum' | 'optimism' | 'base' | 'osmosis';
  
  // Pool reserves data structure
  export interface PoolReserves {
    token0: number;
    token1: number;
    timestamp: number;
  }
  
  // Token price information
  export interface TokenPrice {
    price: number;
    change24h: number;
    lastUpdated: number;
  }
  
  // Price history data point
  export interface PriceHistoryPoint {
    timestamp: number;
    price: number;
  }
  
  // Pool data structure
  export interface PoolData {
    address: string;
    reserve0: number;
    reserve1: number;
    tvl: number;
    volume24h?: number;
    fee?: number;
  }
  
  // Token supply information
  export interface TokenSupply {
    circulating: number;
    total: number;
    lastUpdated: number;
  }
  
  // Weighted price calculation options
  export interface WeightedPriceOptions {
    excludeChains?: ChainId[];
    minLiquidityThreshold?: number;
    manualWeights?: Record<ChainId, number>;
  }
  