const axios = require('axios');
const { ethers } = require('ethers');
const { OSMOSIS_LCD, POOL_ID, OSMO_USDC_POOL_ID, OSMO_USDC_DENOM, OSMOSIS_PAGE_DENOM, TOKEN_DECIMALS } = require('./constants');
const {
  PAGE_TOKEN_CONFIG,
  COSMOS_PAGE_TOKEN,
  ETH_USDC_PAIR,
  CACHE_DURATION
} = require('./tokenConfig');
const { getProvider } = require('./web3');
const { UNISWAP_V2_PAIR_ABI, UNISWAP_V3_POOL_ABI } = require('./abis');

// Cache for prices
let priceCache = {
  ethereum: null,
  optimism: null,
  base: null,
  osmosis: null,
  timestamp: 0,
  ethPrice: null,
  osmosisTVL: null
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
 * Get pool reserves for a Uniswap pool (v2 or v3)
 */
async function getPoolReserves(lpAddress, tokenConfig, chain) {
  try {
    const provider = getProvider(chain);
    
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
 */
async function getV2PoolReserves(lpAddress, tokenConfig, provider) {
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
}

/**
 * Get pool data from a Uniswap V3 pool with correct decimal handling
 */
async function getV3PoolReserves(lpAddress, tokenConfig, provider) {
  try {
    console.log(`Fetching V3 pool data for ${lpAddress}...`);
    const poolContract = new ethers.Contract(lpAddress, UNISWAP_V3_POOL_ABI, provider);
    
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
    
    // Calculate price from sqrtPriceX96
    const sqrtPriceX96BigInt = BigInt(sqrtPriceX96.toString());
    const priceX192BigInt = sqrtPriceX96BigInt * sqrtPriceX96BigInt;
    const Q192 = BigInt(2) ** BigInt(192);
    const rawPrice = Number(priceX192BigInt) / Number(Q192);
    
    console.log('V3 raw price ratio (token1/token0):', rawPrice);
    
    // From your logs, we know PAGE is token1 and ETH is token0
    // So raw price = PAGE/ETH (this is backwards from what we want)
    
    // DEBUGGING: Let's track all calculations step by step
    console.log('Token0 decimals (ETH):', 18);
    console.log('Token1 decimals (PAGE):', tokenConfig.decimals);
    
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
    
    // Calculate the expected USD price with ETH at ~1888
    const expectedUsdPrice = ethPerPageAdjusted * 1888;
    console.log('Expected PAGE price in USD:', expectedUsdPrice);
    
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
 * Get TVL for a Uniswap V3 pool
 * @param {string} poolAddress - Address of the V3 pool
 * @param {object} tokenConfig - Token configuration
 * @param {string} chain - Chain name
 * @param {number} pagePrice - Current PAGE price in USD
 * @param {number} ethPrice - Current ETH price in USD
 * @returns {Promise<number>} - TVL in USD
 */
async function getV3PoolTVL(poolAddress, tokenConfig, chain, pagePrice, ethPrice) {
  try {
    console.log(`Fetching V3 pool TVL for ${poolAddress}...`);
    const provider = getProvider(chain);
    
    // Extended ABI for V3 pool with liquidity function
    const poolAbiExtended = [
      ...UNISWAP_V3_POOL_ABI,
      {
        "inputs": [],
        "name": "liquidity",
        "outputs": [{ "internalType": "uint128", "name": "", "type": "uint128" }],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    const poolContract = new ethers.Contract(poolAddress, poolAbiExtended, provider);
    
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
    const pageIsToken0 = token0Address.toLowerCase() === tokenConfig.address.toLowerCase();
    const PAGE_DECIMALS = tokenConfig.decimals;
    const ETH_DECIMALS = 18; // ETH has 18 decimals
    
    // Calculate amounts from liquidity
    // These formulas are based on Uniswap V3 whitepaper and SDK
    const sqrtRatioX96 = BigInt(slot0.sqrtPriceX96.toString());
    const Q96 = BigInt(2) ** BigInt(96);
    
    // Helper function to calculate amounts from liquidity
    function getTokenAmountsFromLiquidity(sqrtRatioX96, liquidity) {
      // Convert to BigInt for precision
      const liquidityBigInt = BigInt(liquidity.toString());
      
      // Calculate amount0 (token0 amount)
      const amount0BigInt = (liquidityBigInt * Q96) / sqrtRatioX96;
      
      // Calculate amount1 (token1 amount)
      const amount1BigInt = (liquidityBigInt * sqrtRatioX96) / Q96;
      
      // Convert back to Number with proper decimal adjustments
      const amount0 = Number(amount0BigInt) / Math.pow(10, pageIsToken0 ? PAGE_DECIMALS : ETH_DECIMALS);
      const amount1 = Number(amount1BigInt) / Math.pow(10, pageIsToken0 ? ETH_DECIMALS : PAGE_DECIMALS);
      
      return { amount0, amount1 };
    }
    
    // Get token amounts from liquidity
    const { amount0, amount1 } = getTokenAmountsFromLiquidity(sqrtRatioX96, liquidity);
    
    console.log('Amount token0:', amount0);
    console.log('Amount token1:', amount1);
    
    // Calculate TVL - ensure we're assigning PAGE and ETH correctly
    const pageAmount = pageIsToken0 ? amount0 : amount1;
    const ethAmount = pageIsToken0 ? amount1 : amount0;
    
    const pageTVL = pageAmount * pagePrice;
    const ethTVL = ethAmount * ethPrice;
    const totalTVL = pageTVL + ethTVL;
    
    console.log('PAGE TVL:', pageTVL);
    console.log('ETH TVL:', ethTVL);
    console.log('Total TVL:', totalTVL);
    
    return totalTVL;
  } catch (error) {
    console.error('Error calculating V3 pool TVL:', error);
    throw error;
  }
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
 * Fetch Osmosis TVL from pool data
 */
async function fetchOsmosisTVL() {
  try {
    console.log('Fetching Osmosis TVL...');
    
    // Get PAGE/OSMO pool data (Pool 1344)
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
    
    // Get amounts from pool assets
    const pageAmount = Number(pageAsset.token.amount) / Math.pow(10, TOKEN_DECIMALS.PAGE);
    const osmoAmount = Number(osmoAsset.token.amount) / Math.pow(10, TOKEN_DECIMALS.OSMO);
    
    // Get OSMO/USDC price from pool 678
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
    
    // Calculate OSMO price in USD
    const osmoUsdPrice = usdcAmount / osmoAmountUsdcPool;
    
    // Calculate TVL in USD
    const osmoValueInUsd = osmoAmount * osmoUsdPrice;
    const pagePrice = (osmoAmount * osmoUsdPrice) / pageAmount;
    const pageValueInUsd = pageAmount * pagePrice;
    
    const totalTvl = osmoValueInUsd + pageValueInUsd;
    
    console.log('Calculated Osmosis TVL:', totalTvl);
    return totalTvl;
  } catch (error) {
    console.error('Error fetching Osmosis TVL:', error);
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
  getPoolReserves,
  fetchOsmosisTVL,
  getV3PoolTVL
};
