import { calculateV2PoolTVL } from './v2PoolCalculator';
import { calculateV3PoolTVL } from './v3PoolCalculator';
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

export { calculateV2PoolTVL, calculateV3PoolTVL, calculateOsmosisTVL, fetchOsmosisTVL };
