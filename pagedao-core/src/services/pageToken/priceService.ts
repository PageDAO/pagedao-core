import axios from 'axios';
import { ethers } from 'ethers';
import { getProvider } from '../blockchain/provider';
import {
  PAGE_TOKEN_CONFIG,
  COSMOS_PAGE_TOKEN,
  OSMOSIS,
  ETH_USDC_PAIR,
  CACHE_DURATION,
  TokenConfig
} from '../../utils/config';
import { UNISWAP_V2_PAIR_ABI, UNISWAP_V3_POOL_ABI } from '../../utils/abis';

// Types for price data
export interface PriceData {
  ethereum: number;
  optimism: number;
  base: number;
  osmosis: number;
  ethPrice: number;
  timestamp: number;
}

export interface PoolData {
  tokenAAmount: number; // PAGE amount
  tokenBAmount: number; // ETH amount
}

// Cache for prices
let priceCache: PriceData = {
  ethereum: 0,
  optimism: 0,
  base: 0,
  osmosis: 0,
  ethPrice: 0,
  timestamp: 0
};

/**
 * Fetches PAGE token prices from all supported chains
 * @returns Promise with price data for all chains
 */
export async function fetchPagePrices(): Promise<PriceData> {
  // Check if cache is still valid
  const now = Date.now();
  if (priceCache.timestamp > 0 && now - priceCache.timestamp < CACHE_DURATION) {
    console.log('Using cached prices:', priceCache);
    return priceCache;
  }

  console.log('Fetching fresh PAGE token prices...');
  
  try {
    // First get ETH price - we need this for all EVM chain calculations
    const ethPrice = await fetchEthPrice();
    console.log('Fetched ETH price:', ethPrice);
    
    // Fetch prices in parallel
    const [osmosisPrice, ethereumPrice, optimismPrice, basePrice] = await Promise.all([
      fetchOsmosisPrice(),
      fetchEthereumPagePrice(ethPrice),
      fetchOptimismPagePrice(ethPrice),
      fetchBasePagePrice(ethPrice)
    ]);

    // Update cache
    priceCache = {
      ethereum: ethereumPrice,
      optimism: optimismPrice,
      base: basePrice,
      osmosis: osmosisPrice,
      ethPrice: ethPrice,
      timestamp: now
    };

    console.log('Updated price cache:', priceCache);
    return priceCache;
  } catch (error) {
    console.error('Error fetching prices:', error);
    throw error; // Let the error propagate to the caller
  }
}

/**
 * Fetch ETH price in USD from Uniswap V3 pool
 * @returns Promise with ETH price in USD
 */
export async function fetchEthPrice(): Promise<number> {
  try {
    console.log('Fetching ETH price from Uniswap V3 pool...');
    
    // Make sure to await the provider
    const provider = await getProvider('base');
    
    // Create contract instance with V3 ABI
    const poolContract = new ethers.Contract(
      ETH_USDC_PAIR.address, 
      UNISWAP_V3_POOL_ABI, 
      provider
    );
    
    // Get slot0 which contains the current sqrt price
    const slot0 = await poolContract.slot0();
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    
    console.log('Raw sqrtPriceX96:', sqrtPriceX96.toString());
    
    // Convert sqrtPriceX96 to BigNumber
    const sqrtPriceX96BN = ethers.BigNumber.from(sqrtPriceX96.toString());
    
    // Square the value
    const priceX192BN = sqrtPriceX96BN.mul(sqrtPriceX96BN);
    
    // Divide by 2^192 (because we squared 2^96)
    const Q192 = ethers.BigNumber.from(2).pow(192);
    
    // Calculate raw price - convert to numbers for division
    const rawPrice = Number(priceX192BN.toString()) / Number(Q192.toString());
    
    console.log('Raw price ratio:', rawPrice);
    
    // Adjust for token decimals
    let ethPrice;
    if (ETH_USDC_PAIR.token0IsETH) {
      // If ETH is token0, then price = amount of token1 (USDC) per 1 of token0 (ETH)
      ethPrice = rawPrice;
    } else {
      // If ETH is token1, then price = amount of token0 (USDC) per 1 of token1 (ETH)
      const decimalAdjustment = Math.pow(10, ETH_USDC_PAIR.decimals.ETH - ETH_USDC_PAIR.decimals.USDC);
      ethPrice = rawPrice * decimalAdjustment;
    }
    
    console.log('Calculated ETH price from V3 pool:', ethPrice);
    return ethPrice;
  } catch (error) {
    console.error('Error fetching ETH price from Uniswap V3 pool:', error);
    throw error;
  }
}

/**
 * Calculate PAGE price from pool data
 * @param poolData Pool data with token amounts
 * @param ethPrice ETH price in USD
 * @returns PAGE price in USD
 */
