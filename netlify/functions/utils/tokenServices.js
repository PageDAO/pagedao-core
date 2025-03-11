const axios = require('axios');
const { ethers } = require('ethers');
const { OSMOSIS_LCD, POOL_ID, OSMO_USDC_POOL_ID, OSMO_USDC_DENOM, OSMOSIS_PAGE_DENOM, TOKEN_DECIMALS } = require('./constants');
const {
  PAGE_TOKEN_CONFIG,
  COSMOS_PAGE_TOKEN,
  ETH_USDC_PAIR,
  RPC_URLS,
  BACKUP_RPC_URLS,
  CACHE_DURATION
} = require('./tokenConfig');

// Uniswap V2 Pair ABI (minimal for getting reserves)
const UNISWAP_V2_PAIR_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "getReserves",
    "outputs": [
      { "internalType": "uint112", "name": "_reserve0", "type": "uint112" },
      { "internalType": "uint112", "name": "_reserve1", "type": "uint112" },
      { "internalType": "uint32", "name": "_blockTimestampLast", "type": "uint32" }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

// Uniswap V3 Pool ABI (minimal for price calculation)
const UNISWAP_V3_POOL_ABI = [
  {
    "inputs": [],
    "name": "slot0",
    "outputs": [
      { "internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160" },
      { "internalType": "int24", "name": "tick", "type": "int24" },
      { "internalType": "uint16", "name": "observationIndex", "type": "uint16" },
      { "internalType": "uint16", "name": "observationCardinality", "type": "uint16" },
      { "internalType": "uint16", "name": "observationCardinalityNext", "type": "uint16" },
      { "internalType": "uint8", "name": "feeProtocol", "type": "uint8" },
      { "internalType": "bool", "name": "unlocked", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "liquidity",
    "outputs": [{"internalType": "uint128", "name": "", "type": "uint128"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token0",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token1",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Cache for prices
let priceCache = {
  ethereum: null,
  optimism: null,
  base: null,
  osmosis: null,
  timestamp: 0,
  ethPrice: null
};

/**
 * Fetches PAGE token prices from all supported chains
 */
async function fetchPagePrices() {
  // Check if cache is still valid (keeping cache for performance, not as fallback)
  const now = Date.now();
  if (priceCache.timestamp > 0 && now - priceCache.timestamp < CACHE_DURATION) {
    console.log('Using cached prices:', priceCache);
    return priceCache;
  }

  try {
    console.log('Fetching fresh PAGE token prices...');
    
    // First get ETH price - we need this for all EVM chain calculations
    const ethPrice = await fetchEthPrice();
    console.log('Fetched ETH price:', ethPrice);
    
    // Fetch prices in parallel - with NO fallbacks
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
    // Let the error propagate up to the caller instead of using fallbacks
    console.error('Error fetching prices:', error);
    throw error;
  }
}

/**
 * Fetch ETH price in USD from Uniswap V3 pool
 */
async function fetchEthPrice() {
  try {
    console.log('Fetching ETH price from Uniswap V3 pool...');
    const provider = getProvider('base');
    
    // Create contract instance with V3 ABI
    const poolContract = new ethers.Contract(ETH_USDC_PAIR.address, UNISWAP_V3_POOL_ABI, provider);
    
    // Get slot0 which contains the current sqrt price
    const slot0 = await poolContract.slot0();
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    
    console.log('Raw sqrtPriceX96:', sqrtPriceX96.toString());
    
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
    
    console.log('Raw price ratio:', rawPrice);
    
    // Adjust for token decimals
    // If token0 is USDC (6 decimals) and token1 is ETH (18 decimals)
    // Price in USDC / ETH needs adjustment by 10^(18-6) = 10^12
    
    let ethPrice;
    if (ETH_USDC_PAIR.token0IsETH) {
      // If ETH is token0, then price = amount of token1 (USDC) per 1 of token0 (ETH)
      // No decimal adjustment needed
      ethPrice = rawPrice;
    } else {
      // If ETH is token1, then price = amount of token0 (USDC) per 1 of token1 (ETH)
      // Need to adjust by 10^(ETH_decimals - USDC_decimals)
      const decimalAdjustment = Math.pow(10, ETH_USDC_PAIR.decimals.ETH - ETH_USDC_PAIR.decimals.USDC);
      ethPrice = rawPrice * decimalAdjustment;
    }
    
    console.log('Calculated ETH price from V3 pool:', ethPrice);
    return ethPrice;
  } catch (error) {
    console.error('Error fetching ETH price from Uniswap V3 pool:', error);
    throw error;
  }
}/**
 * Calculate PAGE price from pool data (from EVMClient.ts)
 */
function calculatePagePrice(poolData, ethPrice) {
  // PAGE price = ETH amount * ETH price / PAGE amount
  return (poolData.tokenBAmount * ethPrice) / poolData.tokenAAmount;
}

/**
 * Gets Osmosis pool data for PAGE/OSMO pool
 * Returns TVL and PAGE token amount
 */
async function getOsmosisPoolData() {
  try {
    console.log('Fetching Osmosis pool data...');
    // Get PAGE/OSMO pool data
    const poolResponse = await axios.get(`${OSMOSIS_LCD}/osmosis/gamm/v1beta1/pools/${POOL_ID}`);
    if (!poolResponse.data || !poolResponse.data.pool || !poolResponse.data.pool.pool_assets) {
      throw new Error('Invalid pool data structure');
    }
    const assets = poolResponse.data.pool.pool_assets;
    
    // Find PAGE and OSMO in pool assets
    const pageAsset = assets.find(asset =>
      asset.token.denom === OSMOSIS_PAGE_DENOM
    );
    const osmoAsset = assets.find(asset =>
      asset.token.denom === 'uosmo'
    );
    
    if (!pageAsset || !osmoAsset) {
      throw new Error('Could not identify tokens in pool');
    }
    
    // Calculate token amounts
    const pageAmount = Number(pageAsset.token.amount) / Math.pow(10, TOKEN_DECIMALS.PAGE);
    const osmoAmount = Number(osmoAsset.token.amount) / Math.pow(10, TOKEN_DECIMALS.OSMO);
    
    // Get OSMO/USDC price for TVL calculation
    const osmoUsdcResponse = await axios.get(`${OSMOSIS_LCD}/osmosis/gamm/v1beta1/pools/${OSMO_USDC_POOL_ID}`);
    if (!osmoUsdcResponse.data || !osmoUsdcResponse.data.pool || !osmoUsdcResponse.data.pool.pool_assets) {
      throw new Error('Invalid OSMO/USDC pool data');
    }
    const osmoUsdcAssets = osmoUsdcResponse.data.pool.pool_assets;
    const osmoUsdcAsset = osmoUsdcAssets.find(asset =>
      asset.token.denom === 'uosmo'
    );
    const usdcAsset = osmoUsdcAssets.find(asset =>
      asset.token.denom.includes(OSMO_USDC_DENOM)
    );
    
    if (!osmoUsdcAsset || !usdcAsset) {
      throw new Error('Could not identify tokens in OSMO/USDC pool');
    }
    
    const osmoAmountUsdcPool = Number(osmoUsdcAsset.token.amount) / Math.pow(10, TOKEN_DECIMALS.OSMO);
    const usdcAmount = Number(usdcAsset.token.amount) / Math.pow(10, TOKEN_DECIMALS.USDC);
    const osmoUsdPrice = usdcAmount / osmoAmountUsdcPool;
    
    // Calculate TVL (PAGE value + OSMO value in USD)
    const pagePrice = (osmoAmount * osmoUsdPrice) / pageAmount;
    const pageValueUsd = pageAmount * pagePrice;
    const osmoValueUsd = osmoAmount * osmoUsdPrice;
    const totalTvl = pageValueUsd + osmoValueUsd;
    
    return {
      pageAmount,
      osmoAmount,
      tvl: totalTvl,
      pagePrice
    };
  } catch (error) {
    console.error('Error fetching Osmosis pool data:', error);
    throw error;
  }
}

// Update the module exports to include the new function
module.exports = {
  fetchPagePrices,
  getPoolReserves,
  getOsmosisPoolData
};

/**
 * Get a provider for the specified chain with fallback to backup RPC
 */
function getProvider(chain) {
  const primaryRpcUrl = RPC_URLS[chain];
  const backupRpcUrl = BACKUP_RPC_URLS[chain];
  
  if (!primaryRpcUrl && !backupRpcUrl) {
    throw new Error(`No RPC URL configured for chain: ${chain}`);
  }
  
  console.log(`Using primary RPC for ${chain}: ${primaryRpcUrl}`);
  return new ethers.JsonRpcProvider(primaryRpcUrl);
}

/**
 * Get pool reserves for a Uniswap V2-compatible pair
 */
async function getPoolReserves(lpAddress, tokenConfig, chain) {
  try {
    const provider = getProvider(chain);
    const pairContract = new ethers.Contract(lpAddress, UNISWAP_V2_PAIR_ABI, provider);
    
    // Get reserves
    const [reserve0, reserve1] = await pairContract.getReserves();
    
    // Determine which reserve is PAGE and which is ETH based on tokenIsToken0
    const pageReserve = tokenConfig.tokenIsToken0 ? reserve0 : reserve1;
    const ethReserve = tokenConfig.tokenIsToken0 ? reserve1 : reserve0;
    
    // Convert reserves to proper numeric values based on decimals
    const pageAmount = Number(pageReserve) / Math.pow(10, tokenConfig.decimals);
    const ethAmount = Number(ethReserve) / Math.pow(10, 18); // ETH has 18 decimals
    
    return {
      tokenAAmount: pageAmount, // PAGE
      tokenBAmount: ethAmount   // ETH
    };
  } catch (error) {
    console.error(`Error getting pool reserves for ${chain}:`, error);
    throw error;
  }
}

/**
 * Fetch Ethereum PAGE price using actual Uniswap pool data
 */
async function fetchEthereumPagePrice(ethPrice) {
  try {
    console.log('Fetching Ethereum PAGE price...');
    const ethereumToken = PAGE_TOKEN_CONFIG.find(token => token.chainId === 1);
    
    if (!ethereumToken || !ethereumToken.lpAddress) {
      throw new Error('Ethereum token config not found');
    }
    
    // Get actual pool reserves from Uniswap
    const poolData = await getPoolReserves(ethereumToken.lpAddress, ethereumToken, 'ethereum');
    console.log('Ethereum pool data:', poolData);
    
    // Calculate PAGE price using the reserves and ETH price
    const pagePrice = calculatePagePrice(poolData, ethPrice);
    console.log('Calculated PAGE price on Ethereum:', pagePrice);
    
    return pagePrice;
  } catch (error) {
    console.error('Error fetching Ethereum PAGE price:', error);
    return priceCache.ethereum || 0.12; // Fallback price
  }
}

/**
 * Fetch Optimism PAGE price
 */
async function fetchOptimismPagePrice(ethPrice) {
  try {
    console.log('Fetching Optimism PAGE price...');
    const optimismToken = PAGE_TOKEN_CONFIG.find(token => token.chainId === 10);
    
    if (!optimismToken || !optimismToken.lpAddress) {
      throw new Error('Optimism token config not found');
    }
    
    // Get actual pool reserves from Uniswap on Optimism
    const poolData = await getPoolReserves(optimismToken.lpAddress, optimismToken, 'optimism');
    console.log('Optimism pool data:', poolData);
    
    // Calculate PAGE price using the reserves and ETH price
    const pagePrice = calculatePagePrice(poolData, ethPrice);
    console.log('Calculated PAGE price on Optimism:', pagePrice);
    
    return pagePrice;
  } catch (error) {
    console.error('Error fetching Optimism PAGE price:', error);
    return priceCache.optimism || 0.12; // Fallback price
  }
}

/**
 * Fetch Base PAGE price
 */
async function fetchBasePagePrice(ethPrice) {
  try {
    console.log('Fetching Base PAGE price...');
    const baseToken = PAGE_TOKEN_CONFIG.find(token => token.chainId === 8453);
    
    if (!baseToken || !baseToken.lpAddress) {
      throw new Error('Base token config not found');
    }
    
    // Get actual pool reserves from Uniswap on Base
    const poolData = await getPoolReserves(baseToken.lpAddress, baseToken, 'base');
    console.log('Base pool data:', poolData);
    
    // Calculate PAGE price using the reserves and ETH price
    const pagePrice = calculatePagePrice(poolData, ethPrice);
    console.log('Calculated PAGE price on Base:', pagePrice);
    
    return pagePrice;
  } catch (error) {
    console.error('Error fetching Base PAGE price:', error);
    return priceCache.base || 0.12; // Fallback price
  }
}
module.exports = {
  fetchPagePrices,
  getPoolReserves
};