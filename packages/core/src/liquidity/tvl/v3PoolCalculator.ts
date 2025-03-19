import * as ethers from 'ethers';
import { V3PoolState } from '../poolService';
import { getProvider } from '../../providers';

// Logger setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[TVL-V3:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[TVL-V3:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[TVL-V3:ERROR] ${message}`, data ? data : '');
  }
};

// ERC20 token ABI for decimals and symbol
const ERC20_ABI = [
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)'
];

/**
 * Calculate TVL for a Uniswap V3 compatible pool
 * @param poolState The state data from the V3 pool
 * @param token0Price The price of token0 in USD
 * @param token1Price The price of token1 in USD
 * @param chain The blockchain network name
 * @returns The total value locked in USD
 */
export async function calculateV3PoolTVL(
  poolState: V3PoolState,
  token0Price: number,
  token1Price: number,
  chain: string
): Promise<number> {
  try {
    logger.info(`Calculating V3 pool TVL on ${chain}`);
    
    if (!poolState.token0 || !poolState.token1) {
      throw new Error('Token addresses not available in pool state');
    }
    
    const provider = await getProvider(chain);
    
    // Create token contracts to get decimals and symbols
    const token0Contract = new ethers.Contract(poolState.token0, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(poolState.token1, ERC20_ABI, provider);
    
    // Get token details
    const [token0Decimals, token1Decimals, token0Symbol, token1Symbol] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.symbol()
    ]);
    
    logger.info(`Pool tokens: ${token0Symbol} (${poolState.token0}) and ${token1Symbol} (${poolState.token1})`);
    
    // Calculate the token amounts from liquidity and current price
    const { amount0, amount1 } = calculateTokenAmountsFromLiquidity(
      poolState.sqrtPriceX96,
      poolState.liquidity,
      token0Decimals,
      token1Decimals
    );
    
    logger.info(`Token amounts in pool: ${amount0.toFixed(6)} ${token0Symbol}, ${amount1.toFixed(6)} ${token1Symbol}`);
    
    // Calculate TVL components
    const token0TVL = amount0 * token0Price;
    const token1TVL = amount1 * token1Price;
    
    // Total TVL
    const totalTVL = token0TVL + token1TVL;
    
    logger.info(`V3 pool TVL calculated: $${totalTVL.toFixed(2)}`);
    logger.info(`- ${token0Symbol} TVL: $${token0TVL.toFixed(2)}`);
    logger.info(`- ${token1Symbol} TVL: $${token1TVL.toFixed(2)}`);
    
    return totalTVL;
  } catch (error) {
    logger.error(`Failed to calculate V3 pool TVL`, error);
    throw new Error(`V3 pool TVL calculation failed: ${(error as Error).message}`);
  }
}

/**
 * Calculate token amounts from liquidity and current price
 * @param sqrtPriceX96 The current price as sqrt(price) * 2^96
 * @param liquidity The current liquidity in the pool
 * @param token0Decimals Decimals for token0
 * @param token1Decimals Decimals for token1
 * @returns The amounts of token0 and token1 in the pool
 */
export function calculateTokenAmountsFromLiquidity(
  sqrtPriceX96: ethers.BigNumber,
  liquidity: ethers.BigNumber,
  token0Decimals: number,
  token1Decimals: number
): { amount0: number, amount1: number } {
  try {
    // Convert to BigInt for precision
    const sqrtPriceX96BigInt = BigInt(sqrtPriceX96.toString());
    const liquidityBigInt = BigInt(liquidity.toString());
    const Q96 = BigInt(2) ** BigInt(96);
    
    // These are simplified calculations based on the assumption that
    // all liquidity is concentrated at the current price
    // In reality, V3 positions can have liquidity distributed over different price ranges
    
    // Calculate amount0 (token0)
    // amount0 = liquidity * (1 / sqrtPrice)
    const amount0BigInt = (liquidityBigInt * Q96) / sqrtPriceX96BigInt;
    
    // Calculate amount1 (token1)
    // amount1 = liquidity * sqrtPrice
    const amount1BigInt = (liquidityBigInt * sqrtPriceX96BigInt) / Q96;
    
    // Convert to decimal values with proper decimal adjustment
    const amount0 = Number(amount0BigInt) / (10 ** token0Decimals);
    const amount1 = Number(amount1BigInt) / (10 ** token1Decimals);
    
    return { amount0, amount1 };
  } catch (error) {
    logger.error('Failed to calculate token amounts from liquidity', error);
    throw new Error(`Token amount calculation failed: ${(error as Error).message}`);
  }
}

/**
 * Calculate the price from sqrtPriceX96
 * @param sqrtPriceX96 The current price as sqrt(price) * 2^96
 * @param token0Decimals Decimals for token0
 * @param token1Decimals Decimals for token1
 * @returns The price of token1 in terms of token0
 */
