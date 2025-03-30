import { ethers } from 'ethers';
import { BaseContentTracker } from '../baseContentTracker';
import { 
  ContentMetadata, 
  Ownership, 
  ContentRights, 
  ContentHistoryEntry,
  CollectionInfo
} from '../../interfaces/content';
import { ZoraNftTracker, ZoraNft } from '../../services/zora/zoraNftTracker';
import { ContentTrackerFactory } from '../../services/content/factory';

/**
 * Options for Zora NFT adapter
 */
export interface ZoraNftAdapterOptions {
  standard?: 'ERC721' | 'ERC1155';
}

/**
 * Adapter for Zora NFTs to standardized content interface
 */
export class ZoraNftAdapter extends BaseContentTracker {
  private tracker: ZoraNftTracker;
  private standard: 'ERC721' | 'ERC1155';
  
  constructor(contractAddress: string, chain: string = 'zora', options: ZoraNftAdapterOptions = {}) {
    super(contractAddress, chain, 'zora_nft');
    this.standard = options.standard || 'ERC1155';
    this.tracker = new ZoraNftTracker(contractAddress, this.standard, chain);
  }
  
  /**
   * Transform Zora's NFT data to standard metadata format
   * @param nft Zora NFT data
   */
  private transformToMetadata(nft: ZoraNft): ContentMetadata {
    return {
      id: nft.id,
      title: nft.title || '',
      description: nft.description || '',
      creator: nft.creator,
      contentURI: nft.tokenURI,
      imageURI: nft.imageUrl,
      metadataURI: nft.tokenURI,
      // Zora NFTs don't typically have creation timestamps in the data
      format: 'nft',
      chain: this.chain,
      contractAddress: nft.contractAddress
    };
  }
  
  async fetchMetadata(tokenId: string): Promise<ContentMetadata> {
    try {
      const cacheKey = `metadata-${tokenId}`;
      
      return this.withCache(cacheKey, async () => {
        const nft = await this.tracker.fetchNftData(tokenId);
        return this.transformToMetadata(nft);
      });
    } catch (error) {
      throw this.handleError('fetchMetadata', error);
    }
  }
  
  async fetchOwnership(tokenId: string): Promise<Ownership> {
    try {
      const cacheKey = `ownership-${tokenId}`;
      
      return this.withCache(cacheKey, async () => {
        // For ERC721, we can get the owner directly
        if (this.standard === 'ERC721') {
          // Get owners through the tracker's appropriate method
          const tokenHolders = await this.tracker.getTokenHolders(tokenId);
          // Use the first owner from the list if available
          const owner = tokenHolders.length > 0 ? tokenHolders[0].address : 'Unknown';
          
          return {
            owner,
            tokenId,
            // Zora doesn't provide acquisition timestamps in its standard interface
            acquiredAt: undefined
          };
        }
        
        // For ERC1155, ownership is more complex since multiple addresses can own the same token
        // We would need to provide an address to check against or return the first holder
        // For simplicity, we'll use a placeholder approach here
        return {
          owner: 'ERC1155 tokens can have multiple owners',
          tokenId,
          acquiredAt: undefined
        };
      }, { ttl: 60 * 1000 }); // 1 minute cache for ownership which can change often
    } catch (error) {
      throw this.handleError('fetchOwnership', error);
    }
  }
  
  async fetchRights(tokenId: string): Promise<ContentRights> {
    try {
      const cacheKey = `rights-${tokenId}`;
      
      return this.withCache(cacheKey, async () => {
        // Get NFT data which contains royalty info
        const nft = await this.tracker.fetchNftData(tokenId);
        
        return {
          transferable: true, // Zora NFTs are typically transferable
          commercial: false,  // Default assumption - no commercial rights
          royaltyBps: nft.royaltyInfo?.bps || 0,
          royaltyRecipient: nft.royaltyInfo?.recipient
        };
      });
    } catch (error) {
      throw this.handleError('fetchRights', error);
    }
  }
  
  async isOwnedBy(tokenId: string, address: string): Promise<boolean> {
    try {
      return this.tracker.isHeldBy(tokenId, address);
    } catch (error) {
      throw this.handleError('isOwnedBy', error);
    }
  }
  
  async getTokensByOwner(ownerAddress: string, options?: any): Promise<string[]> {
    try {
      // This is a simplified implementation
      // For a complete implementation, we would need to get all tokens and check each one
      // This could be slow for large collections
      
      // For demonstration, we'll get all tokens and check them
      const allTokens = await this.getAllTokens(options);
      const ownedTokens: string[] = [];
      
      // Check each token to see if it's owned by the address
      for (const tokenId of allTokens) {
        const isOwned = await this.isOwnedBy(tokenId, ownerAddress);
        if (isOwned) {
          ownedTokens.push(tokenId);
        }
      }
      
      return ownedTokens;
    } catch (error) {
      throw this.handleError('getTokensByOwner', error);
    }
  }
  
  async getCollectionInfo(): Promise<CollectionInfo> {
    try {
      const cacheKey = 'collection-info';
      
      return this.withCache(cacheKey, async () => {
        // For Zora, we'll use the first token's info to get collection info
        // This is a simplification - ideally we'd query the contract directly
        const nextTokenId = await this.tracker.getNextTokenId();
        
        // If there are no tokens yet, return minimal info
        if (nextTokenId <= 1) {
          return {
            name: 'Zora Collection',
            symbol: '',
            description: '',
            contractAddress: this.contractAddress,
            chain: this.chain
          };
        }
        
        // Get the first token to extract collection info
        const firstToken = await this.tracker.fetchNftData('1');
        
        return {
          name: firstToken.title || 'Zora Collection',
          symbol: '',
          description: firstToken.description || '',
          contractAddress: this.contractAddress,
          chain: this.chain,
          totalSupply: (nextTokenId - 1),
          creator: firstToken.creator
        };
      });
    } catch (error) {
      throw this.handleError('getCollectionInfo', error);
    }
  }
  
  async getAllTokens(options?: any): Promise<string[]> {
    try {
      const cacheKey = 'all-tokens';
      const fromTokenId = options?.fromTokenId || 1;
      const toTokenId = options?.toTokenId;
      
      return this.withCache(cacheKey, async () => {
        // Get all token IDs from the Zora tracker
        const tokens = await this.tracker.getAllTokens(fromTokenId, toTokenId);
        return tokens.map(token => token.tokenId);
      });
    } catch (error) {
      throw this.handleError('getAllTokens', error);
    }
  }
  
  subscribeToTransfers(callback: (from: string, to: string, tokenId: string) => void): () => void {
    try {
      return this.tracker.subscribeToTransfers((from, to, tokenId, amount) => {
        callback(from, to, tokenId);
      });
    } catch (error) {
      throw this.handleError('subscribeToTransfers', error);
    }
  }
}

// Register this implementation with the factory
ContentTrackerFactory.getInstance().registerImplementation('zora_nft', ZoraNftAdapter);
ContentTrackerFactory.getInstance().registerImplementation('nft', ZoraNftAdapter); // Register as generic 'nft' type too