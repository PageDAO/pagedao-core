import { ethers } from 'ethers';
import { RPC_URLS, BACKUP_RPC_URLS } from '../../utils/config';

// Type for RPC URLs
export interface RpcUrls {
  [chain: string]: string;
}

// Type for provider errors
export interface ProviderError {
  url: string;
  error: string;
}

/**
 * Class for managing blockchain providers with fallback capabilities
 */
export class ProviderManager {
  private combinedRpcUrls: { [chain: string]: string[] };
  private providers: { [chain: string]: ethers.providers.JsonRpcProvider };

  constructor(rpcUrls: RpcUrls = RPC_URLS, backupRpcUrls: RpcUrls = BACKUP_RPC_URLS) {
    this.combinedRpcUrls = {};
    this.providers = {};
    
    // Combine primary and backup RPC URLs
    Object.keys(rpcUrls).forEach(chain => {
      this.combinedRpcUrls[chain] = [rpcUrls[chain]];
      if (backupRpcUrls && backupRpcUrls[chain]) {
        this.combinedRpcUrls[chain].push(backupRpcUrls[chain]);
      }
    });
  }

  /**
   * Get a provider for the specified chain with fallback capability
   * @param chain - Chain name (ethereum, optimism, base)
   * @returns Working provider
   */
  async getProvider(chain: string): Promise<ethers.providers.JsonRpcProvider> {
    // Return cached provider if available
    if (this.providers[chain]) {
      return this.providers[chain];
    }
    
    if (!this.combinedRpcUrls[chain] || this.combinedRpcUrls[chain].length === 0) {
      throw new Error(`No RPC URLs configured for chain: ${chain}`);
    }
    
    // Try each provider in order until one works
    const errors: ProviderError[] = [];
    
    for (const rpcUrl of this.combinedRpcUrls[chain]) {
      try {
        console.log(`Trying RPC for ${chain}: ${rpcUrl}`);
        
        // Create provider with ethers v5 syntax
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        
        // Test the provider with a simple call to verify it's working
        const blockNumber = await provider.getBlockNumber();
        console.log(`Successfully connected to ${rpcUrl}, block #${blockNumber}`);
        
        // Cache the working provider
        this.providers[chain] = provider;
        
        return provider;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`RPC failed for ${rpcUrl}: ${errorMessage}`);
        errors.push({url: rpcUrl, error: errorMessage});
      }
    }
    
    // If we get here, all providers failed
    throw new Error(`All RPC providers failed for ${chain}: ${JSON.stringify(errors)}`);
  }
  
  /**
   * Clear the provider cache
   */
  clearCache(): void {
    this.providers = {};
  }
}

// Create and export a singleton instance
export const providerManager = new ProviderManager();

/**
 * Get a provider for the specified chain (convenience function)
 * @param chain - Chain name (ethereum, optimism, base)
 * @returns Working provider
 */
export async function getProvider(chain: string): Promise<ethers.providers.JsonRpcProvider> {
  return providerManager.getProvider(chain);
}
