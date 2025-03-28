import axios from 'axios';
import { ethers } from 'ethers';
import { getProvider } from '../blockchain/provider';
import {
  PAGE_TOKEN_CONFIG,
  OSMOSIS,
  CACHE_DURATION
} from '../utils/config';
import { UNISWAP_V2_PAIR_ABI, UNISWAP_V3_POOL_ABI } from '../utils/abis';

// Types for TVL data
export interface TvlData {
  ethereum: number;
  optimism: number;
  base: number;
  osmosis: number;
  timestamp: number;
}

export interface TvlWeights {
  ethereum: number;
  optimism: number;
  base: number;
  osmosis: number;
}

// Cache for TVL values
let tvlCache: TvlData = {
  ethereum: 0,
  optimism: 0,
  base: 0,
  osmosis: 0,
  timestamp: 0
};

/**
 * Fetch TVL for all networks
 * @param priceData Price data from priceService
 * @returns TVL data for each network
 */
export async function fetchAllTVL(priceData: { ethereum: number; optimism: number; base: number; osmosis: number; ethPrice: number }): Promise<TvlData> {
  // Check if cache is still valid
  const now = Date.now();
  if (tvlCache.timestamp > 0 && now - tvlCache.timestamp < CACHE_DURATION) {
    console.log('Using cached TVL data:', tvlCache);
    return tvlCache;
  }

  console.log('Fetching TVL for all networks...');
  
  try {
    // Fetch Osmosis TVL first since it's more likely to succeed
    const osmosisTVL = await fetchOsmosisTVL();
    
    // Try to fetch TVL for EVM chains
    let ethereumTVL = 0;
    let optimismTVL = 0;
    let baseTVL = 0;
    
    try {
      ethereumTVL = await fetchEthereumTVL(priceData.ethereum, priceData.ethPrice);
    } catch (error) {
      console.error('Error fetching Ethereum TVL:', error);
    }
    
    try {
      optimismTVL = await fetchOptimismTVL(priceData.optimism, priceData.ethPrice);
    } catch (error) {
      console.error('Error fetching Optimism TVL:', error);
    }
    
    try {
      baseTVL = await fetchBaseTVL(priceData.base, priceData.ethPrice);
    } catch (error) {
      console.error('Error fetching Base TVL:', error);
    }
    
    // Update cache
    tvlCache = {
      ethereum: ethereumTVL,
      optimism: optimismTVL,
      base: baseTVL,
      osmosis: osmosisTVL,
      timestamp: now
    };
    
    console.log('Updated TVL cache:', tvlCache);
    return tvlCache;
  } catch (error) {
    console.error('Error fetching all TVL:', error);
    throw error;
  }
}

/**
 * Calculate weights for each network based on TVL
 * @param tvlData TVL data for each network
 * @returns Weight for each network
 */
export function calculateTVLWeights(tvlData: TvlData): TvlWeights {
  try {
    // Calculate total TVL
    const totalTVL = tvlData.ethereum + tvlData.optimism + tvlData.base + tvlData.osmosis;
    
    if (totalTVL <= 0) {
      throw new Error('Total TVL is zero or negative');
    }
    
    // Calculate weights
    const weights = {
      ethereum: tvlData.ethereum / totalTVL,
      optimism: tvlData.optimism / totalTVL,
      base: tvlData.base / totalTVL,
      osmosis: tvlData.osmosis / totalTVL
    };
    
    console.log('Calculated TVL weights:', weights);
    return weights;
  } catch (error) {
    console.error('Error calculating TVL weights:', error);
    // If anything fails, return equal weights
    return {
      ethereum: 0.25,
      optimism: 0.25,
      base: 0.25,
      osmosis: 0.25
    };
  }
}

/**
 * Fetch Ethereum TVL
 * @param pagePrice PAGE price in USD
 * @param ethPrice ETH price in USD
 * @returns TVL in USD
 */
export async function fetchEthereumTVL(pagePrice: number, ethPrice: number): Promise<number> {
  try {
    console.log('Fetching Ethereum TVL...');
    const ethereumToken = PAGE_TOKEN_CONFIG.find(token => token.chainId === 1);
    
    if (!ethereumToken || !ethereumToken.lpAddress) {
      throw new Error('Ethereum token config not found');
    }
    
    // Get provider and create contract - make sure to await
    const provider = await getProvider('ethereum');
    const pairContract = new ethers.Contract(ethereumToken.lpAddress, UNISWAP_V2_PAIR_ABI, provider);
    
    // Get reserves
    const [reserve0, reserve1] = await pairContract.getReserves();
    
    // Determine which reserve is PAGE and which is ETH
    const pageReserve = ethereumToken.tokenIsToken0 ? reserve0 : reserve1;
    const ethReserve = ethereumToken.tokenIsToken0 ? reserve1 : reserve0;
    
    // Convert reserves to proper numeric values
    const pageAmount = Number(pageReserve.toString()) / Math.pow(10, ethereumToken.decimals);
    const ethAmount = Number(ethReserve.toString()) / Math.pow(10, 18); // ETH has 18 decimals
    
    // Calculate TVL
    const pageTVL = pageAmount * pagePrice;
    const ethTVL = ethAmount * ethPrice;
    const totalTVL = pageTVL + ethTVL;
    
    console.log('Ethereum TVL:', totalTVL);
    return totalTVL;
  } catch (error) {
    console.error('Error calculating Ethereum TVL:', error);
    throw error;
  }
}

