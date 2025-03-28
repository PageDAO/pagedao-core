import { ContentTracker } from '../../interfaces/content';

/**
 * Factory for creating standardized content trackers
 */
export class ContentTrackerFactory {
  // Registry for content trackers to avoid creating duplicates
  private static trackers = new Map<string, ContentTracker>();
  
  // Registry of tracker implementations by content type
  private static implementations: Record<string, new (contractAddress: string, chain: string, ...args: any[]) => ContentTracker> = {};
  
  /**
   * Register a tracker implementation for a content type
   * @param contentType The type of content ("book", "publication", "nft", etc.)
   * @param implementation The class that implements ContentTracker for this type
   */
  static registerImplementation(
    contentType: string,
    implementation: new (contractAddress: string, chain: string, ...args: any[]) => ContentTracker
  ): void {
    this.implementations[contentType.toLowerCase()] = implementation;
  }
  
  /**
   * Get a content tracker for a specific contract
   * @param contractAddress The contract address
   * @param contentType The type of content ("book", "publication", "nft", etc.)
   * @param chain The blockchain chain
   * @param options Additional options for specific tracker types
   * @returns A standardized content tracker interface
   */
  static getTracker(
    contractAddress: string, 
    contentType: string,
    chain: string = 'ethereum',
    options: any = {}
  ): ContentTracker {
    const normalizedType = contentType.toLowerCase();
    const key = `${chain}:${contractAddress.toLowerCase()}:${normalizedType}`;
    
    // Return cached instance if available
    if (this.trackers.has(key)) {
      return this.trackers.get(key)!;
    }
    
    // Check if we have a registered implementation for this content type
    const Implementation = this.implementations[normalizedType];
    
    if (!Implementation) {
      throw new Error(`No implementation registered for content type: ${contentType}`);
    }
    
    // Create a new instance with the appropriate implementation
    const tracker = new Implementation(contractAddress, chain, options);
    
    // Cache the tracker instance
    this.trackers.set(key, tracker);
    
    return tracker;
  }
  
  /**
   * Check if an implementation is registered for a content type
   * @param contentType The content type to check
   * @returns Whether an implementation is registered
   */
  static hasImplementation(contentType: string): boolean {
    return !!this.implementations[contentType.toLowerCase()];
  }
  
  /**
   * Get all registered content types
   * @returns Array of registered content types
   */
  static getRegisteredTypes(): string[] {
    return Object.keys(this.implementations);
  }
  
  /**
   * Clear the tracker cache
   */
  static clearCache(): void {
    this.trackers.clear();
  }
}