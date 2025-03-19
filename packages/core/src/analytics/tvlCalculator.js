const axios = require('axios');
const { ethers } = require('ethers');
const ProviderManager = require('../blockchain/provider');
const { 
  PAGE_TOKEN_CONFIG, 
  COSMOS_PAGE_TOKEN, 
  OSMOSIS,
  RPC_URLS, 
  BACKUP_RPC_URLS,
  CACHE_DURATION 
} = require('../config');

// Import ABIs
const UNISWAP_V2_PAIR_ABI = require('../utils/abis/uniswapV2Pair');
const UNISWAP_V3_POOL_ABI = require('../utils/abis/uniswapV3Pool');

// Create provider manager
const providerManager = new ProviderManager(RPC_URLS, BACKUP_RPC_URLS);

// Cache for TVL values
let tvlCache = {
  ethereum: null,
  optimism: null,
  base: null,
  osmosis: null,
  timestamp: 0
};

/**
 * Fetch TVL for all networks
 * @param {Object} priceData - Price data from price calculator
 * @returns {Object} - TVL data for each network
 */
async function fetchAllTVL(priceData) {
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
 * @param {Object} tvlData - TVL data for each network
 * @returns {Object} - Weight for each network
 */
function calculateTVLWeights(tvlData) {
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

// Include implementations of fetchEthereumTVL, fetchOsmosisTVL, etc. from tvlCalculator.js

module.exports = {
  fetchAllTVL,
  calculateTVLWeights
  // Export other TVL-related functions
};
