// Logger setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[TVL-OSMOSIS:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[TVL-OSMOSIS:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[TVL-OSMOSIS:ERROR] ${message}`, data ? data : '');
  }
};

/**
 * Interface for Osmosis pool data
 */
export interface OsmosisPoolData {
  pool_id: string;
  symbol: string;
  liquidity: number;
  price: number;
  volume_24h: number;
  volume_7d: number;
  fees: number;
  liquidity_atom: number;
  [key: string]: any; // For additional properties
}

/**
 * Calculate TVL for an Osmosis pool
 * @param poolData The pool data from Osmosis API
 * @returns The total value locked in USD
 */
export async function calculateOsmosisTVL(poolData: OsmosisPoolData): Promise<number> {
  try {
    logger.info(`Calculating Osmosis pool TVL for pool ID ${poolData.pool_id}`);
    
    // Osmosis API directly provides liquidity in USD
    const tvl = poolData.liquidity;
    
    logger.info(`Osmosis pool TVL calculated: ${tvl.toFixed(2)}`);
    return tvl;
  } catch (error) {
    logger.error(`Failed to calculate Osmosis pool TVL`, error);
    throw new Error(`Osmosis pool TVL calculation failed: ${(error as Error).message}`);
  }
}

/**
 * Fetch Osmosis TVL directly from API
 * @param poolId The Osmosis pool ID
 * @returns The total value locked in USD
 */
export async function fetchOsmosisTVL(poolId: string): Promise<number> {
  try {
    logger.info(`Fetching Osmosis TVL for pool ID ${poolId}`);
    const response = await fetch(`https://api-osmosis.imperator.co/pools/v2/${poolId}`);
    
    if (!response.ok) {
      throw new Error(`Osmosis API returned status ${response.status}`);
    }
    
    const poolData = await response.json();
    return calculateOsmosisTVL(poolData);
  } catch (error) {
    logger.error(`Failed to fetch Osmosis TVL for pool ID ${poolId}`, error);
    throw new Error(`Osmosis TVL fetch failed: ${(error as Error).message}`);
  }
}