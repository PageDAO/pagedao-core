// src/services/index.ts
import { ContentTrackerFactory } from '../factory/contentTrackerFactory';

// Export interfaces and base classes
export * from '../interfaces/content';
export * from './content/baseContentTracker';
export * from '../factory/contentTrackerFactory';

// Export adapters
export * from './alexandriaLabs/AlexandriaBookAdapter';
export * from './mirror/mirrorPublicationAdapter';
export * from './zora/zoraNftAdapter';
export * from './readmeBooks/ReadmeBooksAdapter';

/**
 * Initialize all content adapters
 * This ensures all adapters are registered with the factory
 * @returns Array of registered types after initialization
 */
export function initializeContentAdapters(): string[] {
  // Check if already initialized
  const registeredTypes = ContentTrackerFactory.getRegisteredTypes();
  if (registeredTypes.length > 0) {
    console.log('Content adapters already initialized:', registeredTypes);
    return registeredTypes;
  }
  
  console.log('Initializing content adapters...');
  
  // Explicitly register all adapters
  try {
    // Register Alexandria Book adapter
    try {
      const { AlexandriaBookAdapter } = require('./alexandriaLabs/AlexandriaBookAdapter');
      ContentTrackerFactory.registerImplementation('book', AlexandriaBookAdapter);
      ContentTrackerFactory.registerImplementation('alexandria_book', AlexandriaBookAdapter);
      console.log('Registered Alexandria Book adapter');
    } catch (error) {
      console.error('Error registering Alexandria Book adapter:', error);
    }
    
    // Register Mirror Publication adapter
    try {
      const { MirrorPublicationAdapter } = require('./mirror/mirrorPublicationAdapter');
      ContentTrackerFactory.registerImplementation('publication', MirrorPublicationAdapter);
      ContentTrackerFactory.registerImplementation('mirror_publication', MirrorPublicationAdapter);
      console.log('Registered Mirror Publication adapter');
    } catch (error) {
      console.error('Error registering Mirror Publication adapter:', error);
    }
    
    // Register Zora NFT adapter
    try {
      const { ZoraNftAdapter } = require('./zora/zoraNftAdapter');
      ContentTrackerFactory.registerImplementation('nft', ZoraNftAdapter);
      ContentTrackerFactory.registerImplementation('zora_nft', ZoraNftAdapter);
      console.log('Registered Zora NFT adapter');
    } catch (error) {
      console.error('Error registering Zora NFT adapter:', error);
    }
    
    // Register Readme Books adapter
    try {
      const { ReadmeBooksAdapter } = require('./readmeBooks/ReadmeBooksAdapter');
      ContentTrackerFactory.registerImplementation('readme_book', ReadmeBooksAdapter);
      ContentTrackerFactory.registerImplementation('polygon_book', ReadmeBooksAdapter);
      console.log('Registered Readme Books adapter');
    } catch (error) {
      console.error('Error registering Readme Books adapter:', error);
    }
    
    console.log('Content adapters successfully initialized');
  } catch (error) {
    console.error('Error initializing content adapters:', error);
  }
  
  // Log registered types after initialization
  const finalRegisteredTypes = ContentTrackerFactory.getRegisteredTypes();
  console.log('Registered types:', finalRegisteredTypes);
  return finalRegisteredTypes;
}