function calculatePagePrice(poolData: PoolData, ethPrice: number): number {
  // PAGE price = ETH amount * ETH price / PAGE amount
  return (poolData.tokenBAmount * ethPrice) / poolData.tokenAAmount;
}

/**
 * Get pool reserves for a Uniswap pool (v2 or v3)
 * @param lpAddress LP address
 * @param tokenConfig Token configuration
 * @param chain Chain name
 * @returns Pool data with token amounts
 */
async function getPoolReserves(lpAddress: string, tokenConfig: TokenConfig, chain: string): Promise<PoolData> {
  try {
    // Make sure to await the provider
    const provider = await getProvider(chain);
    
    // Different handling based on pool type
    if (tokenConfig.poolType === 'v2') {
      return await getV2PoolReserves(lpAddress, tokenConfig, provider);
    } else if (tokenConfig.poolType === 'v3') {
      return await getV3PoolReserves(lpAddress, tokenConfig, provider);
    } else {
      throw new Error(`Unsupported pool type: ${tokenConfig.poolType}`);
    }
  } catch (error) {
    console.error(`Error getting pool reserves for ${chain}:`, error);
    throw error;
  }
}

/**
 * Get pool reserves for a Uniswap V2 pair
 * @param lpAddress LP address
 * @param tokenConfig Token configuration
 * @param provider Ethers provider
 * @returns Pool data with token amounts
 */
async function getV2PoolReserves(
  lpAddress: string, 
  tokenConfig: TokenConfig, 
  provider: ethers.providers.JsonRpcProvider
): Promise<PoolData> {
  // Create contract with the provided provider
  const pairContract = new ethers.Contract(
    lpAddress, 
    UNISWAP_V2_PAIR_ABI, 
    provider
  );
  
  // Get reserves
  const [reserve0, reserve1] = await pairContract.getReserves();
  
  // Determine which reserve is PAGE and which is ETH based on tokenIsToken0
  const pageReserve = tokenConfig.tokenIsToken0 ? reserve0 : reserve1;
  const ethReserve = tokenConfig.tokenIsToken0 ? reserve1 : reserve0;
  
  // Convert reserves to proper numeric values based on decimals
  const pageAmount = Number(pageReserve.toString()) / Math.pow(10, tokenConfig.decimals);
  const ethAmount = Number(ethReserve.toString()) / Math.pow(10, 18); // ETH has 18 decimals
  
  return {
    tokenAAmount: pageAmount, // PAGE
    tokenBAmount: ethAmount   // ETH
  };
}

/**
 * Get pool data from a Uniswap V3 pool with correct decimal handling
 * @param lpAddress LP address
 * @param tokenConfig Token configuration
 * @param provider Ethers provider
 * @returns Pool data with token amounts
 */
async function getV3PoolReserves(
  lpAddress: string, 
  tokenConfig: TokenConfig, 
  provider: ethers.providers.JsonRpcProvider
): Promise<PoolData> {
  try {
    console.log(`Fetching V3 pool data for ${lpAddress}...`);
    
    // Create contract with the provided provider
    const poolContract = new ethers.Contract(
      lpAddress, 
      UNISWAP_V3_POOL_ABI, 
      provider
    );
    
    // Get token addresses to determine which is PAGE
    const token0Address = await poolContract.token0();
    const token1Address = await poolContract.token1();
    
    console.log('V3 Pool token0:', token0Address);
    console.log('V3 Pool token1:', token1Address);
    console.log('PAGE token address:', tokenConfig.address);
    
    // Determine if PAGE is token0 or token1
    const pageIsToken0 = token0Address.toLowerCase() === tokenConfig.address.toLowerCase();
    
    console.log('PAGE is token0:', pageIsToken0);
    
    // Get price information from slot0
    const slot0 = await poolContract.slot0();
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    
    console.log('V3 sqrtPriceX96:', sqrtPriceX96.toString());
    
    // Calculate price from sqrtPriceX96 using ethers.js v5 BigNumber
    const sqrtPriceX96BN = ethers.BigNumber.from(sqrtPriceX96.toString());
    const priceX192BN = sqrtPriceX96BN.mul(sqrtPriceX96BN);
    const Q192 = ethers.BigNumber.from(2).pow(192);
    const rawPrice = Number(priceX192BN.toString()) / Number(Q192.toString());
    
    console.log('V3 raw price ratio (token1/token0):', rawPrice);
    
    // First, we need ETH/PAGE (which is 1/rawPrice)
    const ethPerPageRaw = 1 / rawPrice;
    console.log('Raw ETH per PAGE (1/rawPrice):', ethPerPageRaw);
    
    // Now adjust for decimals
    // Since ETH has 18 decimals and PAGE has 8, we adjust by 10^(18-8) = 10^10
    const decimalAdjustment = Math.pow(10, 18 - tokenConfig.decimals);
    console.log('Decimal adjustment factor:', decimalAdjustment);
    
    // Apply the decimal adjustment to get the correct ETH/PAGE ratio
    const ethPerPageAdjusted = ethPerPageRaw / decimalAdjustment;
    console.log('Adjusted ETH per PAGE:', ethPerPageAdjusted);
    
    // Return the values properly formatted for calculatePagePrice
    return {
        tokenAAmount: 1, // PAGE amount
        tokenBAmount: ethPerPageAdjusted // ETH amount per PAGE
    };
  } catch (error) {
    console.error('Error getting V3 pool reserves:', error);
    throw error;
  }
}

