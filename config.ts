// config.ts
import { z } from 'zod'; // For runtime validation

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

// Define supported chains
export type ChainId = 'ethereum' | 'optimism' | 'base' | 'osmosis';

// Define schema and types for RPC configuration
const RPCConfigSchema = z.object({
  primary: z.string().url(),
  backup: z.string().url(),
  chainId: z.number().int().positive()
});

type RPCConfig = z.infer<typeof RPCConfigSchema>;

// Define schema and types for token configuration
const TokenConfigSchema = z.object({
  address: z.string(),
  decimals: z.number().int().min(0).max(18),
  symbol: z.string()
});

type TokenConfig = z.infer<typeof TokenConfigSchema>;

// Define the overall config type
interface Config {
  version: string;
  rpc: Record<ChainId, RPCConfig>;
  tokens: {
    PAGE: Record<ChainId, TokenConfig>;
  };
  api: {
    baseUrl: string;
    endpoints: {
      prices: string;
      tvl: string;
    };
  };
  ui: {
    refreshInterval: number;
    defaultTimeframe: string;
  };
}

// Log environment detection
const environment = process.env.NODE_ENV || 'development';
logger.info(`Loading configuration for environment: ${environment}`);

// Helper function to get RPC URL with fallback and logging
const getRpcUrl = (envVar: string, defaultUrl: string, description: string): string => {
  const url = process.env[envVar] || defaultUrl;
  if (!process.env[envVar]) {
    logger.warn(`Using default ${description}: ${defaultUrl}`);
  } else {
    logger.info(`Using configured ${description} from environment`);
  }
  return url;
};

// Configuration with environment variable integration and logging
const config: Config = {
  version: '1.0.0',
  
  rpc: {
    ethereum: {
      primary: getRpcUrl('ETH_RPC_URL', 'https://eth.drpc.org', 'Ethereum RPC URL'),
      backup: getRpcUrl('ETH_BACKUP_RPC_URL', 'https://eth.llamarpc.com', 'Ethereum backup RPC URL'),
      chainId: 1,
    },
    optimism: {
      primary: getRpcUrl('OPTIMISM_RPC_URL', 'https://optimism.drpc.org', 'Optimism RPC URL'),
      backup: getRpcUrl('OPTIMISM_BACKUP_RPC_URL', 'https://optimism.llamarpc.com', 'Optimism backup RPC URL'),
      chainId: 10,
    },
    base: {
      primary: getRpcUrl('BASE_RPC_URL', 'https://base.drpc.org', 'Base RPC URL'),
      backup: getRpcUrl('BASE_BACKUP_RPC_URL', 'https://base.llamarpc.com', 'Base backup RPC URL'),
      chainId: 8453,
    },
    osmosis: {
      primary: getRpcUrl('OSMOSIS_RPC_URL', 'https://lcd-osmosis.keplr.app', 'Osmosis RPC URL'),
      backup: getRpcUrl('OSMOSIS_BACKUP_RPC_URL', 'https://api-osmosis.imperator.co', 'Osmosis backup RPC URL'),
      chainId: 1, // Osmosis mainnet
    },
  },
  
  tokens: {
    PAGE: {
      ethereum: {
        address: process.env.PAGE_ETH_ADDRESS || '0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e',
        decimals: 18,
        symbol: 'PAGE'
      },
      optimism: {
        address: process.env.PAGE_OPTIMISM_ADDRESS || '0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e',
        decimals: 18,
        symbol: 'PAGE'
      },
      base: {
        address: process.env.PAGE_BASE_ADDRESS || '0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e',
        decimals: 18,
        symbol: 'PAGE'
      },
      osmosis: {
        address: process.env.PAGE_OSMOSIS_ADDRESS || 'osmosis1abc...', // Replace with actual default
        decimals: 6,
        symbol: 'PAGE'
      }
    }
  },
  
  api: {
    baseUrl: process.env.API_BASE_URL || '/api',
    endpoints: {
      prices: '/v1/token/price',
      tvl: '/v1/liquidity/tvl'
    }
  },
  
  ui: {
    refreshInterval: parseInt(process.env.REFRESH_INTERVAL || '60000'), // Default to 1 minute
    defaultTimeframe: process.env.DEFAULT_TIMEFRAME || '7d'
  }
};

// Validate configuration with detailed logging
export function validateConfig(): boolean {
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

// Type-safe helper functions
export function getChainRPC(chain: ChainId): RPCConfig {
  const rpcConfig = config.rpc[chain];
  if (!rpcConfig) {
    logger.error(`No RPC configuration found for chain: ${chain}`);
    throw new Error(`No RPC configuration found for chain: ${chain}`);
  }
  return rpcConfig;
}

export function getTokenConfig(chain: ChainId): TokenConfig {
  const tokenConfig = config.tokens.PAGE[chain];
  if (!tokenConfig) {
    logger.error(`No PAGE token configuration found for chain: ${chain}`);
    throw new Error(`No PAGE token configuration found for chain: ${chain}`);
  }
  return tokenConfig;
}

// Log when configuration is imported
logger.info(`Configuration module loaded (version ${config.version})`);

// Export the config and helper functions
export default config;
