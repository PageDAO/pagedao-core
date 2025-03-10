const { ethers } = require('ethers');
const { UNISWAP_V2_PAIR_ABI } = require('./abis');

// RPC URLs for different chains
const RPC_URLS = {
  ethereum: 'https://eth-mainnet.g.alchemy.com/v2/demo',
  optimism: 'https://opt-mainnet.g.alchemy.com/v2/demo',
  base: 'https://base-mainnet.g.alchemy.com/v2/demo'
};

/**
 * Get a provider for the specified chain
 */
function getProvider(chain) {
  const rpcUrl = RPC_URLS[chain];
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for chain: ${chain}`);
  }
  return new ethers.JsonRpcProvider(rpcUrl);
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

module.exports = {
  getPoolReserves
};
