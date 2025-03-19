// pagedao-hub/packages/core/src/constants.ts

/**
 * Token decimal constants for proper value formatting
 * These match the on-chain token configurations
 */
export const TOKEN_DECIMALS = {
    // PAGE token decimals across chains
    PAGE: 8,                // PAGE token has 8 decimals on all chains
    
    // Native tokens
    ETH: 18,                // Ethereum
    WETH: 18,               // Wrapped Ethereum
    OSMO: 6,                // Osmosis
    
    // Stablecoins
    USDC: 6,                // USD Coin
    USDT: 6,                // Tether
    DAI: 18,                // Dai
    
    // Other common tokens
    WBTC: 8,                // Wrapped Bitcoin
    LINK: 18,               // Chainlink
    UNI: 18,                // Uniswap
    AAVE: 18,               // Aave
    
    // Chain-specific tokens
    OP: 18,                 // Optimism
    ARB: 18                 // Arbitrum
  };
  
  /**
   * Chain IDs for supported networks
   */
  export const CHAIN_IDS = {
    ETHEREUM: 1,           // Ethereum Mainnet
    OPTIMISM: 10,          // Optimism Mainnet
    BASE: 8453,            // Base Mainnet
    OSMOSIS: 'osmosis-1'   // Osmosis Mainnet
  };
  
  /**
   * Pool type constants
   */
  export const POOL_TYPES = {
    V2: 'v2',              // Uniswap V2 style pools
    V3: 'v3',              // Uniswap V3 style pools
    OSMOSIS: 'osmosis'     // Osmosis pools
  };
  
  /**
   * Default cache durations in milliseconds
   */
  export const CACHE_DURATIONS = {
    PRICE: 60 * 1000,          // 1 minute for price data
    TVL: 5 * 60 * 1000,        // 5 minutes for TVL data
    POOL: 5 * 60 * 1000,       // 5 minutes for pool data
    GOVERNANCE: 5 * 60 * 1000, // 5 minutes for governance data
    HISTORICAL: 60 * 60 * 1000 // 1 hour for historical data
  };
  
  /**
   * API response status codes
   */
  export const STATUS_CODES = {
    SUCCESS: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500
  };
  
  /**
   * Default configuration values
   */
  export const DEFAULTS = {
    REFRESH_INTERVAL: 60 * 1000,  // 1 minute default refresh
    TIMEFRAME: '24h',             // Default timeframe for charts
    THEME: 'dark',                // Default theme
    RETRY_COUNT: 2,               // Default API retry count
    RETRY_DELAY: 1000             // Default API retry delay in ms
  };