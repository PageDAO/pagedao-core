// src/services/content/index.ts

// Export all content-related interfaces
export * from '../../interfaces/content';

// Export base tracker
export * from '../baseContentTracker';

// Export factory
export * from '../factory/contentTrackerFactory';

// Export adapters
export * from '../alexandriaLabs/alexandriaBookAdapter';
export * from '../mirror/mirrorPublicationAdapter';
export * from '../zora/zoraNftAdapter';

// Export utilities
export * from './examples/contentMetadataExample';

/**
 * Initialize all content adapters
 * This ensures all adapters are registered with the factory
 */
export function initializeContentAdapters(): void {
  // Import all adapter files to ensure they're registered
  // The imports above handle this, but this function provides a clear way
  // to ensure initialization happens at the appropriate time
  
  console.log('Content adapters initialized');
}