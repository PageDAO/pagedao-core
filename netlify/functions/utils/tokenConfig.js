// Public RPC endpoints (no API keys needed)
const RPC_URLS = {
  ethereum: 'https://eth.drpc.org',
  optimism: 'https://mainnet.optimism.io', 
  base: 'https://mainnet.base.org'
};

// Backup RPC endpoints
const BACKUP_RPC_URLS = {
  ethereum: 'https://eth.llamarpc.com',
  optimism: 'https://optimism.llamarpc.com',
  base: 'https://base.publicnode.com'
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 300000;

// JavaScript version of token configuration for Netlify functions
const PAGE_TOKEN_CONFIG = [
  {
    chainId: 1, // mainnet
    address: '0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e',
    decimals: 8,
    symbol: 'PAGE',
    name: 'Page',
    logoURI: '/images/page-token-logo.png',
    lpAddress: '0x9a25d21e204f10177738edb0c3345bd88478aaa2',
    dexUrl: 'https://app.uniswap.org/#/swap?outputCurrency=0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e',
    tokenIsToken0: true,
    poolType: 'v2'
  },
  {
    chainId: 10, // optimism
    address: '0xe67E77c47a37795c0ea40A038F7ab3d76492e803',
    decimals: 8,
    symbol: 'PAGE',
    name: 'Page',
    logoURI: '/images/page-token-logo.png',
    lpAddress: '0x5421DA31D54640b58355d8D16D78af84D34D2405',
    dexUrl: 'https://app.uniswap.org/#/swap?outputCurrency=0xe67E77c47a37795c0ea40A038F7ab3d76492e803&chain=optimism',
    tokenIsToken0: false,
    poolType: 'v2'
  },
  {
    chainId: 8453, // base
    address: '0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE',
    decimals: 8,
    symbol: 'PAGE',
    name: 'Page',
    logoURI: '/images/page-token-logo.png',
    // Update to the v3 pool address for the position
    lpAddress: '0xb05113fbB5f2551Dc6f10EF3C4EfFB9C03C0E3E9',
    dexUrl: 'https://app.uniswap.org/positions/v3/base/2376403',
    tokenIsToken0: false,  // This needs to be verified for the v3 pool
    poolType: 'v3',
    // Added for v3 specifics
    poolId: 2376403,
    // For V3, we need to know the fee tier
    feeTier: 10000 // 1% fee tier
  }
];

// Add ETH/USDC Uniswap pair on Base for ETH price oracle
const ETH_USDC_PAIR = {
  address: '0xd0b53D9277642d899DF5C87A3966A349A798F224', // ETH/USDC pair on Base
  token0IsETH: false, // USDC is token0, ETH is token1
  poolType: 'v3', // Mark this as a V3 pool
  decimals: {
    ETH: 18,
    USDC: 6
  }
};

const COSMOS_PAGE_TOKEN = {
  chainId: 'osmosis-1',
  denom: 'ibc/23A62409E4AD8133116C249B1FA38EED30E500A115D7B153109462CD82C1CD99',
  decimals: 8,
  symbol: 'PAGE',
  name: 'Page',
  logoURI: '/images/page-token-logo.png',
  osmosisPoolId: '1344',
  dexUrl: 'https://app.osmosis.zone/pools/1344',
};

module.exports = {
  PAGE_TOKEN_CONFIG,
  COSMOS_PAGE_TOKEN,
  ETH_USDC_PAIR,
  RPC_URLS,
  BACKUP_RPC_URLS,
  CACHE_DURATION
};