/**
 * Fetch Optimism TVL
 * @param pagePrice PAGE price in USD
 * @param ethPrice ETH price in USD
 * @returns TVL in USD
 */
export async function fetchOptimismTVL(pagePrice: number, ethPrice: number): Promise<number> {
  try {
    console.log('Fetching Optimism TVL...');
    const optimismToken = PAGE_TOKEN_CONFIG.find(token => token.chainId === 10);
    
    if (!optimismToken || !optimismToken.lpAddress) {
      throw new Error('Optimism token config not found');
    }
    
    // Get provider and create contract - make sure to await
    const provider = await getProvider('optimism');
    const pairContract = new ethers.Contract(optimismToken.lpAddress, UNISWAP_V2_PAIR_ABI, provider);
    
    // Get reserves
    const [reserve0, reserve1] = await pairContract.getReserves();
    
    // Determine which reserve is PAGE and which is ETH
    const pageReserve = optimismToken.tokenIsToken0 ? reserve0 : reserve1;
    const ethReserve = optimismToken.tokenIsToken0 ? reserve1 : reserve0;
    
    // Convert reserves to proper numeric values
    const pageAmount = Number(pageReserve.toString()) / Math.pow(10, optimismToken.decimals);
    const ethAmount = Number(ethReserve.toString()) / Math.pow(10, 18); // ETH has 18 decimals
    
    // Calculate TVL
    const pageTVL = pageAmount * pagePrice;
    const ethTVL = ethAmount * ethPrice;
    const totalTVL = pageTVL + ethTVL;
    
    console.log('Optimism TVL:', totalTVL);
    return totalTVL;
  } catch (error) {
    console.error('Error calculating Optimism TVL:', error);
    throw error;
  }
}

/**
 * Fetch Base TVL
 * @param pagePrice PAGE price in USD
 * @param ethPrice ETH price in USD
 * @returns TVL in USD
 */
