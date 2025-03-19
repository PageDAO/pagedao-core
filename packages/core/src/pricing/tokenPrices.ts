// packages/core/src/pricing/tokenPrices.ts
import { Contract, utils, BigNumber } from 'ethers';
import axios from 'axios';
import { getProvider } from '../providers';
import { getTokenConfig, getSupportedChains } from '../config';
import { UNISWAP_V2_PAIR_ABI, UNISWAP_V3_POOL_ABI } from '../abis';
import { PriceData, PoolReserves, ChainId } from '../types';
import { 
  calculateV2PoolRatio, 
  calculatePagePriceFromEthPool 
} from '../liquidity/tvl/v2PoolCalculator';
import { 
  calculatePagePriceFromV3Pool, 
  getV3PoolTVL 
} from '../liquidity/tvl/v3PoolCalculator';
import { 
  fetchOsmosisData as fetchOsmosisPoolData,
  calculatePagePriceFromOsmosis 
} from '../liquidity/tvl/osmosisCalculator';

// Simple logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[PRICE:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[PRICE:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[PRICE:ERROR] ${message}`, data ? data : '');
  }
};

// Cache for prices
let priceCache: PriceData | null = null;
const CACHE_DURATION = 300000; // 5 minutes in milliseconds

/**
 * Fetches PAGE token prices from all supported chains
 */
export async function fetchPagePrices(): Promise<PriceData> {
  // Check if cache is still valid
  const now = Date.now();
  if (priceCache && priceCache.timestamp > 0 && now - priceCache.timestamp < CACHE_DURATION) {
    logger.info('Using cached prices');
    return priceCache;
  }

  logger.info('Fetching fresh PAGE token prices...');
  
  try {
    // First get ETH price - we need this for all EVM chain calculations
    const ethPrice = await fetchEthPrice();
    logger.info('Fetched ETH price:', ethPrice);
    
    // Fetch prices in parallel
    const [osmosisPrice, ethereumPrice, optimismPrice, basePrice, osmosisTVL] = await Promise.all([
      fetchOsmosisPrice(),
      fetchEthereumPagePrice(ethPrice),
      fetchOptimismPagePrice(ethPrice),
      fetchBasePagePrice(ethPrice),
      fetchOsmosisTVL()
    ]);

    // Update cache
    priceCache = {
      ethereum: ethereumPrice,
      optimism: optimismPrice,
      base: basePrice,
      osmosis: osmosisPrice,
      ethPrice: ethPrice,
      osmosisTVL: osmosisTVL,
      timestamp: now
    };

    logger.info('Updated price cache:', priceCache);
    return priceCache;
  } catch (error) {
    logger.error('Error fetching prices:', error);
    throw error; // Let the error propagate to the caller
  }
}

/**
 * Fetch ETH price in USD from Uniswap V3 pool
 */
async function fetchEthPrice(): Promise<number> {
  try {
    logger.info('Fetching ETH price from Uniswap V3 pool...');
    const provider = await getProvider('base');
    
    // Create contract instance with V3 ABI
    const poolContract = new Contract(
      '0xd0b53D9277642d899DF5C87A3966A349A798F224', // ETH/USDC pair on Base
      UNISWAP_V3_POOL_ABI, 
      provider
    );
    
    // Get slot0 which contains the current sqrt price
    const slot0 = await poolContract.slot0();
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    
    logger.info('Raw sqrtPriceX96:', sqrtPriceX96.toString());
    
    // For Uniswap V3, the sqrtPriceX96 is the square root of the price
    // multiplied by 2^96
    
    // Convert sqrtPriceX96 to BigInt
    const sqrtPriceX96BigInt = BigInt(sqrtPriceX96.toString());
    
    // Square the value
    const priceX192BigInt = (sqrtPriceX96BigInt * sqrtPriceX96BigInt);
    
    // Divide by 2^192 (because we squared 2^96)
    const Q192 = BigInt(2) ** BigInt(192);
    
    // Calculate raw price
    const rawPrice = Number(priceX192BigInt) / Number(Q192);
    
    logger.info('Raw price ratio:', rawPrice);
    
    // Adjust for token decimals (USDC has 6, ETH has 18)
    const decimalAdjustment = Math.pow(10, 18 - 6);
    const ethPrice = rawPrice * decimalAdjustment;
    
    logger.info('Calculated ETH price from V3 pool:', ethPrice);
    return ethPrice;
  } catch (error) {
    logger.error('Error fetching ETH price from Uniswap V3 pool:', error);
    // Fallback to a default ETH price or another price source
    // This is just for development - in production we'd want a more robust solution
    logger.warn('Using fallback ETH price of $3000 due to fetch error');
    return 3000;
  }
}

/**
 * Fetch PAGE price from Osmosis
 */
