import { ethers } from 'ethers';
import { PoolReserves } from '../poolService';
import { getProvider } from '../../providers';

// Logger setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[TVL-V2:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[TVL-V2:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[TVL-V2:ERROR] ${message}`, data ? data : '');
  }
};

// ERC20 token ABI for decimals and symbol
const ERC20_ABI = [
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)'
];

/**
 * Calculate TVL for a Uniswap V2 compatible pool
 * @param poolReserves The reserves data from the pool
 * @param token0Price The price of token0 in USD
 * @param token1Price The price of token1 in USD
 * @param chain The blockchain network name
 * @returns The total value locked in USD
 */
export async function calculateV2PoolTVL(
  poolReserves: PoolReserves,
  token0Price: number,
  token1Price: number,
  chain: string
): Promise<number> {
  try {
    logger.info(`Calculating V2 pool TVL on ${chain}`);
    
    if (!poolReserves.token0 || !poolReserves.token1) {
      throw new Error('Token addresses not available in pool reserves');
    }
    
    const provider = await getProvider(chain);
    
    // Create token contracts to get decimals
    const token0Contract = new ethers.Contract(poolReserves.token0, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(poolReserves.token1, ERC20_ABI, provider);
    
    // Get token decimals
    const [token0Decimals, token1Decimals] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals()
    ]);
    
    // Convert reserves to decimal values
    const reserve0Decimal = parseFloat(ethers.formatUnits(poolReserves.reserve0, token0Decimals));
    const reserve1Decimal = parseFloat(ethers.formatUnits(poolReserves.reserve1, token1Decimals));
    
    // Calculate TVL components
    const token0TVL = reserve0Decimal * token0Price;
    const token1TVL = reserve1Decimal * token1Price;
    
    // Total TVL
    const totalTVL = token0TVL + token1TVL;
    
    logger.info(`V2 pool TVL calculated: $${totalTVL.toFixed(2)}`);
    logger.info(`- Token0 (${await token0Contract.symbol()}) TVL: $${token0TVL.toFixed(2)}`);
    logger.info(`- Token1 (${await token1Contract.symbol()}) TVL: $${token1TVL.toFixed(2)}`);
    
    return totalTVL;
  } catch (error) {
    logger.error(`Failed to calculate V2 pool TVL`, error);
    throw new Error(`V2 pool TVL calculation failed: ${(error as Error).message}`);
  }
}

/**
 * Calculate TVL for a Uniswap V2 compatible pool with known token decimals
 * A more optimized version when token details are already known
 */
export function calculateV2PoolTVLWithDecimals(
  reserve0: ethers.BigNumber,
  reserve1: ethers.BigNumber,
  token0Decimals: number,
  token1Decimals: number,
  token0Price: number,
  token1Price: number
): number {
  // Convert reserves to decimal values
  const reserve0Decimal = parseFloat(ethers.formatUnits(reserve0, token0Decimals));
  const reserve1Decimal = parseFloat(ethers.formatUnits(reserve1, token1Decimals));
  
  // Calculate TVL components
  const token0TVL = reserve0Decimal * token0Price;
  const token1TVL = reserve1Decimal * token1Price;
  
  // Total TVL
  return token0TVL + token1TVL;
}

/**
 * Calculate PAGE token price based on ETH price and pool reserves
 * @param pageAmount The normalized amount of PAGE tokens in the pool
 * @param ethAmount The normalized amount of ETH in the pool
 * @param ethPrice The price of ETH in USD
 * @returns The calculated PAGE price in USD
 */
export function calculatePagePriceFromEthPool(
  pageAmount: number,
  ethAmount: number,
  ethPrice: number
): number {
  return (ethAmount * ethPrice) / pageAmount;
}

/**
 * Calculate the asset ratio in a V2 pool
 * @param poolReserves The reserves data from the pool
 * @param chain The blockchain network name
 * @returns Object with ratio and normalized amounts
 */
export async function calculateV2PoolRatio(
  poolReserves: PoolReserves,
  chain: string
): Promise<{
  ratio: number;
  token0Amount: number;
  token1Amount: number;
  token0Symbol: string;
  token1Symbol: string;
}> {
  try {
    if (!poolReserves.token0 || !poolReserves.token1) {
      throw new Error('Token addresses not available in pool reserves');
    }
    
    const provider = await getProvider(chain);
    
    // Create token contracts to get decimals and symbols
    const token0Contract = new ethers.Contract(poolReserves.token0, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(poolReserves.token1, ERC20_ABI, provider);
    
    // Get token details
    const [token0Decimals, token1Decimals, token0Symbol, token1Symbol] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.symbol()
    ]);
    
    // Convert reserves to decimal values
    const token0Amount = parseFloat(ethers.formatUnits(poolReserves.reserve0, token0Decimals));
    const token1Amount = parseFloat(ethers.formatUnits(poolReserves.reserve1, token1Decimals));
    
    // Calculate ratio (token1 per token0)
    const ratio = token1Amount / token0Amount;
    
    return {
      ratio,
      token0Amount,
      token1Amount,
      token0Symbol,
      token1Symbol
    };
  } catch (error) {
    logger.error(`Failed to calculate V2 pool ratio`, error);
    throw new Error(`V2 pool ratio calculation failed: ${(error as Error).message}`);
  }
}

export default {
  calculateV2PoolTVL,
  calculateV2PoolTVLWithDecimals,
  calculatePagePriceFromEthPool,
  calculateV2PoolRatio
};