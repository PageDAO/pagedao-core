import { ethers } from 'ethers';
import { BaseContentTracker } from '../baseContentTracker';
import {
  ContentMetadata,
  Ownership,
  ContentRights,
  ContentHistoryEntry,
  CollectionInfo
} from '../../interfaces/content';
import { MirrorPublicationTracker, MirrorPublication } from './mirrorPublicationTracker';
import { ContentTrackerFactory } from '../../factory/contentTrackerFactory';

/**
 * Adapter for Mirror Publications to standardized content interface
 */
export class MirrorPublicationAdapter extends BaseContentTracker {
  private tracker: MirrorPublicationTracker;
  
  constructor(contractAddress: string, chain: string, options: any = {}) {
    // Options might contain contentType, or we use default
    const contentType = options?.contentType || 'publication';
    
    // Call super with correct parameter order
    super(contractAddress, chain, contentType);
    
    // Create tracker with chain
    this.tracker = new MirrorPublicationTracker(contractAddress, chain);
    
    console.log(`MirrorPublicationAdapter initialized properly: 
      contractAddress: ${contractAddress}
      chain: ${chain}
      contentType: ${contentType}`);
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
        
        // For token-specific metadata
        let tokenMetadata = null;
        if (tokenId !== '0') {
          try {
            // Instead of using tracker.getTokenMetadata, use direct contract call
            const provider = await this.getProvider();
            const contract = new ethers.Contract(this.contractAddress, [
              "function tokenURI(uint256 tokenId) view returns (string)"
            ], provider);
            
            const tokenURI = await contract.tokenURI(tokenId);
            const uri = tokenURI.startsWith('ipfs://') 
              ? tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/')
              : tokenURI;
              
            const response = await fetch(uri);
            tokenMetadata = await response.json();
          } catch (e) {
            console.error(`Error fetching token metadata: ${e}`);
          }
        }

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
          commercial: false, // Default assumption - no commercial rights
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
      // Implement directly instead of using tracker.isOwnedBy
      const provider = await this.getProvider();
      const contract = new ethers.Contract(this.contractAddress, [
        "function ownerOf(uint256 tokenId) view returns (address)"
      ], provider);
      
      try {
        const owner = await contract.ownerOf(tokenId);
        return owner.toLowerCase() === address.toLowerCase();
      } catch (error) {
        return false;
      }
    } catch (error) {
      throw this.handleError('isOwnedBy', error);
    }
  }

  async getTokensByOwner(ownerAddress: string, options?: any): Promise<string[]> {
    try {
      const cacheKey = `tokens-${ownerAddress}`;
      const maxTokens = options?.maxTokens || 100;
      
      return this.withCache(cacheKey, async () => {
        // Implement directly instead of using tracker.getTokensByOwner
        const tokenOwners = await this.getAllTokensWithOwners(maxTokens);
        return tokenOwners
          .filter(token => token.owner.toLowerCase() === ownerAddress.toLowerCase())
          .map(token => token.tokenId);
      }, { ttl: 60 * 1000 }); // 1 minute cache
    } catch (error) {
      throw this.handleError('getTokensByOwner', error);
    }
  }

  // Helper method to get all tokens and their owners
  private async getAllTokensWithOwners(maxTokens: number = 100): Promise<{ tokenId: string, owner: string }[]> {
    const provider = await this.getProvider();
    const contract = new ethers.Contract(this.contractAddress, [
      "function totalSupply() view returns (uint256)",
      "function ownerOf(uint256 tokenId) view returns (address)"
    ], provider);

    try {
      let totalSupply;
      try {
        totalSupply = await contract.totalSupply();
      } catch (e) {
        console.error('Error fetching total supply:', e);
        return [];
      }

      const tokenCount = Math.min(totalSupply.toNumber(), maxTokens);
      const result: { tokenId: string, owner: string }[] = [];

      // Process in batches to avoid overwhelming the provider
      const batchSize = 10;
      for (let i = 1; i <= tokenCount; i += batchSize) {
        const promises = [];

        for (let j = i; j < i + batchSize && j <= tokenCount; j++) {
          promises.push(
            (async () => {
              try {
                const owner = await contract.ownerOf(j);
                return {
                  tokenId: j.toString(),
                  owner
                };
              } catch (e) {
                return null; // Skip tokens that might have been burned or have errors
              }
            })()
          );
        }

        const owners = await Promise.all(promises);
        owners.filter(Boolean).forEach(owner => {
          if (owner) result.push(owner);
        });
      }

      return result;
    } catch (error) {
      console.error(`Error fetching token owners for ${this.contractAddress}:`, error);
      return [];
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
        const owners = await this.getAllTokensWithOwners(maxTokens);
        return owners.map(owner => owner.tokenId);
      });
    } catch (error) {
      throw this.handleError('getAllTokens', error);
    }
  }

  subscribeToTransfers(callback: (from: string, to: string, tokenId: string) => void): () => void {
    try {
      // Implement directly instead of using tracker.subscribeToNewPurchases
      const provider = this.getProvider();
      
      const setup = async () => {
        const resolvedProvider = await provider;
        const contract = new ethers.Contract(
          this.contractAddress, 
          [
            "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
            "event WritingEditionPurchased(address indexed clone, uint256 indexed editionId, address indexed recipient, uint256 price, string message, uint256 flatFeeAmount)"
          ], 
          resolvedProvider
        );
        
        // Try to listen for Transfer events first
        const transferFilter = contract.filters.Transfer();
        contract.on(transferFilter, (from, to, tokenId) => {
          callback(from, to, tokenId.toString());
        });
        
        // Also try to listen for WritingEditionPurchased events
        try {
          const purchaseFilter = contract.filters.WritingEditionPurchased();
          contract.on(purchaseFilter, (clone, tokenId, recipient, price, message, flatFeeAmount) => {
            callback(ethers.constants.AddressZero, recipient, tokenId.toString());
          });
        } catch (e) {
          // If WritingEditionPurchased doesn't exist, just continue with Transfer events
        }
        
        // Return unsubscribe function
        return () => {
          contract.removeAllListeners(transferFilter);
          // Try to remove WritingEditionPurchased listeners too
          try {
            const purchaseFilter = contract.filters.WritingEditionPurchased();
            contract.removeAllListeners(purchaseFilter);
          } catch (e) {
            // Ignore if not supported
          }
        };
      };
      
      // Setup and return unsubscribe function
      const setupPromise = setup();
      return async () => {
        const unsubscribe = await setupPromise;
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up transfer subscription:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }
}

// Register this implementation with the factory
ContentTrackerFactory.registerImplementation('mirror_publication', MirrorPublicationAdapter);
ContentTrackerFactory.registerImplementation('publication', MirrorPublicationAdapter);

