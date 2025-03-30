// $PAGE-related  
export * from './services/blockchain/provider';
export * from './services/pageToken/priceService';
export * from './services/pageToken/tvlService';
export * from './utils/config';

// Import initialization function
import { initializeContentAdapters } from './services/index';

// NFT Retrieval
// Alexandria Labs
export * from './services/alexandriaLabs/AlexandriaBookTracker';
export * from './services/alexandriaLabs/AlexandriaBookRegistry';

// Mirror
export * from './services/mirror/mirrorPublicationTracker';
export * from './services/mirror/mirrorPublicationRegistry';

// Zora
export * from './services/zora/zoraNftTracker';
export * from './services/zora/zoraNftRegistry';

// Readme Books (Polygon)
export * from './services/readmeBooks/ReadmeBooksTracker';
export * from './services/readmeBooks/ReadmeBooksRegistry';
export * from './services/readmeBooks/ReadmeBooksAdapter';

// Content Interface Layer
export * from './services/content/factory';
export * from './services/content/baseContentTracker';
export * from './interfaces/content';
export * from './services/alexandriaLabs/AlexandriaBookAdapter';
export * from './services/mirror/mirrorPublicationAdapter';
export * from './services/zora/zoraNftAdapter';
export * from './services/readmeBooks/ReadmeBooksAdapter';

// Auto-initialize on import
try {
  const registeredTypes = initializeContentAdapters();
  if (registeredTypes.length > 0) {
    console.log(`Successfully initialized content adapters: ${registeredTypes.join(', ')}`);
  }
} catch (error) {
  console.warn('Failed to initialize adapters on import:', error);
}

// Re-export the initialization function to allow manual initialization
export { initializeContentAdapters };