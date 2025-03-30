import { ContentTracker } from '../../interfaces/content';

/**
 * Singleton instance that persists across imports
 * This approach ensures state is maintained in serverless environments
 * where module-level variables are reset between cold starts
 */
let factoryInstance: ContentTrackerFactory | null = null;

/**
 * Factory for creating standardized content trackers
 * Designed to work reliably in serverless environments
 */
export class ContentTrackerFactory {
  // Instance properties instead of static properties
  private trackers: Map<string, ContentTracker> = new Map();
  private implementations: Record<string, new (contractAddress: string, chain: string, ...args: any[]) => ContentTracker> = {};
  private initialized: boolean = false;
  private initializationAttempted: boolean = false;
  
  /**
   * Private constructor for singleton pattern
   * Should not be called directly - use getInstance() instead
   */
  private constructor() {
    console.log('ContentTrackerFactory: Creating new instance');
  }
  
  /**
   * Get the singleton instance of ContentTrackerFactory
   * Will create a new instance if one doesn't exist yet
   * @returns The singleton instance
   */
  public static getInstance(): ContentTrackerFactory {
    if (!factoryInstance) {
      factoryInstance = new ContentTrackerFactory();
    }
    return factoryInstance;
  }
  
  /**
   * Register a tracker implementation for a content type
   * @param contentType The type of content ("book", "publication", "nft", etc.)
   * @param implementation The class that implements ContentTracker for this type
   */
  public registerImplementation(
    contentType: string,
    implementation: new (contractAddress: string, chain: string, ...args: any[]) => ContentTracker
  ): void {
    // Check if already registered to avoid duplicates
    if (this.hasImplementation(contentType)) {
      console.log(`ContentTrackerFactory: Implementation for ${contentType} already registered, skipping.`);
      return;
    }
    
    // Validate implementation (basic check - could be enhanced)
    if (!implementation || typeof implementation !== 'function') {
      console.error(`ContentTrackerFactory: Invalid implementation provided for ${contentType}`);
      throw new Error(`Invalid implementation provided for content type: ${contentType}`);
    }
    
    // Register the implementation
    this.implementations[contentType.toLowerCase()] = implementation;
    console.log(`ContentTrackerFactory: Registered implementation for content type: ${contentType}`);
  }
  
  /**
   * Ensure the factory is initialized with all available adapters
   * This is called automatically when needed but can be called explicitly
   * @returns True if initialization was successful or already done
   */
  public ensureInitialized(): boolean {
    // If already initialized, return immediately
    if (this.initialized) {
      return true;
    }
    
    // If initialization was already attempted and failed, don't retry continuously
    if (this.initializationAttempted) {
      console.log('ContentTrackerFactory: Previous initialization attempt failed, not retrying automatically');
      return false;
    }
    
    // Mark that we've attempted initialization
    this.initializationAttempted = true;
    
    console.log('ContentTrackerFactory: No adapters registered, initializing...');
    try {
      // Dynamic import to avoid circular dependencies
      const { initializeContentAdapters } = require('../index');
      const registeredTypes = initializeContentAdapters();
      
      if (registeredTypes && registeredTypes.length > 0) {
        this.initialized = true;
        console.log(`ContentTrackerFactory: Successfully initialized with types: ${registeredTypes.join(', ')}`);
        return true;
      } else {
        console.error('ContentTrackerFactory: Initialization returned no registered types');
        return false;
      }
    } catch (error) {
      console.error('ContentTrackerFactory: Failed to auto-initialize adapters:', error);
      return false;
    }
  }
  
  /**
   * Force reinitialization of the factory
   * Useful in case of previous initialization failures
   */
  public reinitialize(): boolean {
    this.initializationAttempted = false;
    return this.ensureInitialized();
  }
  
