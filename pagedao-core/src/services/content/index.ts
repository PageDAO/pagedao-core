// Export all content-related interfaces
export * from '../../interfaces/content';

// Export base tracker
export * from './baseContentTracker';

// Export factory
export * from './factory';

// Export adapters
export * from '../nft/alexandriaLabs/AlexandriaBookAdapter';
export * from '../nft/mirror/mirrorPublicationAdapter';
export * from '../nft/zora/zoraNftAdapter';

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