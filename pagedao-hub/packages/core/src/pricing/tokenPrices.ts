// packages/core/src/pricing/tokenPrices.ts
import { ethers } from 'ethers';
import axios from 'axios';
import { getProvider } from '../providers';
import { getTokenConfig } from '../config';
import { UNISWAP_V2_PAIR_ABI, UNISWAP_V3_POOL_ABI } from '../abis';
import { PriceData, PoolReserves, ChainId } from '../types';

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

    logger.info('Updated price cache');
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
    const poolContract = new ethers.Contract(
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
    throw error;
  }
}

// Additional implementation of other price fetching functions will go here...
// For now, we'll add placeholder implementations to be completed later

async function fetchOsmosisPrice(): Promise<number> {
  // Placeholder - will implement actual Osmosis price fetching
  return 0.12;
}

async function fetchEthereumPagePrice(ethPrice: number): Promise<number> {
  // Placeholder - will implement actual Ethereum price fetching
  return 0.11;
}

async function fetchOptimismPagePrice(ethPrice: number): Promise<number> {
  // Placeholder - will implement actual Optimism price fetching
  return 0.13;
}

async function fetchBasePagePrice(ethPrice: number): Promise<number> {
  // Placeholder - will implement actual Base price fetching
  return 0.14;
}

async function fetchOsmosisTVL(): Promise<number> {
  // Placeholder - will implement actual Osmosis TVL fetching
  return 500000;
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
