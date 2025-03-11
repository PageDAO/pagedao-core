const { ethers } = require('ethers');
const { UNISWAP_V2_PAIR_ABI } = require('./abis');
const { RPC_URLS, BACKUP_RPC_URLS } = require('./tokenConfig');

/**
 * Get a provider for the specified chain with fallback to backup RPC
 */
function getProvider(chain) {
  const primaryRpcUrl = RPC_URLS[chain];
  const backupRpcUrl = BACKUP_RPC_URLS[chain];
  
  if (!primaryRpcUrl && !backupRpcUrl) {
    throw new Error(`No RPC URL configured for chain: ${chain}`);
  }
  
  try {
    console.log(`Using primary RPC for ${chain}: ${primaryRpcUrl}`);
    return new ethers.JsonRpcProvider(primaryRpcUrl);
  } catch (error) {
    console.warn(`Primary RPC failed for ${chain}, trying backup`);
    if (!backupRpcUrl) {
      throw error;
    }
    return new ethers.JsonRpcProvider(backupRpcUrl);
  }
}

module.exports = {
  getProvider
};