async function fetchOsmosisPrice(): Promise<number> {
  try {
    logger.info('Fetching PAGE price from Osmosis...');
    // Use the specialized function from osmosisCalculator
    const pagePrice = await calculatePagePriceFromOsmosis();
    logger.info('Fetched PAGE price from Osmosis:', pagePrice);
    return pagePrice;
  } catch (error) {
    logger.error('Error fetching PAGE price from Osmosis:', error);
    // If we have a cached price, return that instead of failing
    if (priceCache && priceCache.osmosis) {
      logger.warn('Using cached Osmosis price due to fetch error');
      return priceCache.osmosis;
    }
    // Otherwise, default fallback for development
    logger.warn('Using fallback PAGE price of $0.12 for Osmosis due to fetch error');
    return 0.12;
  }
}

/**
 * Fetch PAGE price from Ethereum
 */
async function fetchEthereumPagePrice(ethPrice: number): Promise<number> {
  try {
    logger.info('Fetching PAGE price from Ethereum...');
    const tokenConfig = getTokenConfig('ethereum');
    const provider = await getProvider('ethereum');
    
    // We're using a V2 pool on Ethereum
    if (tokenConfig.pool.type !== 'v2') {
      throw new Error('Ethereum PAGE pool is not V2 type');
    }
    
    // Create contract instance for the pool
    const poolContract = new Contract(
      tokenConfig.pool.address,
      UNISWAP_V2_PAIR_ABI,
      provider
    );
    
    // Get pool reserves
    const reserves = await poolContract.getReserves();
    const token0 = await poolContract.token0();
    const token1 = await poolContract.token1();
    
    // Get token contracts to get decimals
    const erc20Abi = ['function decimals() view returns (uint8)'];
    const token0Contract = new Contract(token0, erc20Abi, provider);
    const token1Contract = new Contract(token1, erc20Abi, provider);
    
    // Get token decimals
    const [token0Decimals, token1Decimals] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals()
    ]);
    
    // Process reserves based on which token is PAGE
    const pageIsToken0 = tokenConfig.pool.tokenIsToken0;
    
    // Convert reserves to decimal
    const token0Amount = parseFloat(utils.formatUnits(reserves[0], token0Decimals));
    const token1Amount = parseFloat(utils.formatUnits(reserves[1], token1Decimals));
    
    // Calculate PAGE price based on ETH price
    let pagePrice: number;
    if (pageIsToken0) {
      // If PAGE is token0, calculate PAGE price based on token1 (ETH) price
      pagePrice = (token1Amount * ethPrice) / token0Amount;
    } else {
      // If PAGE is token1, calculate PAGE price based on token0 (ETH) price
      pagePrice = (token0Amount * ethPrice) / token1Amount;
    }
    
    logger.info('Fetched PAGE price from Ethereum:', pagePrice);
    return pagePrice;
  } catch (error) {
    logger.error('Error fetching PAGE price from Ethereum:', error);
    // If we have a cached price, return that instead of failing
    if (priceCache && priceCache.ethereum) {
      logger.warn('Using cached Ethereum price due to fetch error');
      return priceCache.ethereum;
    }
    // Otherwise, default fallback for development
    logger.warn('Using fallback PAGE price of $0.11 for Ethereum due to fetch error');
    return 0.11;
  }
}

/**
 * Fetch PAGE price from Optimism
 */
async function fetchOptimismPagePrice(ethPrice: number): Promise<number> {
  try {
    logger.info('Fetching PAGE price from Optimism...');
    const tokenConfig = getTokenConfig('optimism');
    const provider = await getProvider('optimism');
    
    // We're using a V2 pool on Optimism
    if (tokenConfig.pool.type !== 'v2') {
      throw new Error('Optimism PAGE pool is not V2 type');
    }
    
    // Similar implementation to Ethereum but for Optimism pools
    const poolContract = new Contract(
      tokenConfig.pool.address,
      UNISWAP_V2_PAIR_ABI,
      provider
    );
    
    // Get pool reserves and token addresses
    const reserves = await poolContract.getReserves();
    const token0 = await poolContract.token0();
    const token1 = await poolContract.token1();
    
    // Get token contracts to get decimals
    const erc20Abi = ['function decimals() view returns (uint8)'];
    const token0Contract = new Contract(token0, erc20Abi, provider);
    const token1Contract = new Contract(token1, erc20Abi, provider);
    
    // Get token decimals
    const [token0Decimals, token1Decimals] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals()
    ]);
    
    // Process reserves based on which token is PAGE
    const pageIsToken0 = tokenConfig.pool.tokenIsToken0;
    
    // Convert reserves to decimal
    const token0Amount = parseFloat(utils.formatUnits(reserves[0], token0Decimals));
    const token1Amount = parseFloat(utils.formatUnits(reserves[1], token1Decimals));
    
    // Calculate PAGE price based on ETH price
    let pagePrice: number;
    if (pageIsToken0) {
      // If PAGE is token0, calculate PAGE price based on token1 (ETH) price
      pagePrice = (token1Amount * ethPrice) / token0Amount;
    } else {
      // If PAGE is token1, calculate PAGE price based on token0 (ETH) price
      pagePrice = (token0Amount * ethPrice) / token1Amount;
    }
    
    logger.info('Fetched PAGE price from Optimism:', pagePrice);
    return pagePrice;
  } catch (error) {
    logger.error('Error fetching PAGE price from Optimism:', error);
    // If we have a cached price, return that instead of failing
    if (priceCache && priceCache.optimism) {
      logger.warn('Using cached Optimism price due to fetch error');
      return priceCache.optimism;
    }
    // Otherwise, default fallback for development
    logger.warn('Using fallback PAGE price of $0.13 for Optimism due to fetch error');
    return 0.13;
  }
}

