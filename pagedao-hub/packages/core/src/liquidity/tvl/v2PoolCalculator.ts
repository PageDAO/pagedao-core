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
    return totalTVL;
  } catch (error) {
    logger.error(`Failed to calculate V2 pool TVL`, error);
    throw new Error(`V2 pool TVL calculation failed: ${(error as Error).message}`);
  }
}
