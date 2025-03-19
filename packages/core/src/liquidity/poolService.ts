import * as ethers from 'ethers';
import { getProvider } from '../providers';
import { getConnector } from '../connectors';
import { UNISWAP_V2_PAIR_ABI, UNISWAP_V3_POOL_ABI } from '../abis';

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

// Interface for pool data
export interface PoolData {
  address: string;
  type: PoolType;
  token0: string;
  token1: string;
  token0Symbol?: string;
  token1Symbol?: string;
  token0Decimals?: number;
  token1Decimals?: number;
}

// Interface for V2 pool reserves
export interface PoolReserves {
  reserve0: ethers.BigNumber;
  reserve1: ethers.BigNumber;
  blockTimestampLast: number;
  token0?: string;
  token1?: string;
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
  token0?: string;
  token1?: string;
}

// Interface for normalized pool reserves (decimals adjusted)
export interface NormalizedPoolReserves {
  reserve0: number;
  reserve1: number;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
}

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
    const poolContract = new ethers.Contract(poolAddress, UNISWAP_V2_PAIR_ABI, provider);
    
    // Get reserves and token addresses in parallel
    const [reserves, token0, token1] = await Promise.all([
      poolContract.getReserves(),
      poolContract.token0(),
      poolContract.token1()
    ]);
    
    return {
      reserve0: reserves[0],
      reserve1: reserves[1],
      blockTimestampLast: reserves[2],
      token0,
      token1
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
    
    // Get slot0, liquidity, and token addresses in parallel
    const [slot0, liquidity, token0, token1] = await Promise.all([
      poolContract.slot0(),
      poolContract.liquidity(),
      poolContract.token0(),
      poolContract.token1()
    ]);
    
    return {
      liquidity,
      sqrtPriceX96: slot0[0],
      tick: slot0[1],
      observationIndex: slot0[2],
      observationCardinality: slot0[3],
      observationCardinalityNext: slot0[4],
      feeProtocol: slot0[5],
      unlocked: slot0[6],
      token0,
      token1
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

/**
 * Normalize pool reserves by adjusting for token decimals
 * @param reserves The raw pool reserves
 * @param token0Decimals Decimals for token0
 * @param token1Decimals Decimals for token1
 * @param token0Symbol Symbol for token0
 * @param token1Symbol Symbol for token1
 * @returns Normalized reserves with human-readable values
 */
export async function normalizePoolReserves(
  reserves: PoolReserves,
  chain: string
): Promise<NormalizedPoolReserves> {
  try {
    if (!reserves.token0 || !reserves.token1) {
      throw new Error('Token addresses not available in reserves data');
    }
    
    const provider = await getProvider(chain);
    
    // Create token contracts to get decimals and symbols
    const token0Contract = new ethers.Contract(
      reserves.token0,
      ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'],
      provider
    );
    
    const token1Contract = new ethers.Contract(
      reserves.token1,
      ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'],
      provider
    );
    
    // Get decimals and symbols in parallel
    const [token0Decimals, token1Decimals, token0Symbol, token1Symbol] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.symbol()
    ]);
    
    // Normalize the reserves
    const normalizedReserve0 = parseFloat(ethers.utils.formatUnits(reserves.reserve0, token0Decimals));
    const normalizedReserve1 = parseFloat(ethers.utils.formatUnits(reserves.reserve1, token1Decimals));
    
    return {
      reserve0: normalizedReserve0,
      reserve1: normalizedReserve1,
      token0: reserves.token0,
      token1: reserves.token1,
      token0Symbol,
      token1Symbol
    };
  } catch (error) {
    logger.error('Failed to normalize pool reserves', error);
    throw new Error(`Pool reserves normalization failed: ${(error as Error).message}`);
  }
}

/**
 * Calculate the price of token0 in terms of token1
 * @param reserves The pool reserves
 * @returns The price of token0 in terms of token1
 */
