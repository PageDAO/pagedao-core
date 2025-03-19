// packages/core/src/providers/index.ts
import * as ethers from 'ethers';
import { getChainRPC } from '../config';

// Simple logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[PROVIDER:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[PROVIDER:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[PROVIDER:ERROR] ${message}`, data ? data : '');
  }
};

// Provider cache to avoid creating multiple instances
const providerCache: Record<string, ethers.providers.JsonRpcProvider

> = {};

/**
 * Get a provider for the specified chain with fallback to backup RPC
 * @param chain - Chain identifier (ethereum, optimism, base)
 * @returns JsonRpcProvider instance
 */
export async function getProvider(chain: string): Promise<ethers.providers.JsonRpcProvider

> {
  // Check if we have a cached provider
  if (providerCache[chain]) {
    logger.info(`Using cached provider for ${chain}`);
    return providerCache[chain];
  }
  
  const rpcConfig = getChainRPC(chain);
  const primaryRpcUrl = rpcConfig.primary;
  const backupRpcUrl = rpcConfig.backup;
  
  if (!primaryRpcUrl) {
    throw new Error(`No primary RPC URL configured for chain: ${chain}`);
  }
  
  try {
    logger.info(`Creating new provider for ${chain} using primary RPC`);
    const provider = new ethers.providers.JsonRpcProvider

    (primaryRpcUrl);
    
    // Test the provider with a simple call
    await provider.getBlockNumber();
    
    // Cache the provider
    providerCache[chain] = provider;
    return provider;
  } catch (error) {
    logger.warn(`Primary RPC failed for ${chain}, trying backup`, error);
    
    if (!backupRpcUrl) {
      logger.error(`No backup RPC configured for ${chain} and primary failed`);
      throw error;
    }
    
    try {
      logger.info(`Creating new provider for ${chain} using backup RPC`);
      const backupProvider = new ethers.providers.JsonRpcProvider

      (backupRpcUrl);
      
      // Test the backup provider
      await backupProvider.getBlockNumber();
      
      // Cache the backup provider
      providerCache[chain] = backupProvider;
      return backupProvider;
    } catch (backupError) {
      logger.error(`Both primary and backup RPC failed for ${chain}`, backupError);
      throw new Error(`Failed to connect to ${chain}: Both primary and backup RPC endpoints failed`);
    }
  }
}

/**
 * Clear the provider cache for a specific chain or all chains
 * @param chain - Optional chain to clear, if not provided clears all
 */
export function clearProviderCache(chain?: string): void {
  if (chain) {
    if (providerCache[chain]) {
      delete providerCache[chain];
      logger.info(`Cleared provider cache for ${chain}`);
    }
  } else {
    Object.keys(providerCache).forEach(key => delete providerCache[key]);
    logger.info('Cleared all provider caches');
  }
}

/**
 * Get a provider with retry logic for more resilient operations
 * @param chain - Chain identifier
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelay - Initial delay in ms before first retry (default: 1000)
 * @returns JsonRpcProvider instance
 */
export async function getProviderWithRetry(
  chain: string,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<ethers.providers.JsonRpcProvider

> {
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await getProvider(chain);
    } catch (error) {
      if (retries >= maxRetries) {
        logger.error(`Failed to get provider for ${chain} after ${maxRetries} retries`);
        throw error;
      }
      
      retries++;
      logger.warn(`Retry ${retries}/${maxRetries} for ${chain} provider in ${delay}ms`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay *= 2;
      
      // Clear the cache for this chain before retrying
      clearProviderCache(chain);
    }
  }
}
