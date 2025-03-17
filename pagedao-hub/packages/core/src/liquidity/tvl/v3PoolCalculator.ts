import { ethers } from 'ethers';
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

// ERC20 token ABI for decimals
const ERC20_ABI = [
  'function decimals() external view returns (uint8)'
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
    const provider = await getProvider(chain);
    
    // Create token contracts to get decimals
    const token0Contract = new ethers.Contract(poolState.token0, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(poolState.token1, ERC20_ABI, provider);
    
    // Get token decimals
    const [token0Decimals, token1Decimals] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals()
    ]);
    
    // Calculate price from sqrtPriceX96
    const Q96 = ethers.BigNumber.from('2').pow(96);
    const priceRatio = poolState.sqrtPriceX96.pow(2).div(Q96.pow(2));
    
    // Convert price ratio to decimal
    const priceRatioDecimal = parseFloat(
      ethers.utils.formatUnits(priceRatio, token0Decimals - token1Decimals)
    );
    
    // Calculate token amounts based on liquidity and current price
    // This is a simplified calculation and may need adjustment based on specific V3 math
    const sqrtPrice = parseFloat(ethers.utils.formatUnits(poolState.sqrtPriceX96, 96));
    const liquidity = parseFloat(ethers.utils.formatUnits(poolState.liquidity, 0));
    
    // Calculate token amounts (simplified)
    const token1Amount = liquidity * sqrtPrice;
    const token0Amount = liquidity / sqrtPrice;
    
    // Calculate TVL components
    const token0TVL = token0Amount * token0Price;
    const token1TVL = token1Amount * token1Price;
    
    // Total TVL
    const totalTVL = token0TVL + token1TVL;
    
    logger.info(`V3 pool TVL calculated: $${totalTVL.toFixed(2)}`);
    return totalTVL;
  } catch (error) {
    logger.error(`Failed to calculate V3 pool TVL`, error);
    throw new Error(`V3 pool TVL calculation failed: ${(error as Error).message}`);
  }
}
