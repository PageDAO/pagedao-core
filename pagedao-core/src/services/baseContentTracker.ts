import { ethers } from 'ethers';
import { getProvider } from '../../src/services/blockchain/provider';
import { 
  ContentTracker, 
  ContentMetadata, 
  Ownership, 
  ContentRights, 
  ContentHistoryEntry,
  CollectionInfo
} from '../interfaces/content';

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
  data: T;
  expires: number;
}

/**
 * Cache options
 */
interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
}

/**
 * Abstract base class that implements shared functionality for content trackers
 */
export abstract class BaseContentTracker implements ContentTracker {
  protected contractAddress: string;
  protected chain: string;
  protected contentType: string;
  protected provider: ethers.providers.Provider | null = null;
  private cache: Map<string, CacheEntry<any>> = new Map();
  
  // Default cache TTL - 5 minutes
  protected DEFAULT_CACHE_TTL = 5 * 60 * 1000;
  
  constructor(contractAddress: string, chain: string, contentType: string) {
    this.contractAddress = contractAddress;
    this.chain = chain;
    this.contentType = contentType;
  }
  
  /**
   * Get provider for the current chain, initializing if needed
   */
  async getProvider(): Promise<ethers.providers.Provider> {
    if (!this.provider) {
      this.provider = await getProvider(this.chain);
    }
    return this.provider;
  }
  
  /**
   * Get contract instance
   * @param abi The contract ABI
   */
  protected async getContract(abi: any): Promise<ethers.Contract> {
    const provider = await this.getProvider();
    return new ethers.Contract(this.contractAddress, abi, provider);
  }
  
  // Common implementations
  getContractAddress(): string {
    return this.contractAddress;
  }
  
  getChain(): string {
    return this.chain;
  }
  
  getContentType(): string {
    return this.contentType;
  }
  
  /**
   * Cache data with a given key
   * @param key Cache key
   * @param data Data to cache
   * @param options Cache options
   */
  protected setCache<T>(key: string, data: T, options?: CacheOptions): void {
    const ttl = options?.ttl || this.DEFAULT_CACHE_TTL;
    const expires = Date.now() + ttl;
    
    this.cache.set(key, { data, expires });
  }
  
  /**
   * Get cached data if available and not expired
   * @param key Cache key
   * @returns Cached data or null if not found or expired
   */
  protected getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if cache entry is expired
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  /**
   * Clear all cached data or specific key
   * @param key Optional specific cache key to clear
   */
  public clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
  
  /**
   * Get data with caching
   * @param key Cache key
   * @param fetchFn Function to fetch data if not in cache
   * @param options Cache options
   */
  protected async withCache<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cachedData = this.getCache<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }
    
    // Not in cache or expired, fetch fresh data
    try {
      const data = await fetchFn();
      this.setCache(key, data, options);
      return data;
    } catch (error) {
      throw this.handleError('withCache', error);
    }
  }
  
  /**
   * Standardized error handling
   * @param method Method name where error occurred
   * @param error The error object
   */
  protected handleError(method: string, error: any): Error {
    console.error(`Error in ${this.contentType}.${method}: ${error.message}`, error);
    
    // Create standardized error with meaningful message
    const errorMessage = `${this.contentType} tracker error in ${method}: ${error.message}`;
    
    // Return a new error with the standardized message
    return new Error(errorMessage);
  }
  
  // Abstract methods that must be implemented by subclasses
  abstract fetchMetadata(tokenId: string): Promise<ContentMetadata>;
  abstract fetchOwnership(tokenId: string): Promise<Ownership>;
  abstract fetchRights(tokenId: string): Promise<ContentRights>;
  abstract isOwnedBy(tokenId: string, address: string): Promise<boolean>;
  abstract getTokensByOwner(ownerAddress: string, options?: any): Promise<string[]>;
  abstract getCollectionInfo(): Promise<CollectionInfo>;
  abstract getAllTokens(options?: any): Promise<string[]>;
  abstract subscribeToTransfers(callback: (from: string, to: string, tokenId: string) => void): () => void;
}