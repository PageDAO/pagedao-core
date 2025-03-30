import { ethers } from 'ethers';
import { BaseContentTracker } from '../baseContentTracker';
import { 
  ContentMetadata, 
  Ownership, 
  ContentRights, 
  CollectionInfo
} from '../../interfaces/content';
import { ReadmeBooksTracker, ReadmeBookCollection } from './ReadmeBooksTracker';
import { ContentTrackerFactory } from '../../services/content/factory';

/**
 * Adapter for Readme Books to standardized content interface
 * Note: This adapter works with the ERC-1155 implementation of Readme Books
 */
export class ReadmeBooksAdapter extends BaseContentTracker {
  private tracker: ReadmeBooksTracker;
  
  constructor(contractAddress: string, chain: string = 'polygon') {
    super(contractAddress, chain, 'readme_book');
    this.tracker = new ReadmeBooksTracker(contractAddress, chain);
  }
  
  /**
   * Transform Readme Books's ERC-1155 data to standard metadata format
   * @param bookData Readme Book collection data
   */
  private transformToMetadata(bookData: ReadmeBookCollection): ContentMetadata {
    return {
      id: `${this.contractAddress}-${bookData.tokenId}`,
      title: bookData.bookMetadata?.title || bookData.name,
      description: bookData.bookMetadata?.description,
      creator: bookData.creator,
      contentURI: bookData.bookMetadata?.contentUri,
      imageURI: bookData.bookMetadata?.coverImageUrl,
      metadataURI: bookData.baseMetadataUri,
      // Use createdAt if available in metadata, otherwise undefined
      createdAt: bookData.bookMetadata?.publicationDate ? 
        new Date(bookData.bookMetadata.publicationDate).getTime() : undefined,
      format: bookData.bookMetadata?.format || 'ebook',
      chain: this.chain,
      contractAddress: this.contractAddress
    };
  }
  
  async fetchMetadata(tokenId: string): Promise<ContentMetadata> {
    try {
      const cacheKey = `metadata-${tokenId}`;
      
      return this.withCache(cacheKey, async () => {
        // Get book collection data for this token ID
        const bookData = await this.tracker.fetchBookData(tokenId);
        
        // Transform to standard format
        return this.transformToMetadata(bookData);
      });
    } catch (error) {
      throw this.handleError('fetchMetadata', error);
    }
  }
  
  async fetchOwnership(tokenId: string): Promise<Ownership> {
    try {
      // Since ERC-1155 tokens can have multiple owners,
      // we handle this differently than ERC-721
      // For now, we'll just return the contract creator as the owner
      // In a real implementation, we'd need additional context like user address
      
      const cacheKey = `ownership-${tokenId}`;
      
      return this.withCache(cacheKey, async () => {
        const bookData = await this.tracker.fetchBookData(tokenId);
        
        return {
          owner: bookData.creator, // Using the creator as a default owner
          tokenId,
          // No timestamp information in this contract
          acquiredAt: undefined
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
        // Get book collection data
        const bookData = await this.tracker.fetchBookData(tokenId);
        
        // ERC-1155 tokens typically don't have royalty info in the standard,
        // but they might have it in the metadata or contract extensions
        // For now, we'll use default values
        return {
          transferable: true, // ERC-1155 tokens are transferable
          commercial: false,  // Default assumption - no commercial rights
          royaltyBps: 0,      // Unknown royalty percentage
          royaltyRecipient: bookData.creator // Default to creator
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
        // Get all token IDs first
        const tokenIds = await this.getAllTokens(options);
        
        // Then check which ones are owned by this address
        const copies = await this.tracker.getCopiesByOwner(ownerAddress, tokenIds);
        
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
        // For ERC-1155, we'll get info about token ID 1 as a representative
        const bookData = await this.tracker.fetchBookData("1");
        
        return {
          name: bookData.name,
          symbol: bookData.symbol,
          description: bookData.bookMetadata?.description || '',
          contractAddress: this.contractAddress,
          chain: this.chain,
          totalSupply: bookData.totalSupply,
          maxSupply: bookData.maxSupply,
          creator: bookData.creator,
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
      const maxTokensToCheck = options?.maxTokensToCheck || 100;
      
      return this.withCache(cacheKey, async () => {
        return this.tracker.getAllTokenIds(maxTokensToCheck);
      });
    } catch (error) {
      throw this.handleError('getAllTokens', error);
    }
  }
  
  subscribeToTransfers(callback: (from: string, to: string, tokenId: string) => void): () => void {
    try {
      // Wrapper to adapt the ERC-1155 callback format to our interface
      const adaptedCallback = (from: string, to: string, tokenId: string, amount: number) => {
        // Only notify about non-zero transfers
        if (amount > 0) {
          callback(from, to, tokenId);
        }
      };
      
      return this.tracker.subscribeToTransfers(adaptedCallback);
    } catch (error) {
      throw this.handleError('subscribeToTransfers', error);
    }
  }
}

// Register this implementation with the factory
ContentTrackerFactory.getInstance().registerImplementation('readme_book', ReadmeBooksAdapter);
ContentTrackerFactory.getInstance().registerImplementation('polygon_book', ReadmeBooksAdapter); // Register as alternative type