/**
 * Fetch Osmosis PAGE price
 * @returns Promise with PAGE price in USD
 */
export async function fetchOsmosisPrice(): Promise<number> {
  try {
    console.log('Fetching Osmosis price...');
    
    // Get PAGE/OSMO pool data
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
    
    // Calculate PAGE price in OSMO
    const pageAmount = Number(pageAsset.token.amount) / Math.pow(10, OSMOSIS.TOKEN_DECIMALS.PAGE);
    const osmoAmount = Number(osmoAsset.token.amount) / Math.pow(10, OSMOSIS.TOKEN_DECIMALS.OSMO);
    
    // Get OSMO/USDC price
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
    
    const osmoUsdPrice = usdcAmount / osmoAmountUsdcPool;
    
    // Calculate PAGE price in USD
    const pageUsdPrice = (osmoAmount * osmoUsdPrice) / pageAmount;
    
    console.log('Calculated PAGE price on Osmosis:', pageUsdPrice);
    return pageUsdPrice;
  } catch (error) {
    console.error('Error fetching Osmosis price:', error);
    throw error;
  }
}

/**
 * Fetch Ethereum PAGE price using actual Uniswap pool data
 * @param ethPrice ETH price in USD
 * @returns Promise with PAGE price in USD
 */
export async function fetchEthereumPagePrice(ethPrice: number): Promise<number> {
  try {
    console.log('Fetching Ethereum PAGE price...');
    const ethereumToken = PAGE_TOKEN_CONFIG.find(token => token.chainId === 1);
    
    if (!ethereumToken || !ethereumToken.lpAddress) {
      throw new Error('Ethereum token config not found');
    }
    
    // Get actual pool reserves from Uniswap - make sure to await the result
    const poolData = await getPoolReserves(ethereumToken.lpAddress, ethereumToken, 'ethereum');
    console.log('Ethereum pool data:', poolData);
    
    // Calculate PAGE price using the reserves and ETH price
    const pagePrice = calculatePagePrice(poolData, ethPrice);
    console.log('Calculated PAGE price on Ethereum:', pagePrice);
    
    return pagePrice;
  } catch (error) {
    console.error('Error fetching Ethereum PAGE price:', error);
    throw error;
  }
}

/**
 * Fetch Optimism PAGE price
 * @param ethPrice ETH price in USD
 * @returns Promise with PAGE price in USD
 */
export async function fetchOptimismPagePrice(ethPrice: number): Promise<number> {
  try {
    console.log('Fetching Optimism PAGE price...');
    const optimismToken = PAGE_TOKEN_CONFIG.find(token => token.chainId === 10);
    
    if (!optimismToken || !optimismToken.lpAddress) {
      throw new Error('Optimism token config not found');
    }
    
    // Get actual pool reserves from Uniswap on Optimism - make sure to await the result
    const poolData = await getPoolReserves(optimismToken.lpAddress, optimismToken, 'optimism');
    console.log('Optimism pool data:', poolData);
    
    // Calculate PAGE price using the reserves and ETH price
    const pagePrice = calculatePagePrice(poolData, ethPrice);
    console.log('Calculated PAGE price on Optimism:', pagePrice);
    
    return pagePrice;
  } catch (error) {
    console.error('Error fetching Optimism PAGE price:', error);
    throw error;
  }
}

/**
 * Fetch Base PAGE price
 * @param ethPrice ETH price in USD
 * @returns Promise with PAGE price in USD
 */
export async function fetchBasePagePrice(ethPrice: number): Promise<number> {
  try {
    console.log('Fetching Base PAGE price...');
    const baseToken = PAGE_TOKEN_CONFIG.find(token => token.chainId === 8453);
    
    if (!baseToken || !baseToken.lpAddress) {
      throw new Error('Base token config not found');
    }
    
    // Get actual pool reserves from Uniswap on Base - make sure to await the result
    const poolData = await getPoolReserves(baseToken.lpAddress, baseToken, 'base');
    console.log('Base pool data:', poolData);
    
    // Calculate PAGE price using the reserves and ETH price
    const pagePrice = calculatePagePrice(poolData, ethPrice);
    console.log('Calculated PAGE price on Base:', pagePrice);
    
    return pagePrice;
  } catch (error) {
    console.error('Error fetching Base PAGE price:', error);
    throw error;
  }
}
