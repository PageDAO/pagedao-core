// packages/core/src/types/index.ts

/**
 * Supported blockchain networks
 */
export type ChainId = 
  | 'ethereum' 
  | 'optimism' 
  | 'base' 
  | 'osmosis';

/**
 * Pool reserve data structure
 */
export interface PoolReserves {
  tokenAAmount: number;  // PAGE token amount
  tokenBAmount: number;  // ETH or other paired token amount
}

/**
 * Price data structure
 */
export interface PriceData {
  ethereum: number;
  optimism: number;
  base: number;
  osmosis: number;
  timestamp: number;
  ethPrice: number;
  osmosisTVL?: number;
}

/**
 * TVL data structure
 */
export interface TVLData {
  total: number;
  byChain: Record<ChainId, number>;
  timestamp: number;
}

/**
 * Options for weighted price calculation
 */
export interface WeightedPriceOptions {
  excludeChains?: ChainId[];
  minLiquidityThreshold?: number;
  manualWeights?: Record<ChainId, number>;
}

/**
 * Token metrics data structure
 */
export interface TokenMetrics {
  price: {
    current: number;
    byChain: Record<ChainId, number>;
    weightedAverage: number;
    change24h?: number;
  };
  supply: {
    circulating: number;
    total: number;
  };
  marketCap: number;
  fullyDilutedValue: number;
  timestamp: number;
}

/**
 * Blockchain connector interface
 */
export interface BlockchainConnector {
  getChainId(): ChainId;
  fetchTokenPrice(): Promise<number>;
  fetchPoolReserves(): Promise<PoolReserves>;
  fetchTVL(): Promise<number>;
  isAvailable(): Promise<boolean>;
}
