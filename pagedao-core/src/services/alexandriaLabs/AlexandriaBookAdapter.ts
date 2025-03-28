import { ethers } from 'ethers';
import { BaseContentTracker } from '../baseContentTracker';
import { 
  ContentMetadata, 
  Ownership, 
  ContentRights, 
  ContentHistoryEntry,
  CollectionInfo
} from '../../interfaces/content';
import { AlexandriaBookTracker, BookCopy, BookCollection } from '../../services/alexandriaLabs/AlexandriaBookTracker';
import { ContentTrackerFactory } from '../../factory/contentTrackerFactory';

/**
 * Adapter for Alexandria Books to standardized content interface
 */
export class AlexandriaBookAdapter extends BaseContentTracker {
  private tracker: AlexandriaBookTracker;
  
  constructor(contractAddress: string, chain: string = 'base') {
    super(contractAddress, chain, 'alexandria_book');
    this.tracker = new AlexandriaBookTracker(contractAddress, chain);
  }
  
  /**
   * Transform AlexandriaBooks's book data to standard metadata format
   * @param bookData Alexandria book collection data
   * @param tokenId Optional token ID
   */
  private transformToMetadata(bookData: BookCollection, tokenId?: string): ContentMetadata {
    return {
      id: tokenId ? `${this.contractAddress}-${tokenId}` : this.contractAddress,
      title: bookData.bookMetadata?.title || bookData.name,
      description: bookData.bookMetadata?.description,
      creator: bookData.bookMetadata?.author,
      contentURI: bookData.bookMetadata?.contentUri,
      imageURI: bookData.bookMetadata?.coverImageUrl,
      metadataURI: bookData.baseTokenUri,
      createdAt: bookData.availableMintDate * 1000, // Convert to milliseconds
      format: bookData.bookMetadata?.format || 'ebook',
      chain: this.chain,
      contractAddress: this.contractAddress
    };
  }
  
  async fetchMetadata(tokenId: string): Promise<ContentMetadata> {
    try {
      const cacheKey = `metadata-${tokenId}`;
      
      return this.withCache(cacheKey, async () => {
        // Get the book copy data
        const bookCopy = await this.tracker.getCopyById(tokenId);
        if (!bookCopy) {
          throw new Error(`Book copy ${tokenId} not found`);
        }
        
        // Get book collection data to fill in more metadata
        const bookData = await this.tracker.fetchBookData();
        
        // Transform to standard format
        const metadata = this.transformToMetadata(bookData, tokenId);
        
        return metadata;
      });
    } catch (error) {
      throw this.handleError('fetchMetadata', error);
    }
  }
  
  async fetchOwnership(tokenId: string): Promise<Ownership> {
    try {
      const cacheKey = `ownership-${tokenId}`;
      
      return this.withCache(cacheKey, async () => {
        const bookCopy = await this.tracker.getCopyById(tokenId);
        if (!bookCopy) {
          throw new Error(`Book copy ${tokenId} not found`);
        }
        
        return {
          owner: bookCopy.owner,
          tokenId,
          acquiredAt: bookCopy.lastTransferTimestamp ? bookCopy.lastTransferTimestamp * 1000 : undefined
        };
      });
    } catch (error) {
      throw this.handleError('fetchOwnership', error);
    }
  }
  
  async fetchRights(tokenId: string): Promise<ContentRights> {
    try {
      const cacheKey = `rights-${tokenId}`;
      
      return this.withCache(cacheKey, async () => {
        // Get book collection data to extract rights info
        const bookData = await this.tracker.fetchBookData();
        
        // Alexandria books don't have explicit rights data in the contract
        // This is a placeholder implementation that makes assumptions
        return {
          transferable: true, // Alexandria books are typically transferable
          commercial: false,  // Default assumption - no commercial rights
          royaltyBps: 0,      // Would need to be extracted from the contract if available
          royaltyRecipient: bookData.publisher
        };
      });
    } catch (error) {
      throw this.handleError('fetchRights', error);
    }
  }
  
  async isOwnedBy(tokenId: string, address: string): Promise<boolean> {
    try {
      return this.tracker.isOwnedBy(tokenId, address);
    } catch (error) {
      throw this.handleError('isOwnedBy', error);
    }
  }
  
  async getTokensByOwner(ownerAddress: string, options?: any): Promise<string[]> {
    try {
      const cacheKey = `tokens-${ownerAddress}`;
      const ttl = 60 * 1000; // 1 minute cache for ownership which can change often
      
      return this.withCache(cacheKey, async () => {
        const copies = await this.tracker.getCopiesByOwner(ownerAddress);
        return copies.map(copy => copy.tokenId);
      }, { ttl });
    } catch (error) {
      throw this.handleError('getTokensByOwner', error);
    }
  }
  
  async getCollectionInfo(): Promise<CollectionInfo> {
    try {
      const cacheKey = 'collection-info';
      
      return this.withCache(cacheKey, async () => {
        const bookData = await this.tracker.fetchBookData();
        
        return {
          name: bookData.name,
          symbol: bookData.symbol,
          description: bookData.bookMetadata?.description || '',
          contractAddress: this.contractAddress,
          chain: this.chain,
          totalSupply: bookData.totalSupply,
          maxSupply: bookData.maxSupply,
          creator: bookData.publisher,
          imageURI: bookData.bookMetadata?.coverImageUrl
        };
      });
    } catch (error) {
      throw this.handleError('getCollectionInfo', error);
    }
  }
  
  async getAllTokens(options?: any): Promise<string[]> {
    try {
      const cacheKey = 'all-tokens';
      const maxCopies = options?.maxCopies || 100;
      
      return this.withCache(cacheKey, async () => {
        const bookData = await this.tracker.fetchBookData(true, maxCopies);
        if (!bookData.copies) return [];
        
        return bookData.copies.map(copy => copy.tokenId);
      });
    } catch (error) {
      throw this.handleError('getAllTokens', error);
    }
  }
  
  subscribeToTransfers(callback: (from: string, to: string, tokenId: string) => void): () => void {
    try {
      const mintCallback = (tokenId: string, to: string) => {
        callback(ethers.constants.AddressZero, to, tokenId);
      };
      
      return this.tracker.subscribeToMints(mintCallback);
    } catch (error) {
      throw this.handleError('subscribeToTransfers', error);
    }
  }
}

// Register this implementation with the factory
ContentTrackerFactory.registerImplementation('alexandria_book', AlexandriaBookAdapter);
ContentTrackerFactory.registerImplementation('book', AlexandriaBookAdapter); // Register as generic 'book' type too