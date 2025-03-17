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

// Schema definitions as before...

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
  version: '1.0.0',
  
  rpc: {
    ethereum: {
      primary: getRpcUrl('ETH_RPC_URL', 'https://eth.drpc.org', 'Ethereum RPC URL'),
      backup: getRpcUrl('ETH_BACKUP_RPC_URL', 'https://eth.llamarpc.com', 'Ethereum backup RPC URL'),
      chainId: 1,
    },
    // Other chains with similar logging...
  },
  
  // Rest of configuration as before...
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
  const rpcConfig = config.rpc[chain];
  if (!rpcConfig) {
    logger.error(`No RPC configuration found for chain: ${chain}`);
    throw new Error(`No RPC configuration found for chain: ${chain}`);
  }
  return rpcConfig;
}

export function getTokenConfig(chain: string) {
  const tokenConfig = config.tokens.PAGE[chain];
  if (!tokenConfig) {
    logger.error(`No PAGE token configuration found for chain: ${chain}`);
    throw new Error(`No PAGE token configuration found for chain: ${chain}`);
  }
  return tokenConfig;
}

// Export the config and helper functions
export default config;