export function calculatePriceFromSqrtP(
  sqrtPriceX96: ethers.BigNumber,
  token0Decimals: number,
  token1Decimals: number
): number {
  // Convert to BigInt for precision
  const sqrtPriceX96BigInt = BigInt(sqrtPriceX96.toString());
  
  // Square the sqrtPrice
  const priceX192BigInt = sqrtPriceX96BigInt * sqrtPriceX96BigInt;
  
  // Divide by 2^192
  const Q192 = BigInt(2) ** BigInt(192);
  const priceRaw = Number(priceX192BigInt) / Number(Q192);
  
  // Adjust for decimal difference between tokens
  const decimalAdjustment = 10 ** (token0Decimals - token1Decimals);
  
  return priceRaw * decimalAdjustment;
}

/**
 * Calculate the tick price from a tick index
 * @param tick The tick index
 * @returns The price calculated from the tick
 */
export function calculatePriceFromTick(tick: number): number {
  return 1.0001 ** tick;
}

/**
 * Calculate PAGE token price from a V3 ETH/PAGE pool
 * @param poolState The V3 pool state
 * @param pageIsToken0 Whether PAGE is token0 in the pool
 * @param pageDecimals The decimals for PAGE token
 * @param ethDecimals The decimals for ETH (usually 18)
 * @param ethPrice The price of ETH in USD
 * @returns The calculated PAGE price in USD
 */
export function calculatePagePriceFromV3Pool(
  poolState: V3PoolState,
  pageIsToken0: boolean,
  pageDecimals: number,
  ethDecimals: number,
  ethPrice: number
): number {
  // Calculate the price ratio from sqrtPriceX96
  const priceRatio = calculatePriceFromSqrtP(
    poolState.sqrtPriceX96,
    pageIsToken0 ? pageDecimals : ethDecimals,
    pageIsToken0 ? ethDecimals : pageDecimals
  );
  
  // If PAGE is token0, then priceRatio is ETH/PAGE, so PAGE price = ETH price / priceRatio
  // If PAGE is token1, then priceRatio is PAGE/ETH, so PAGE price = ETH price * priceRatio
  return pageIsToken0 ? ethPrice / priceRatio : ethPrice * priceRatio;
}

/**
 * Get TVL for a Uniswap V3 pool with all necessary detailed information
 * @param poolAddress The address of the V3 pool
 * @param chain The blockchain network name
 * @param pagePrice The current PAGE price in USD
 * @param ethPrice The current ETH price in USD
 * @returns {Promise<number>} - TVL in USD
 */
export async function getV3PoolTVL(
  poolAddress: string,
  chain: string,
  pagePrice: number,
  ethPrice: number
): Promise<number> {
  try {
    logger.info(`Fetching V3 pool TVL for ${poolAddress}...`);
    const provider = await getProvider(chain);
    
    // Extended ABI for V3 pool with liquidity function
    const poolAbiExtended = [
      'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
      'function liquidity() view returns (uint128)',
      'function token0() view returns (address)',
      'function token1() view returns (address)'
    ];
    
    const poolContract = new ethers.Contract(poolAddress, poolAbiExtended, provider);
    
    // Get all pool data in parallel
    const [slot0, liquidity, token0, token1] = await Promise.all([
      poolContract.slot0(),
      poolContract.liquidity(),
      poolContract.token0(),
      poolContract.token1()
    ]);
    
    // Create contracts for tokens
    const erc20Abi = ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'];
    const token0Contract = new ethers.Contract(token0, erc20Abi, provider);
    const token1Contract = new ethers.Contract(token1, erc20Abi, provider);
    
    // Get token details
    const [token0Decimals, token1Decimals, token0Symbol, token1Symbol] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.symbol()
    ]);
    
    // Determine which token is PAGE and which is ETH
    const pageAddress = token0Symbol === 'PAGE' ? token0 : token1;
    const pageIsToken0 = token0Symbol === 'PAGE';
    
    // Calculate token amounts
    const { amount0, amount1 } = calculateTokenAmountsFromLiquidity(
      slot0.sqrtPriceX96,
      liquidity,
      token0Decimals,
      token1Decimals
    );
    
    // Calculate TVL based on which token is which
    const pageAmount = pageIsToken0 ? amount0 : amount1;
    const ethAmount = pageIsToken0 ? amount1 : amount0;
    
    const pageTVL = pageAmount * pagePrice;
    const ethTVL = ethAmount * ethPrice;
    const totalTVL = pageTVL + ethTVL;
    
    logger.info(`V3 Pool TVL calculation for ${poolAddress}:`);
    logger.info(`- ${pageAmount.toFixed(6)} PAGE at ${pagePrice} = ${pageTVL.toFixed(2)}`);
    logger.info(`- ${ethAmount.toFixed(6)} ETH at ${ethPrice} = ${ethTVL.toFixed(2)}`);
    logger.info(`- Total TVL: ${totalTVL.toFixed(2)}`);
    
    return totalTVL;
  } catch (error) {
    logger.error(`Error calculating V3 pool TVL: ${error}`);
    throw new Error(`Failed to calculate V3 pool TVL: ${(error as Error).message}`);
  }
}

export default {
  calculateV3PoolTVL,
  calculateTokenAmountsFromLiquidity,
  calculatePriceFromSqrtP,
  calculatePriceFromTick,
  calculatePagePriceFromV3Pool,
  getV3PoolTVL
};