  /**
   * Get a content tracker for a specific contract
   * @param contractAddress The contract address
   * @param contentType The type of content ("book", "publication", "nft", etc.)
   * @param chain The blockchain chain
   * @param options Additional options for specific tracker types
   * @returns A standardized content tracker interface
   */
  public getTracker(
    contractAddress: string, 
    contentType: string,
    chain: string = 'ethereum',
    options: any = {}
  ): ContentTracker {
    // Ensure we're initialized before proceeding
    this.ensureInitialized();
    
    const normalizedType = contentType.toLowerCase();
    const key = `${chain}:${contractAddress.toLowerCase()}:${normalizedType}`;
    
    // Return cached instance if available
    if (this.trackers.has(key)) {
      return this.trackers.get(key)!;
    }
    
    // Check if we have a registered implementation for this content type
    const Implementation = this.implementations[normalizedType];
    
    if (!Implementation) {
      // Gather available types for more helpful error message
      const registeredTypes = this.getRegisteredTypes();
      const availableTypes = registeredTypes.length > 0 
        ? `Available types: ${registeredTypes.join(', ')}`
        : 'No types are currently registered';
      
      // Try to suggest similar types
      const similarTypes = this.findSimilarContentTypes(normalizedType);
      const suggestions = similarTypes.length > 0
        ? `Did you mean: ${similarTypes.join(', ')}?`
        : '';
      
      // Throw detailed error
      throw new Error(
        `No implementation registered for content type: ${contentType}. ` +
        `${availableTypes}. ` +
        `${suggestions} ` +
        `If you expected this type to be available, ensure initializeContentAdapters() has been called.`
      );
    }
    
    // Create a new instance with the appropriate implementation
    try {
      const tracker = new Implementation(contractAddress, chain, options);
      
      // Cache the tracker instance
      this.trackers.set(key, tracker);
      
      return tracker;
    } catch (error) {
      throw new Error(
        `Failed to create tracker for ${contentType} at ${contractAddress} on ${chain}: ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Find content types similar to the provided one
   * Useful for suggesting alternatives when a type isn't found
   * @param contentType The content type to find similar matches for
   * @returns Array of similar registered content types
   */
  private findSimilarContentTypes(contentType: string): string[] {
    const registeredTypes = this.getRegisteredTypes();
    
    // Simple similarity check based on substring
    return registeredTypes.filter(type => 
      type.includes(contentType) || contentType.includes(type)
    );
  }
  
  /**
   * Check if an implementation is registered for a content type
   * @param contentType The content type to check
   * @returns Whether an implementation is registered
   */
  public hasImplementation(contentType: string): boolean {
    return !!this.implementations[contentType.toLowerCase()];
  }
  
  /**
   * Get all registered content types
   * @returns Array of registered content types
   */
  public getRegisteredTypes(): string[] {
    return Object.keys(this.implementations);
  }
  
  /**
   * Get detailed information about the factory's current state
   * Useful for debugging and diagnostics
   */
  public getRegistrationStatus(): Record<string, any> {
    return {
      initialized: this.initialized,
      initializationAttempted: this.initializationAttempted,
      registeredTypes: this.getRegisteredTypes(),
      trackersCount: this.trackers.size,
      trackerKeys: Array.from(this.trackers.keys()),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Verify that all required adapters are registered
   * @param requiredTypes Array of content types that must be registered
   * @returns Object with verification results
   */
  public verifyRegistrations(requiredTypes: string[] = []): { 
    success: boolean; 
    registered: string[]; 
    missing: string[];
    message: string;
  } {
    const registeredTypes = this.getRegisteredTypes();
    
    // If no specific types are required, just return current status
    if (requiredTypes.length === 0) {
      return {
        success: registeredTypes.length > 0,
        registered: registeredTypes,
        missing: [],
        message: registeredTypes.length > 0 
          ? `${registeredTypes.length} content types registered: ${registeredTypes.join(', ')}`
          : 'No content types registered'
      };
    }
    
    // Check if all required types are registered
    const normalizedRequired = requiredTypes.map(t => t.toLowerCase());
    const normalizedRegistered = registeredTypes.map(t => t.toLowerCase());
    
    const missing = normalizedRequired.filter(
      type => !normalizedRegistered.includes(type)
    );
    
    const success = missing.length === 0;
    
    return {
      success,
      registered: registeredTypes,
      missing,
      message: success
        ? `All required content types are registered: ${registeredTypes.join(', ')}`
        : `Missing required content types: ${missing.join(', ')}`
    };
  }
  
  /**
   * Clear the tracker cache
   * Useful in testing scenarios
   */
  public clearCache(): void {
    this.trackers.clear();
  }
  
  /**
   * Get direct access to implementations map
   * For internal use and testing
   */
  public getImplementations(): Record<string, new (contractAddress: string, chain: string, ...args: any[]) => ContentTracker> {
    return this.implementations;
  }
}

/**
 * Static proxy methods for backward compatibility and easier access
 * These methods delegate to the singleton instance
 */

/**
 * Register a tracker implementation for a content type
 * @param contentType The type of content ("book", "publication", "nft", etc.)
 * @param implementation The class that implements ContentTracker for this type
 */
export function registerImplementation(
  contentType: string,
  implementation: new (contractAddress: string, chain: string, ...args: any[]) => ContentTracker
): void {
  ContentTrackerFactory.getInstance().registerImplementation(contentType, implementation);
}

/**
 * Get a content tracker for a specific contract
 * @param contractAddress The contract address
 * @param contentType The type of content ("book", "publication", "nft", etc.)
 * @param chain The blockchain chain
 * @param options Additional options for specific tracker types
 * @returns A standardized content tracker interface
 */
export function getTracker(
  contractAddress: string, 
  contentType: string,
  chain: string = 'ethereum',
  options: any = {}
): ContentTracker {
  return ContentTrackerFactory.getInstance().getTracker(contractAddress, contentType, chain, options);
}

/**
 * Check if an implementation is registered for a content type
 * @param contentType The content type to check
 * @returns Whether an implementation is registered
 */
export function hasImplementation(contentType: string): boolean {
  return ContentTrackerFactory.getInstance().hasImplementation(contentType);
}

/**
 * Get all registered content types
 * @returns Array of registered content types
 */
export function getRegisteredTypes(): string[] {
  return ContentTrackerFactory.getInstance().getRegisteredTypes();
}

/**
 * Clear the tracker cache
 */
export function clearCache(): void {
  ContentTrackerFactory.getInstance().clearCache();
}

/**
 * Get detailed factory status information
 * Useful for diagnostics
 */
export function getFactoryStatus(): Record<string, any> {
  return ContentTrackerFactory.getInstance().getRegistrationStatus();
}

/**
 * Force reinitialization of the factory
 * Useful in case of previous failures
 */
export function reinitializeFactory(): boolean {
  return ContentTrackerFactory.getInstance().reinitialize();
}

/**
 * Ensure the factory is initialized
 */
export function ensureFactoryInitialized(): boolean {
  return ContentTrackerFactory.getInstance().ensureInitialized();
}

/**
 * Verify that all required adapters are registered
 * @param requiredTypes Array of content types that must be registered
 * @returns Object with verification results
 */
export function verifyRegistrations(requiredTypes: string[] = []): ReturnType<typeof ContentTrackerFactory.prototype.verifyRegistrations> {
  return ContentTrackerFactory.getInstance().verifyRegistrations(requiredTypes);
}