export function calculateTokenPrice(reserves: NormalizedPoolReserves): number {
  return reserves.reserve1 / reserves.reserve0;
}

/**
 * Calculate the price impact of a swap
 * @param reserves The pool reserves
 * @param inputAmount The amount of input token
 * @param inputIsToken0 Whether the input token is token0
 * @returns The price impact as a percentage
 */
export function calculatePriceImpact(
  reserves: NormalizedPoolReserves,
  inputAmount: number,
  inputIsToken0: boolean
): number {
  const k = reserves.reserve0 * reserves.reserve1;
  
  if (inputIsToken0) {
    const newReserve0 = reserves.reserve0 + inputAmount;
    const newReserve1 = k / newReserve0;
    const outputAmount = reserves.reserve1 - newReserve1;
    
    const currentPrice = reserves.reserve1 / reserves.reserve0;
    const executionPrice = outputAmount / inputAmount;
    
    return ((currentPrice - executionPrice) / currentPrice) * 100;
  } else {
    const newReserve1 = reserves.reserve1 + inputAmount;
    const newReserve0 = k / newReserve1;
    const outputAmount = reserves.reserve0 - newReserve0;
    
    const currentPrice = reserves.reserve0 / reserves.reserve1;
    const executionPrice = outputAmount / inputAmount;
    
    return ((currentPrice - executionPrice) / currentPrice) * 100;
  }
}

/**
 * Calculate the output amount for a given input amount
 * @param reserves The pool reserves
 * @param inputAmount The amount of input token
 * @param inputIsToken0 Whether the input token is token0
 * @param fee The swap fee (default: 0.3%)
 * @returns The expected output amount
 */
export function calculateOutputAmount(
  reserves: NormalizedPoolReserves,
  inputAmount: number,
  inputIsToken0: boolean,
  fee: number = 0.003
): number {
  const inputAmountWithFee = inputAmount * (1 - fee);
  const k = reserves.reserve0 * reserves.reserve1;
  
  if (inputIsToken0) {
    const newReserve0 = reserves.reserve0 + inputAmountWithFee;
    const newReserve1 = k / newReserve0;
    return reserves.reserve1 - newReserve1;
  } else {
    const newReserve1 = reserves.reserve1 + inputAmountWithFee;
    const newReserve0 = k / newReserve1;
    return reserves.reserve0 - newReserve0;
  }
}

/**
 * Get all token information for a pool
 * @param poolAddress The pool address
 * @param chain The blockchain network
 * @param poolType The type of pool
 * @returns Complete pool information with token details
 */
export async function getPoolTokenInfo(
  poolAddress: string,
  chain: string,
  poolType: PoolType
): Promise<PoolData> {
  try {
    let token0 = '', token1 = '';
    
    if (poolType === PoolType.V2 || poolType === PoolType.V3) {
      const provider = await getProvider(chain);
      const abi = ['function token0() view returns (address)', 'function token1() view returns (address)'];
      const poolContract = new ethers.Contract(poolAddress, abi, provider);
      
      [token0, token1] = await Promise.all([
        poolContract.token0(),
        poolContract.token1()
      ]);
    } else if (poolType === PoolType.OSMOSIS) {
      // For Osmosis, we would need to handle this differently
      // This is placeholder logic
      const poolData = await getOsmosisPoolData(poolAddress);
      token0 = poolData.baseDenom || '';
      token1 = poolData.quoteDenom || '';
    }
    
    return {
      address: poolAddress,
      type: poolType,
      token0,
      token1
    };
  } catch (error) {
    logger.error(`Failed to get pool token info for ${poolAddress} on ${chain}`, error);
    throw new Error(`Pool token info fetch failed: ${(error as Error).message}`);
  }
}

export default {
  getPoolData,
  normalizePoolReserves,
  calculateTokenPrice,
  calculatePriceImpact,
  calculateOutputAmount,
  getPoolTokenInfo,
  PoolType
};