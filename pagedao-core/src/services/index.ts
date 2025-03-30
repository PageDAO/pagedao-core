// src/services/index.ts
import { ContentTrackerFactory } from '../services/content/factory';

// Export interfaces and base classes
export * from '../interfaces/content';
export * from './content/baseContentTracker';
export * from './content/factory';

// Export adapters
export * from './nft/alexandriaLabs/AlexandriaBookAdapter';
export * from './nft/mirror/mirrorPublicationAdapter';
export * from './nft/zora/zoraNftAdapter';
export * from './nft/readmeBooks/ReadmeBooksAdapter';

/**
 * Initialize all content adapters
 * This ensures all adapters are registered with the factory
 * Designed to work reliably in serverless environments
 * @returns Array of registered types after initialization
 */
export function initializeContentAdapters(): string[] {
  // Get factory instance
  const factory = ContentTrackerFactory.getInstance();
  
  // Check if already initialized by checking for registered types
  const registeredTypes = factory.getRegisteredTypes();
  if (registeredTypes.length > 0) {
    console.log('Content adapters already initialized:', registeredTypes);
    return registeredTypes;
  }
  
  console.log('Initializing content adapters...');
  
  // Explicitly register all adapters with try/catch blocks for each
  try {
    // Register Alexandria Book adapter
    try {
      const { AlexandriaBookAdapter } = require('./alexandriaLabs/AlexandriaBookAdapter');
      factory.registerImplementation('book', AlexandriaBookAdapter);
      factory.registerImplementation('alexandria_book', AlexandriaBookAdapter);
      console.log('Registered Alexandria Book adapter');
    } catch (error) {
      console.error('Error registering Alexandria Book adapter:', error);
    }
    
    // Register Mirror Publication adapter
    try {
      const { MirrorPublicationAdapter } = require('./mirror/mirrorPublicationAdapter');
      factory.registerImplementation('publication', MirrorPublicationAdapter);
      factory.registerImplementation('mirror_publication', MirrorPublicationAdapter);
      console.log('Registered Mirror Publication adapter');
    } catch (error) {
      console.error('Error registering Mirror Publication adapter:', error);
    }
    
    // Register Zora NFT adapter
    try {
      const { ZoraNftAdapter } = require('./zora/zoraNftAdapter');
      factory.registerImplementation('nft', ZoraNftAdapter);
      factory.registerImplementation('zora_nft', ZoraNftAdapter);
      console.log('Registered Zora NFT adapter');
    } catch (error) {
      console.error('Error registering Zora NFT adapter:', error);
    }
    
    // Register Readme Books adapter
    try {
      const { ReadmeBooksAdapter } = require('./readmeBooks/ReadmeBooksAdapter');
      factory.registerImplementation('readme_book', ReadmeBooksAdapter);
      factory.registerImplementation('polygon_book', ReadmeBooksAdapter);
      console.log('Registered Readme Books adapter');
    } catch (error) {
      console.error('Error registering Readme Books adapter:', error);
    }
    
    console.log('Content adapters successfully initialized');
  } catch (error) {
    console.error('Error initializing content adapters:', error);
  }
  
  // Return final list of registered types
  const finalRegisteredTypes = factory.getRegisteredTypes();
  console.log('Registered types after initialization:', finalRegisteredTypes);
  return finalRegisteredTypes;
}