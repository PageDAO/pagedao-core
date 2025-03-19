// pagedao-hub/packages/dashboard/src/config.ts
import { z } from 'zod';

// Simple logging utility
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

// Environment detection
const environment = process.env.NODE_ENV || 'development';
logger.info(`Loading configuration for environment: ${environment}`);

// API configuration schema
const ApiConfigSchema = z.object({
  baseUrl: z.string().url().optional(),
  timeout: z.number().positive().default(30000),
  retryCount: z.number().nonnegative().default(2),
  retryDelay: z.number().positive().default(1000)
});

// Get API base URL with fallback
const getApiBaseUrl = () => {
  const envApiUrl = process.env.REACT_APP_API_BASE_URL || process.env.VITE_API_BASE_URL;
  if (!envApiUrl) {
    logger.warn('API base URL not found in environment, using default');
    
    // Use window.location.origin to create a complete URL
    const baseOrigin = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'http://localhost:3000';
      
    return environment === 'production' 
      ? `${baseOrigin}/api/v1` 
      : 'http://localhost:8888/api/v1';
  }
  return envApiUrl;
};
// Export configuration
export const API_CONFIG = ApiConfigSchema.parse({
  baseUrl: getApiBaseUrl(),
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10),
  retryCount: parseInt(process.env.REACT_APP_API_RETRY_COUNT || '2', 10),
  retryDelay: parseInt(process.env.REACT_APP_API_RETRY_DELAY || '1000', 10)
});

// Chain configuration
export const CHAIN_CONFIG = {
  ethereum: {
    name: 'Ethereum',
    color: '#627EEA',
    icon: 'ethereum.svg'
  },
  optimism: {
    name: 'Optimism',
    color: '#FF0420',
    icon: 'optimism.svg'
  },
  base: {
    name: 'Base',
    color: '#0052FF',
    icon: 'base.svg'
  },
  osmosis: {
    name: 'Osmosis',
    color: '#750BBB',
    icon: 'osmosis.svg'
  }
};

// App configuration
export const APP_CONFIG = {
  version: '0.1.0', // Matches core version
  refreshInterval: parseInt(process.env.REACT_APP_REFRESH_INTERVAL || '60000', 10),
  defaultTheme: (process.env.REACT_APP_DEFAULT_THEME || 'dark') as 'light' | 'dark',
  defaultTimeframe: (process.env.REACT_APP_DEFAULT_TIMEFRAME || '24h') as '24h' | '7d' | '30d' | '90d' | '1y'
};

// Validate configuration
try {
  logger.info('Validating configuration');
  ApiConfigSchema.parse(API_CONFIG);
  logger.info('Configuration validation successful');
} catch (error) {
  logger.error('Configuration validation failed', error);
  throw new Error('Invalid configuration');
}