export async function fetchBaseTVL(pagePrice: number, ethPrice: number): Promise<number> {
  try {
    console.log('Fetching Base TVL...');
    const baseToken = PAGE_TOKEN_CONFIG.find(token => token.chainId === 8453);
    
    if (!baseToken || !baseToken.lpAddress) {
      throw new Error('Base token config not found');
    }
    
    // For V3 pools, we need a different approach
    const provider = await getProvider('base');
    
    // Extended ABI for V3 pool with liquidity function
    const poolContract = new ethers.Contract(baseToken.lpAddress, UNISWAP_V3_POOL_ABI, provider);
    
        // Get current liquidity in the pool
        const liquidity = await poolContract.liquidity();
        console.log('Total V3 pool liquidity:', liquidity.toString());
        
        // Get slot0 for the current tick and price
        const slot0 = await poolContract.slot0();
        const currentTick = slot0.tick;
        console.log('Current tick:', currentTick);
        
        // Get token addresses
        const token0Address = await poolContract.token0();
        const token1Address = await poolContract.token1();
        
        // Check if PAGE is token0 or token1
        const pageIsToken0 = token0Address.toLowerCase() === baseToken.address.toLowerCase();
        const PAGE_DECIMALS = baseToken.decimals;
        const ETH_DECIMALS = 18; // ETH has 18 decimals
        
        // Calculate amounts from liquidity
        // These formulas are based on Uniswap V3 whitepaper and SDK
        const sqrtRatioX96 = ethers.BigNumber.from(slot0.sqrtPriceX96.toString());
        const Q96 = ethers.BigNumber.from(2).pow(96);
        
        // Helper function to calculate amounts from liquidity
        function getTokenAmountsFromLiquidity(sqrtRatioX96: ethers.BigNumber, liquidity: ethers.BigNumber) {
          // Convert to BigNumber for precision
          const liquidityBN = ethers.BigNumber.from(liquidity.toString());
          
          // Calculate amount0 (token0 amount)
          const amount0BN = liquidityBN.mul(Q96).div(sqrtRatioX96);
          
          // Calculate amount1 (token1 amount)
          const amount1BN = liquidityBN.mul(sqrtRatioX96).div(Q96);
          
          // Convert back to Number with proper decimal adjustments
          const amount0 = Number(amount0BN.toString()) / Math.pow(10, pageIsToken0 ? PAGE_DECIMALS : ETH_DECIMALS);
          const amount1 = Number(amount1BN.toString()) / Math.pow(10, pageIsToken0 ? ETH_DECIMALS : PAGE_DECIMALS);
          
          return { amount0, amount1 };
        }
        
        // Get token amounts from liquidity
        const { amount0, amount1 } = getTokenAmountsFromLiquidity(sqrtRatioX96, liquidity);
        
        // Calculate TVL based on which token is PAGE
        const pageAmount = pageIsToken0 ? amount0 : amount1;
        const ethAmount = pageIsToken0 ? amount1 : amount0;
        
        const pageTVL = pageAmount * pagePrice;
        const ethTVL = ethAmount * ethPrice;
        const totalTVL = pageTVL + ethTVL;
        
        console.log('Base TVL:', totalTVL);
        return totalTVL;
      } catch (error) {
        console.error('Error calculating Base TVL:', error);
        throw error;
      }
    }
    
    /**
     * Fetch Osmosis TVL from pool data
     * @returns TVL in USD
     */
    export async function fetchOsmosisTVL(): Promise<number> {
      try {
        console.log('Fetching Osmosis TVL...');
        
        // Get PAGE/OSMO pool data (Pool 1344)
        const poolResponse = await axios.get(`${OSMOSIS.LCD}/osmosis/gamm/v1beta1/pools/${OSMOSIS.POOL_ID}`);
        
        if (!poolResponse.data || !poolResponse.data.pool || !poolResponse.data.pool.pool_assets) {
          throw new Error('Invalid pool data structure');
        }
        
        const assets = poolResponse.data.pool.pool_assets;
        
        // Find PAGE and OSMO in pool assets
        const pageAsset = assets.find((asset: any) => 
          asset.token.denom === OSMOSIS.PAGE_DENOM
        );
        
        const osmoAsset = assets.find((asset: any) => 
          asset.token.denom === 'uosmo'
        );
        
        if (!pageAsset || !osmoAsset) {
          throw new Error('Could not identify tokens in pool');
        }
        
        // Get amounts from pool assets
        const pageAmount = Number(pageAsset.token.amount) / Math.pow(10, OSMOSIS.TOKEN_DECIMALS.PAGE);
        const osmoAmount = Number(osmoAsset.token.amount) / Math.pow(10, OSMOSIS.TOKEN_DECIMALS.OSMO);
        
        // Get OSMO/USDC price from pool 678
        const osmoUsdcResponse = await axios.get(`${OSMOSIS.LCD}/osmosis/gamm/v1beta1/pools/${OSMOSIS.OSMO_USDC_POOL_ID}`);
        
        if (!osmoUsdcResponse.data || !osmoUsdcResponse.data.pool || !osmoUsdcResponse.data.pool.pool_assets) {
          throw new Error('Invalid OSMO/USDC pool data');
        }
        
        const osmoUsdcAssets = osmoUsdcResponse.data.pool.pool_assets;
        
        const osmoUsdcAsset = osmoUsdcAssets.find((asset: any) => 
          asset.token.denom === 'uosmo'
        );
        
        const usdcAsset = osmoUsdcAssets.find((asset: any) => 
          asset.token.denom.includes(OSMOSIS.USDC_DENOM)
        );
        
        if (!osmoUsdcAsset || !usdcAsset) {
          throw new Error('Could not identify tokens in OSMO/USDC pool');
        }
        
        const osmoAmountUsdcPool = Number(osmoUsdcAsset.token.amount) / Math.pow(10, OSMOSIS.TOKEN_DECIMALS.OSMO);
        const usdcAmount = Number(usdcAsset.token.amount) / Math.pow(10, OSMOSIS.TOKEN_DECIMALS.USDC);
        
        // Calculate OSMO price in USD
        const osmoUsdPrice = usdcAmount / osmoAmountUsdcPool;
        
        // Calculate TVL in USD
        const osmoValueInUsd = osmoAmount * osmoUsdPrice;
        const pagePrice = (osmoAmount * osmoUsdPrice) / pageAmount;
        const pageValueInUsd = pageAmount * pagePrice;
        
        const totalTvl = osmoValueInUsd + pageValueInUsd;
        
        console.log('Osmosis TVL:', totalTvl);
        return totalTvl;
      } catch (error) {
        console.error('Error fetching Osmosis TVL:', error);
        throw error;
      }
    }
    