/**
 * Fetch PAGE price from Base
 */
async function fetchBasePagePrice(ethPrice: number): Promise<number> {
  try {
    logger.info('Fetching PAGE price from Base...');
    const tokenConfig = getTokenConfig('base');
    const provider = await getProvider('base');
    
    // Base uses a V3 pool
    if (tokenConfig.pool.type !== 'v3') {
      throw new Error('Base PAGE pool is not V3 type');
    }
    
    // Create contract instance for the V3 pool
    const poolContract = new Contract(
      tokenConfig.pool.address,
      UNISWAP_V3_POOL_ABI,
      provider
    );
    
    // Get slot0 data for the current price
    const slot0 = await poolContract.slot0();
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    
    // Get token addresses
    const token0 = await poolContract.token0();
    const token1 = await poolContract.token1();
    
    // Get token contracts to get decimals
    const erc20Abi = ['function decimals() view returns (uint8)'];
    const token0Contract = new Contract(token0, erc20Abi, provider);
    const token1Contract = new Contract(token1, erc20Abi, provider);
    
    // Get token decimals
    const [token0Decimals, token1Decimals] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals()
    ]);
    
    // Process based on which token is PAGE
    const pageIsToken0 = tokenConfig.pool.tokenIsToken0;
    
    // Calculate the price from sqrtPriceX96
    const sqrtPriceX96BigInt = BigInt(sqrtPriceX96.toString());
    const priceX192BigInt = sqrtPriceX96BigInt * sqrtPriceX96BigInt;
    const Q192 = BigInt(2) ** BigInt(192);
    const rawPrice = Number(priceX192BigInt) / Number(Q192);
    
    // Adjust for decimals
    const decimalAdjustment = Math.pow(10, token0Decimals - token1Decimals);
    const poolPrice = rawPrice * decimalAdjustment;
    
    // Calculate PAGE price based on whether it's token0 or token1
    let pagePrice: number;
    if (pageIsToken0) {
      // PAGE/ETH price
      pagePrice = ethPrice / poolPrice;
    } else {
      // ETH/PAGE price
      pagePrice = ethPrice * poolPrice;
    }
    
    logger.info('Fetched PAGE price from Base:', pagePrice);
    return pagePrice;
  } catch (error) {
    logger.error('Error fetching PAGE price from Base:', error);
    // If we have a cached price, return that instead of failing
    if (priceCache && priceCache.base) {
      logger.warn('Using cached Base price due to fetch error');
      return priceCache.base;
    }
    // Otherwise, default fallback for development
    logger.warn('Using fallback PAGE price of $0.14 for Base due to fetch error');
    return 0.14;
  }
}

/**
 * Fetch Osmosis TVL
 */
async function fetchOsmosisTVL(): Promise<number> {
  try {
    logger.info('Fetching Osmosis TVL...');
    // Get the Osmosis pool data which includes TVL
    const osmosisData = await fetchOsmosisPoolData();
    logger.info('Fetched Osmosis TVL:', osmosisData.tvl);
    return osmosisData.tvl;
  } catch (error) {
    logger.error('Error fetching Osmosis TVL:', error);
    // If we have a cached TVL, return that instead of failing
    if (priceCache && priceCache.osmosisTVL) {
      logger.warn('Using cached Osmosis TVL due to fetch error');
      return priceCache.osmosisTVL;
    }
    // Otherwise, default fallback for development
    logger.warn('Using fallback TVL of $500000 for Osmosis due to fetch error');
    return 500000;
  }
}

/**
 * Calculate weighted average price based on liquidity
 */
export function calculateWeightedPrice(
  prices: Record<ChainId, number>,
  liquidities: Record<ChainId, number>,
  options: {
    excludeChains?: ChainId[];
    minLiquidityThreshold?: number;
    manualWeights?: Record<ChainId, number>;
  } = {}
): number {
  // Filter chains based on options
  const chains = Object.keys(prices) as ChainId[];
  const filteredChains = chains
    .filter(chain => !options.excludeChains?.includes(chain))
    .filter(chain => liquidities[chain] >= (options.minLiquidityThreshold || 0));
  
  // No valid chains after filtering
  if (filteredChains.length === 0) {
    return 0;
  }

  // Calculate total liquidity across all included chains
  const totalLiquidity = filteredChains.reduce((sum, chain) => sum + liquidities[chain], 0);
  
  // If no liquidity, return simple average
  if (totalLiquidity === 0) {
    return filteredChains.reduce((sum, chain) => sum + prices[chain], 0) / filteredChains.length;
  }
  
  // Calculate weighted average price
  return filteredChains.reduce((weightedSum, chain) => {
    const weight = options.manualWeights?.[chain] || (liquidities[chain] / totalLiquidity);
    return weightedSum + (prices[chain] * weight);
  }, 0);
}