// packages/core/src/index.ts

// Export configuration
export { default as config, validateConfig, getChainRPC, getTokenConfig, getSupportedChains } from './config';

// Export provider utilities
export { getProvider, getProviderWithRetry, clearProviderCache } from './providers';

// Export ABIs
export { UNISWAP_V2_PAIR_ABI, UNISWAP_V3_POOL_ABI } from './abis';

// Export pricing utilities
export { fetchPagePrices, calculateWeightedPrice } from './pricing/tokenPrices';

// Export types
export * from './types';

// Version information
export const VERSION = '0.1.0';
