// packages/core/src/config/index.ts
import { z } from 'zod';

// Simple logging utility that could be replaced with a more robust logger later
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[CONFIG:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[CONFIG:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[CONFIG:ERROR] ${message}`, data ? data : '');
  }
};

// Define schemas for validation
const RPCConfigSchema = z.object({
  primary: z.string().url(),
  backup: z.string().url().optional(),
  chainId: z.union([z.number(), z.string()]),
  websocket: z.string().url().optional(),
});

const PoolConfigSchema = z.discriminatedUnion('type', [
  // V2 Pool Schema
  z.object({
    type: z.literal('v2'),
    address: z.string(),
    tokenIsToken0: z.boolean(),
    dexUrl: z.string().url(),
  }),
  // V3 Pool Schema
  z.object({
    type: z.literal('v3'),
    address: z.string(),
    tokenIsToken0: z.boolean(),
    poolId: z.number(),
    feeTier: z.number(),
    dexUrl: z.string().url(),
    additionalLinks: z.record(z.string(), z.string().url()).optional(),
  }),
  // Osmosis Pool Schema
  z.object({
    type: z.literal('osmosis'),
    id: z.string(),
    dexUrl: z.string().url(),
  }),
]);

const TokenConfigSchema = z.object({
  chainId: z.union([z.number(), z.string()]),
  name: z.string(),
  symbol: z.string(),
  address: z.string().optional(), // Optional for non-EVM chains
  denom: z.string().optional(),   // For Cosmos chains
  decimals: z.number(),
  logoURI: z.string(),
  pool: PoolConfigSchema,
});

// Log environment detection
const environment = process.env.NODE_ENV || 'development';
logger.info(`Loading configuration for environment: ${environment}`);

// Log when using fallbacks
const getRpcUrl = (envVar: string, defaultUrl: string, description: string) => {
  const url = process.env[envVar] || defaultUrl;
  if (!process.env[envVar]) {
    logger.warn(`Using default ${description}: ${defaultUrl}`);
  } else {
    logger.info(`Using configured ${description} from environment`);
  }
  return url;
};

// Configuration with environment variable integration and logging
const config = {
  version: '0.1.0',
  
  rpc: {
    ethereum: {
      primary: getRpcUrl('ETH_RPC_URL', 'https://eth.drpc.org', 'Ethereum RPC URL'),
      backup: getRpcUrl('ETH_BACKUP_RPC_URL', 'https://eth.llamarpc.com', 'Ethereum backup RPC URL'),
      chainId: 1,
    },
    optimism: {
      primary: getRpcUrl('OPTIMISM_RPC_URL', 'https://mainnet.optimism.io', 'Optimism RPC URL'),
      backup: getRpcUrl('OPTIMISM_BACKUP_RPC_URL', 'https://optimism.llamarpc.com', 'Optimism backup RPC URL'),
      chainId: 10,
    },
    base: {
      primary: getRpcUrl('BASE_RPC_URL', 'https://mainnet.base.org', 'Base RPC URL'),
      backup: getRpcUrl('BASE_BACKUP_RPC_URL', 'https://base.publicnode.com', 'Base backup RPC URL'),
      chainId: 8453,
    },
  },
  
  tokens: {
    PAGE: {
      ethereum: {
        chainId: 1,
        name: 'Page',
        symbol: 'PAGE',
        address: '0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e',
        decimals: 8,
        logoURI: process.env.PAGE_LOGO_URI || '/images/page-token-logo.png',
        pool: {
          type: 'v2' as const,
          address: '0x9a25d21e204f10177738edb0c3345bd88478aaa2',
          tokenIsToken0: true,
          dexUrl: 'https://app.uniswap.org/#/swap?outputCurrency=0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e',
        },
      },
      optimism: {
        chainId: 10,
        name: 'Page',
        symbol: 'PAGE',
        address: '0xe67E77c47a37795c0ea40A038F7ab3d76492e803',
        decimals: 8,
        logoURI: process.env.PAGE_LOGO_URI || '/images/page-token-logo.png',
        pool: {
          type: 'v2' as const,
          address: '0x5421DA31D54640b58355d8D16D78af84D34D2405',
          tokenIsToken0: false,
          dexUrl: 'https://app.uniswap.org/#/swap?outputCurrency=0xe67E77c47a37795c0ea40A038F7ab3d76492e803&chain=optimism',
        },
      },
      base: {
        chainId: 8453,
        name: 'Page',
        symbol: 'PAGE',
        address: '0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE',
        decimals: 8,
        logoURI: process.env.PAGE_LOGO_URI || '/images/page-token-logo.png',
        pool: {
          type: 'v3' as const,
          address: '0xb05113fbB5f2551Dc6f10EF3C4EfFB9C03C0E3E9',
          tokenIsToken0: false,
          poolId: 2376403,
          feeTier: 10000, // 1% fee tier
          dexUrl: 'https://app.uniswap.org/positions/v3/base/2376403',
          additionalLinks: {
            rebase: 'https://www.rebase.finance/0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE',
          },
        },
      },
      osmosis: {
        chainId: 'osmosis-1',
        name: 'Page',
        symbol: 'PAGE',
        denom: 'ibc/23A62409E4AD8133116C249B1FA38EED30E500A115D7B153109462CD82C1CD99',
        decimals: 8,
        logoURI: process.env.PAGE_LOGO_URI || '/images/page-token-logo.png',
        pool: {
          type: 'osmosis' as const,
          id: '1344',
          dexUrl: 'https://app.osmosis.zone/pools/1344',
        },
      },
    },
  },
  
  priceOracles: {
    ethUsd: {
      chain: 'base',
      type: 'uniswapV3',
      address: '0xd0b53D9277642d899DF5C87A3966A349A798F224',
      token0: {
        symbol: 'USDC',
        decimals: 6,
      },
      token1: {
        symbol: 'ETH',
        decimals: 18,
      },
    },
    osmoUsd: {
      chain: 'osmosis',
      type: 'osmosisPool',
      poolId: '678',
      denom: 'ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858',
    },
  },
  
  system: {
    cacheDuration: parseInt(process.env.CACHE_DURATION || '300000'),
    tokenSupply: {
      circulating: 42500000,
      total: 100000000,
    },
    defaultImageUrl: process.env.DEFAULT_IMAGE_URL || 'https://ipfs.io/ipfs/bafkreidxiyur3tvwkcnr22t2ch55mstgmg7bvtr5meu6bmdpoapan6ktwy',
  },
};

// Enhanced validation function with detailed logging
export function validateConfig() {
  logger.info('Starting configuration validation');
  
  try {
    // Validate RPC configs
    logger.info('Validating RPC configurations');
    Object.entries(config.rpc).forEach(([chain, rpcConfig]) => {
      try {
        RPCConfigSchema.parse(rpcConfig);
        logger.info(`✓ RPC configuration for ${chain} is valid`);
      } catch (error) {
        logger.error(`✗ RPC configuration for ${chain} is invalid`, error);
        throw error;
      }
    });
    
    // Validate token configs
    logger.info('Validating token configurations');
    Object.entries(config.tokens.PAGE).forEach(([chain, tokenConfig]) => {
      try {
        TokenConfigSchema.parse(tokenConfig);
        logger.info(`✓ PAGE token configuration for ${chain} is valid`);
      } catch (error) {
        logger.error(`✗ PAGE token configuration for ${chain} is invalid`, error);
        throw error;
      }
    });
    
    logger.info('Configuration validation completed successfully');
    return true;
  } catch (error) {
    logger.error('Configuration validation failed', error);
    return false;
  }
}

// Log when configuration is imported
logger.info(`Configuration module loaded (version ${config.version})`);

// Helper functions with logging for unexpected cases
export function getChainRPC(chain: string) {
  const rpcConfig = config.rpc[chain as keyof typeof config.rpc];
  if (!rpcConfig) {
    logger.error(`No RPC configuration found for chain: ${chain}`);
    throw new Error(`No RPC configuration found for chain: ${chain}`);
  }
  return rpcConfig;
}

export function getTokenConfig(chain: string) {
    const tokenConfig = config.tokens.PAGE[chain as keyof typeof config.tokens.PAGE];
    if (!tokenConfig) {
      logger.error(`No PAGE token configuration found for chain: ${chain}`);
      throw new Error(`No PAGE token configuration found for chain: ${chain}`);
    }
    return tokenConfig;
  }
  
  // Get all supported chains
  export function getSupportedChains(): string[] {
    return Object.keys(config.tokens.PAGE);
  }
  
  // Export the config and helper functions
  export default config;
  
