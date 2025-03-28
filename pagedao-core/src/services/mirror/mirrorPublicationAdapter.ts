import { ethers } from 'ethers';
import { BaseContentTracker } from '../baseContentTracker';
import { 
  ContentMetadata, 
  Ownership, 
  ContentRights, 
  ContentHistoryEntry,
  CollectionInfo
} from '../../interfaces/content';
import { MirrorPublicationTracker, MirrorPublication } from '../../services/mirror/mirrorPublicationTracker';
import { ContentTrackerFactory } from '../../factory/contentTrackerFactory';

/**
 * Adapter for Mirror Publications to standardized content interface
 */
export class MirrorPublicationAdapter extends BaseContentTracker {
  private tracker: MirrorPublicationTracker;
  
  constructor(contractAddress: string, chain: string = 'ethereum') {
    super(contractAddress, chain, 'mirror_publication');
    this.tracker = new MirrorPublicationTracker(contractAddress, chain);
  }
  
  /**
   * Transform Mirror's publication data to standard metadata format
   * @param publication Mirror publication data
   * @param tokenId Optional token ID
   */
  private transformToMetadata(publication: MirrorPublication, tokenId?: string): ContentMetadata {
    return {
      id: tokenId ? `${this.contractAddress}-${tokenId}` : publication.id,
      title: publication.title || '',
      description: publication.description || '',
      creator: publication.owner,
      contentURI: publication.contentURI,
      imageURI: publication.imageURI,
      metadataURI: publication.metadataUri,
      // Mirror publications don't typically have creation timestamps in the data
      format: 'article',
      chain: this.chain,
      contractAddress: this.contractAddress
    };
  }
  
  async fetchMetadata(tokenId: string): Promise<ContentMetadata> {
    try {
      const cacheKey = `metadata-${tokenId}`;
      
      return this.withCache(cacheKey, async () => {
        // Get publication data
        const publication = await this.tracker.fetchPublicationData();
        
        // Get token-specific metadata if available
        const tokenMetadata = await this.tracker.getTokenMetadata(tokenId);
        
        // Combine data for most complete metadata
        const combinedPublication: MirrorPublication = {
          ...publication,
          tokenId,
          title: tokenMetadata?.name || publication.title,
          description: tokenMetadata?.description || publication.description,
          imageURI: tokenMetadata?.image || publication.imageURI
        };
        
        return this.transformToMetadata(combinedPublication, tokenId);
      });
    } catch (error) {
      throw this.handleError('fetchMetadata', error);
    }
  }
  
  async fetchOwnership(tokenId: string): Promise<Ownership> {
    try {
      const cacheKey = `ownership-${tokenId}`;
      
      return this.withCache(cacheKey, async () => {
        const isValidTokenId = await this.isValidTokenId(tokenId);
        if (!isValidTokenId) {
          throw new Error(`Token ID ${tokenId} not found`);
        }
        
        // For Mirror publications, we need to check the owner of this specific token
        const owner = await this.getTokenOwner(tokenId);
        
        return {
          owner,
          tokenId,
          // Mirror doesn't provide acquisition timestamps in its standard interface
          acquiredAt: undefined
        };
      }, { ttl: 60 * 1000 }); // 1 minute cache for ownership which can change often
    } catch (error) {
      throw this.handleError('fetchOwnership', error);
    }
  }
  
  /**
   * Helper method to check if a token ID is valid
   */
  private async isValidTokenId(tokenId: string): Promise<boolean> {
    try {
      const provider = await this.getProvider();
      const contract = new ethers.Contract(this.contractAddress, [
        "function ownerOf(uint256 tokenId) view returns (address)"
      ], provider);
      
      await contract.ownerOf(tokenId);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Helper method to get the owner of a token
   */
  private async getTokenOwner(tokenId: string): Promise<string> {
    const provider = await this.getProvider();
    const contract = new ethers.Contract(this.contractAddress, [
      "function ownerOf(uint256 tokenId) view returns (address)"
    ], provider);
    
    return await contract.ownerOf(tokenId);
  }
  
  async fetchRights(tokenId: string): Promise<ContentRights> {
    try {
      const cacheKey = `rights-${tokenId}`;
      
      return this.withCache(cacheKey, async () => {
        // Get publication data which contains royalty info
        const publication = await this.tracker.fetchPublicationData();
        
        return {
          transferable: true, // Mirror publications are typically transferable NFTs
          commercial: false,  // Default assumption - no commercial rights
          royaltyBps: publication.royaltyInfo?.bps || 0,
          royaltyRecipient: publication.royaltyInfo?.recipient || publication.owner
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
      const maxTokens = options?.maxTokens || 100;
      
      return this.withCache(cacheKey, async () => {
        return this.tracker.getTokensByOwner(ownerAddress, maxTokens);
      }, { ttl: 60 * 1000 }); // 1 minute cache
    } catch (error) {
      throw this.handleError('getTokensByOwner', error);
    }
  }
  
  async getCollectionInfo(): Promise<CollectionInfo> {
    try {
      const cacheKey = 'collection-info';
      
      return this.withCache(cacheKey, async () => {
        const publication = await this.tracker.fetchPublicationData();
        
        return {
          name: publication.title || 'Mirror Publication',
          symbol: '', // Mirror publications may not have symbols
          description: publication.description || '',
          contractAddress: this.contractAddress,
          chain: this.chain,
          totalSupply: publication.totalSupply,
          maxSupply: publication.limit,
          creator: publication.owner,
          imageURI: publication.imageURI
        };
      });
    } catch (error) {
      throw this.handleError('getCollectionInfo', error);
    }
  }
  
  async getAllTokens(options?: any): Promise<string[]> {
    try {
      const cacheKey = 'all-tokens';
      const maxTokens = options?.maxTokens || 100;
      
      return this.withCache(cacheKey, async () => {
        const owners = await this.tracker.getTokenOwners(maxTokens);
        return owners.map(owner => owner.tokenId);
      });
    } catch (error) {
      throw this.handleError('getAllTokens', error);
    }
  }
  
  subscribeToTransfers(callback: (from: string, to: string, tokenId: string) => void): () => void {
    try {
      // Mirror publications have a special event for purchases
      const purchaseCallback = (tokenId: string, recipient: string, price: string) => {
        callback(ethers.constants.AddressZero, recipient, tokenId);
      };
      
      return this.tracker.subscribeToNewPurchases(purchaseCallback);
    } catch (error) {
      throw this.handleError('subscribeToTransfers', error);
    }
  }
}

// Register this implementation with the factory
ContentTrackerFactory.registerImplementation('mirror_publication', MirrorPublicationAdapter);
ContentTrackerFactory.registerImplementation('publication', MirrorPublicationAdapter); // Register as generic 'publication' type too