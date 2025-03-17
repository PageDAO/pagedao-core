import { calculateV2PoolTVL } from './v2PoolCalculator';
import { calculateV3PoolTVL, getV3PoolTVL } from './v3PoolCalculator';
import { calculateOsmosisTVL, fetchOsmosisTVL } from './osmosisCalculator';
import { PoolType, getPoolData, PoolReserves, V3PoolState } from '../poolService';

// Logger setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[TVL:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[TVL:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[TVL:ERROR] ${message}`, data ? data : '');
  }
};

/**
 * Calculate TVL for a pool based on its type
 * @param poolAddress The address or ID of the pool
 * @param chain The blockchain network name
 * @param poolType The type of pool (V2, V3, OSMOSIS)
 * @param token0Price The price of token0 in USD (not needed for Osmosis)
 * @param token1Price The price of token1 in USD (not needed for Osmosis)
 * @returns The total value locked in USD
 */
export async function calculatePoolTVL(
  poolAddress: string,
  chain: string,
  poolType: PoolType,
  token0Price?: number,
  token1Price?: number
): Promise<number> {
  try {
    logger.info(`Calculating TVL for ${poolType} pool ${poolAddress} on ${chain}`);
    
    switch (poolType) {
      case PoolType.V2:
        if (token0Price === undefined || token1Price === undefined) {
          throw new Error('Token prices are required for V2 pool TVL calculation');
        }
        const v2PoolData = await getPoolData(poolAddress, chain, PoolType.V2) as PoolReserves;
        return calculateV2PoolTVL(v2PoolData, token0Price, token1Price, chain);
        
      case PoolType.V3:
        if (token0Price === undefined || token1Price === undefined) {
          throw new Error('Token prices are required for V3 pool TVL calculation');
        }
        const v3PoolData = await getPoolData(poolAddress, chain, PoolType.V3) as V3PoolState;
        return calculateV3PoolTVL(v3PoolData, token0Price, token1Price, chain);
        
      case PoolType.OSMOSIS:
        return fetchOsmosisTVL(poolAddress);
        
      default:
        throw new Error(`Unsupported pool type: ${poolType}`);
    }
  } catch (error) {
    logger.error(`Failed to calculate TVL for ${poolType} pool ${poolAddress} on ${chain}`, error);
    throw new Error(`TVL calculation failed: ${(error as Error).message}`);
  }
}

/**
 * Calculate TVL for PAGE token across all chains
 * @param pagePrice Object containing PAGE price by chain
 * @param ethPrice ETH price in USD
 * @param poolData Object containing pool addresses by chain
 * @returns Object containing TVL by chain and total TVL
 */
export async function calculatePageTVL(
  pagePrice: Record<string, number>,
  ethPrice: number,
  poolData: Record<string, { address: string, type: PoolType }>
): Promise<{ byChain: Record<string, number>, total: number }> {
  try {
    logger.info('Calculating PAGE TVL across all chains');
    
    const tvlPromises: Record<string, Promise<number>> = {};
    
    // Start TVL calculations for each chain in parallel
    for (const [chain, data] of Object.entries(poolData)) {
      switch (data.type) {
        case PoolType.V2:
          tvlPromises[chain] = calculateV2PoolTVL(
            await getPoolData(data.address, chain, PoolType.V2) as PoolReserves,
            pagePrice[chain] || 0,
            ethPrice,
            chain
          );
          break;
          
        case PoolType.V3:
          tvlPromises[chain] = getV3PoolTVL(
            data.address,
            chain,
            pagePrice[chain] || 0,
            ethPrice
          );
          break;
          
        case PoolType.OSMOSIS:
          tvlPromises[chain] = fetchOsmosisTVL(data.address);
          break;
      }
    }
    
    // Wait for all promises to resolve
    const tvlResults: Record<string, number> = {};
    for (const [chain, promise] of Object.entries(tvlPromises)) {
      try {
        tvlResults[chain] = await promise;
      } catch (error) {
        logger.error(`Failed to calculate TVL for ${chain}`, error);
        tvlResults[chain] = 0;
      }
    }
    
    // Calculate total TVL
    const totalTVL = Object.values(tvlResults).reduce((sum, value) => sum + value, 0);
    
    logger.info('TVL calculation completed');
    logger.info(`Total TVL: $${totalTVL.toFixed(2)}`);
    Object.entries(tvlResults).forEach(([chain, tvl]) => {
      logger.info(`- ${chain}: $${tvl.toFixed(2)} (${((tvl / totalTVL) * 100).toFixed(2)}%)`);
    });
    
    return {
      byChain: tvlResults,
      total: totalTVL
    };
  } catch (error) {
    logger.error('Failed to calculate PAGE TVL across chains', error);
    throw new Error(`PAGE TVL calculation failed: ${(error as Error).message}`);
  }
}

// Export the calculators for individual use
export { calculateV2PoolTVL, calculateV3PoolTVL, calculateOsmosisTVL, fetchOsmosisTVL, getV3PoolTVL };

// Export a default object for convenience
export default {
  calculatePoolTVL,
  calculatePageTVL,
  v2: { calculateV2PoolTVL },
  v3: { calculateV3PoolTVL, getV3PoolTVL },
  osmosis: { calculateOsmosisTVL, fetchOsmosisTVL }
};