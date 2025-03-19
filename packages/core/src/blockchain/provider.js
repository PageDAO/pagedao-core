const { ethers } = require('ethers');
const { RPC_URLS, BACKUP_RPC_URLS } = require('../utils/config');

// Combine primary and backup RPC URLs into arrays for fallback
const COMBINED_RPC_URLS = {
  ethereum: [RPC_URLS.ethereum, BACKUP_RPC_URLS.ethereum],
  optimism: [RPC_URLS.optimism, BACKUP_RPC_URLS.optimism],
  base: [RPC_URLS.base, BACKUP_RPC_URLS.base]
};

/**
 * Try all providers in the list until one works
 * @param {string} chain - Chain name (ethereum, optimism, base)
 * @returns {Promise<ethers.providers.JsonRpcProvider>} - Working provider
 */
async function getProvider(chain) {
  if (!COMBINED_RPC_URLS[chain] || COMBINED_RPC_URLS[chain].length === 0) {
    throw new Error(`No RPC URLs configured for chain: ${chain}`);
  }
  
  // Try each provider in order until one works
  const errors = [];
  
  for (const rpcUrl of COMBINED_RPC_URLS[chain]) {
    try {
      console.log(`Trying RPC for ${chain}: ${rpcUrl}`);
      
      // Create provider with ethers v5 syntax
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      
      // Test the provider with a simple call to verify it's working
      const blockNumber = await provider.getBlockNumber();
      console.log(`Successfully connected to ${rpcUrl}, block #${blockNumber}`);
      
      return provider;
    } catch (error) {
      console.warn(`RPC failed for ${rpcUrl}: ${error.message}`);
      errors.push({url: rpcUrl, error: error.message});
    }
  }
  
  // If we get here, all providers failed
  throw new Error(`All RPC providers failed for ${chain}: ${JSON.stringify(errors)}`);
}

module.exports = {
  getProvider,
  COMBINED_RPC_URLS
};