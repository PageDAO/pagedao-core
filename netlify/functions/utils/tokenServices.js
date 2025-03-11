const axios = require('axios');
const { ethers } = require('ethers');
const { OSMOSIS_LCD, POOL_ID, OSMO_USDC_POOL_ID, OSMO_USDC_DENOM, OSMOSIS_PAGE_DENOM, TOKEN_DECIMALS } = require('./constants');
const {
  PAGE_TOKEN_CONFIG,
  COSMOS_PAGE_TOKEN,
  ETH_USDC_PAIR,
  CACHE_DURATION
} = require('./tokenConfig');
const { getProvider, getPoolReserves } = require('./web3');

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
 */
function calculatePagePrice(poolData, ethPrice) {
  // PAGE price = ETH amount * ETH price / PAGE amount
  return (poolData.tokenBAmount * ethPrice) / poolData.tokenAAmount;
}

/**
 * Fetch Osmosis PAGE price
 */
async function fetchOsmosisPrice() {
  try {
    console.log('Fetching Osmosis price...');
    
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
    
    // Calculate PAGE price in OSMO
    const pageAmount = Number(pageAsset.token.amount) / Math.pow(10, TOKEN_DECIMALS.PAGE);
    const osmoAmount = Number(osmoAsset.token.amount) / Math.pow(10, TOKEN_DECIMALS.OSMO);
    
    // Get OSMO/USDC price
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
    throw error;
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
    throw error;
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
    throw error;
  }
}

module.exports = {
  fetchPagePrices,
  getPoolReserves
};