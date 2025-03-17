import { ethers } from 'ethers';
import { getProvider } from '../providers';
import { getConnector } from '../connectors';

// Logger setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[POOL-SERVICE:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[POOL-SERVICE:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[POOL-SERVICE:ERROR] ${message}`, data ? data : '');
  }
};

// Pool type enum
export enum PoolType {
  V2 = 'V2',
  V3 = 'V3',
  OSMOSIS = 'OSMOSIS'
}

// Interface for V2 pool reserves
export interface PoolReserves {
  reserve0: ethers.BigNumber;
  reserve1: ethers.BigNumber;
  blockTimestampLast: number;
}

// Interface for V3 pool state
export interface V3PoolState {
  liquidity: ethers.BigNumber;
  sqrtPriceX96: ethers.BigNumber;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
}

// ABI fragments for pool contracts
const UNISWAP_V2_POOL_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
];

const UNISWAP_V3_POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() external view returns (uint128)'
];

/**
 * Get pool data based on pool type
 * @param poolAddress The address or ID of the pool
 * @param chain The blockchain network name
 * @param poolType The type of pool (V2, V3, OSMOSIS)
 * @returns Pool data specific to the pool type
 */
export async function getPoolData(
  poolAddress: string,
  chain: string,
  poolType: PoolType
): Promise<PoolReserves | V3PoolState | any> {
  try {
    logger.info(`Fetching pool data for ${poolType} pool ${poolAddress} on ${chain}`);
    
    switch (poolType) {
      case PoolType.V2:
        return getV2PoolReserves(poolAddress, chain);
        
      case PoolType.V3:
        return getV3PoolState(poolAddress, chain);
        
      case PoolType.OSMOSIS:
        return getOsmosisPoolData(poolAddress);
        
      default:
        throw new Error(`Unsupported pool type: ${poolType}`);
    }
  } catch (error) {
    logger.error(`Failed to get pool data for ${poolType} pool ${poolAddress} on ${chain}`, error);
    throw new Error(`Pool data fetch failed: ${(error as Error).message}`);
  }
}

/**
 * Get reserves for a Uniswap V2 pool
 * @param poolAddress The pool contract address
 * @param chain The blockchain network name
 * @returns Pool reserves data
 */
async function getV2PoolReserves(poolAddress: string, chain: string): Promise<PoolReserves> {
  try {
    const provider = await getProvider(chain);
    const poolContract = new ethers.Contract(poolAddress, UNISWAP_V2_POOL_ABI, provider);
    
    const reserves = await poolContract.getReserves();
    
    return {
      reserve0: reserves[0],
      reserve1: reserves[1],
      blockTimestampLast: reserves[2]
    };
  } catch (error) {
    logger.error(`Failed to get V2 pool reserves for ${poolAddress} on ${chain}`, error);
    throw new Error(`V2 pool reserves fetch failed: ${(error as Error).message}`);
  }
}

/**
 * Get state for a Uniswap V3 pool
 * @param poolAddress The pool contract address
 * @param chain The blockchain network name
 * @returns Pool state data
 */
async function getV3PoolState(poolAddress: string, chain: string): Promise<V3PoolState> {
  try {
    const provider = await getProvider(chain);
    const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);
    
    const [slot0, liquidity] = await Promise.all([
      poolContract.slot0(),
      poolContract.liquidity()
    ]);
    
    return {
      liquidity,
      sqrtPriceX96: slot0[0],
      tick: slot0[1],
      observationIndex: slot0[2],
      observationCardinality: slot0[3],
      observationCardinalityNext: slot0[4],
      feeProtocol: slot0[5],
      unlocked: slot0[6]
    };
  } catch (error) {
    logger.error(`Failed to get V3 pool state for ${poolAddress} on ${chain}`, error);
    throw new Error(`V3 pool state fetch failed: ${(error as Error).message}`);
  }
}

/**
 * Get data for an Osmosis pool
 * @param poolId The Osmosis pool ID
 * @returns Pool data from Osmosis API
 */
async function getOsmosisPoolData(poolId: string): Promise<any> {
  try {
    const connector = getConnector('osmosis');
    
    // Use the OsmosisConnector's custom method to get pool info
    // This is a bit of a hack, but it works with our current interface
    return await connector.callContractMethod(`pool/${poolId}`, [], 'getPoolInfo', []);
  } catch (error) {
    logger.error(`Failed to get Osmosis pool data for pool ID ${poolId}`, error);
    throw new Error(`Osmosis pool data fetch failed: ${(error as Error).message}`);
  }
}
