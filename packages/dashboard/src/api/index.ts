// pagedao-hub/packages/dashboard/src/api/index.ts
import { 
    ChainId, 
    TokenPrice, 
    PriceHistoryPoint, 
    PoolData 
  } from '@pagedao/core';
  import { API_CONFIG } from '../config';
  
  // API configuration with fallback
  const API_BASE = API_CONFIG.baseUrl || '/api/v1';
  const DEFAULT_RETRY_COUNT = 2;
  const DEFAULT_RETRY_DELAY = 1000;
  
  /**
   * Utility function for making API requests with retry logic
   */
  async function fetchWithRetry<T>(
    url: string, 
    options?: RequestInit,
    retries = DEFAULT_RETRY_COUNT,
    delay = DEFAULT_RETRY_DELAY
  ): Promise<T> {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (retries > 0) {
        console.warn(`Retrying request to ${url} (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry<T>(url, options, retries - 1, delay * 1.5);
      }
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch current token prices across all chains
   */
  export async function fetchTokenPrices(): Promise<{
    prices: Record<ChainId, TokenPrice>;
    weightedPrice: number;
    weightedPriceChange24h: number;
  }> {
    return fetchWithRetry<{
      prices: Record<ChainId, TokenPrice>;
      weightedPrice: number;
      weightedPriceChange24h: number;
    }>(`${API_BASE}/token/price`);
  }
  
  /**
   * Fetch price history for a specific timeframe
   */
  export async function fetchPriceHistory(
    timeframe: string,
    resolution?: string
  ): Promise<{
    byChain: Record<ChainId, PriceHistoryPoint[]>;
    aggregated: PriceHistoryPoint[];
  }> {
    const url = new URL(`${API_BASE}/token/price/history`, window.location.origin);
    url.searchParams.append('timeframe', timeframe);
    if (resolution) {
      url.searchParams.append('resolution', resolution);
    }
    
    return fetchWithRetry<{
      byChain: Record<ChainId, PriceHistoryPoint[]>;
      aggregated: PriceHistoryPoint[];
    }>(url.toString());
  }
  
  /**
   * Fetch token supply information
   */
  export async function fetchTokenSupply(): Promise<{
    circulating: number;
    total: number;
  }> {
    return fetchWithRetry<{
      circulating: number;
      total: number;
    }>(`${API_BASE}/token/supply`);
  }
  
  /**
   * Fetch liquidity data across all chains
   */
  export async function fetchLiquidityData(): Promise<{
    totalTvl: number;
    tvlByChain: Record<ChainId, number>;
    pools: Record<ChainId, PoolData[]>;
  }> {
    return fetchWithRetry<{
      totalTvl: number;
      tvlByChain: Record<ChainId, number>;
      pools: Record<ChainId, PoolData[]>;
    }>(`${API_BASE}/liquidity/pools`);
  }
  
  /**
   * Fetch detailed information for a specific pool
   */
  export async function fetchPoolDetails(
    chainId: ChainId,
    poolAddress: string
  ): Promise<PoolData & {
    volume24h: number;
    volume7d: number;
    apr?: number;
    token0: {
      address: string;
      symbol: string;
      decimals: number;
    };
    // pagedao-hub/packages/dashboard/src/api/index.ts (continued)
  token1: {
    address: string;
    symbol: string;
    decimals: number;
  };
}> {
  return fetchWithRetry<PoolData & {
    volume24h: number;
    volume7d: number;
    apr?: number;
    token0: {
      address: string;
      symbol: string;
      decimals: number;
    };
    token1: {
      address: string;
      symbol: string;
      decimals: number;
    };
  }>(`${API_BASE}/liquidity/pools/${chainId}/${poolAddress}`);
}

/**
 * Fetch historical TVL data
 */
export async function fetchTvlHistory(
  timeframe: string
): Promise<{
  byChain: Record<ChainId, Array<{ timestamp: number; tvl: number }>>;
  aggregated: Array<{ timestamp: number; tvl: number }>;
}> {
  return fetchWithRetry<{
    byChain: Record<ChainId, Array<{ timestamp: number; tvl: number }>>;
    aggregated: Array<{ timestamp: number; tvl: number }>;
  }>(`${API_BASE}/liquidity/history?timeframe=${timeframe}`);
}

/**
 * Check API health status
 */
export async function checkApiHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  services: Record<string, 'up' | 'down'>;
  latency: number;
}> {
  try {
    const startTime = Date.now();
    const data = await fetchWithRetry<{
      status: 'healthy' | 'degraded' | 'down';
      services: Record<string, 'up' | 'down'>;
    }>(`${API_BASE}/health`, undefined, 1); // Only retry once for health check
    
    return {
      ...data,
      latency: Date.now() - startTime
    };
  } catch (error) {
    console.error('Error checking API health:', error);
    return {
      status: 'down',
      services: {},
      latency: 0
    };
  }
}

  