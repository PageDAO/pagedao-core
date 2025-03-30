// src/services/readmeBooks/ReadmeBooksTracker.ts

import { ethers } from 'ethers';
import { getProvider } from '../blockchain/provider';
import readmeBooksAbi from '../../utils/ContentABIs/readmeBooks.json';

// Book copy data structure for ERC-1155
export interface ReadmeBookCopy {
  tokenId: string;             // Token ID (the book ID)
  owner: string;               // Owner address
  quantity: number;            // Number of copies owned
  metadataUri?: string;        // URI for token metadata
  lastTransferTimestamp?: number; // When it was last transferred
}

// Book metadata structure
export interface ReadmeBookMetadata {
  name?: string;
  description?: string;
  author?: string;
  image?: string;
  contentUri?: string;
  content_uri?: string;
  format?: string;
  title?: string;
  coverImageUrl?: string;
  publisher?: string;
  language?: string;
  pageCount?: number;
  genre?: string;
  publicationDate?: string;
}

// Book collection data structure
export interface ReadmeBookCollection {
  name: string;                // Collection name
  symbol: string;              // Collection symbol
  contractAddress: string;     // Contract address
  chain: string;               // Chain name
  creator: string;             // Creator address
  baseMetadataUri: string;     // Base URI for token metadata
  
  // Token specific data
  tokenId: string;             // The specific book token ID
  maxSupply: number;           // Maximum supply for this token
  totalSupply: number;         // Total minted for this token
  
  // Metadata about the book itself
  bookMetadata?: ReadmeBookMetadata;
  
  // Optional list of token holders (only populated if fetchOwners is true)
  copies?: ReadmeBookCopy[];
}

/**
 * Service for tracking Readme Books on Polygon
 * Note: This is designed for the OpenSea/ERC-1155 books implementation
 */
export class ReadmeBooksTracker {
  private readonly abi: any;
  private readonly contractAddress: string;
  private readonly chain: string;

  /**
   * Create a new Readme Books tracker
   * @param contractAddress The address of the Readme Books contract
   * @param chain The chain the book is deployed on
   */
  constructor(contractAddress: string, chain: string = 'polygon') {
    this.contractAddress = contractAddress;
    this.chain = chain;
    this.abi = readmeBooksAbi;
  }
  
  /**
   * Fetch book collection data for a specific token ID
   * @param tokenId The token ID to fetch
   * @param fetchOwners Whether to fetch token owners (can be resource-intensive for large collections)
   * @param maxOwners Maximum number of owners to fetch
   */
  async fetchBookData(tokenId: string = "1", fetchOwners: boolean = false, maxOwners: number = 20): Promise<ReadmeBookCollection> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    // Get basic collection data
    const [
      name,
      symbol,
      creator,
      totalSupply,
      maxSupply,
      contractOwner
    ] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.creators(tokenId),
      contract.totalSupply(tokenId),
      contract.maxSupply(tokenId),
      contract.owner()
    ]);
    
    // Get token URI
    const tokenUri = await contract.uri(tokenId);
    
    // Get book metadata from the token URI
    let bookMetadata: ReadmeBookMetadata = {};
    try {
      // Handle IPFS URIs
      const uri = tokenUri.startsWith('ipfs://') 
        ? tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/') 
        : tokenUri;
      
      const response = await fetch(uri);
      bookMetadata = await response.json();
    } catch (error) {
      console.warn(`Error fetching book metadata for token ${tokenId}:`, error);
    }
    
    // Build the base collection data
    const collection: ReadmeBookCollection = {
      name,
      symbol,
      contractAddress: this.contractAddress,
      chain: this.chain,
      creator: creator || contractOwner,
      baseMetadataUri: tokenUri.replace(tokenId, ''),
      tokenId,
      maxSupply: maxSupply.toNumber(),
      totalSupply: totalSupply.toNumber(),
      bookMetadata: {
        title: bookMetadata.name || bookMetadata.title,
        description: bookMetadata.description,
        author: bookMetadata.author,
        coverImageUrl: bookMetadata.image,
        contentUri: bookMetadata.contentUri || bookMetadata.content_uri,
        format: bookMetadata.format,
        publisher: bookMetadata.publisher,
        language: bookMetadata.language,
        pageCount: bookMetadata.pageCount,
        genre: bookMetadata.genre,
        publicationDate: bookMetadata.publicationDate
      }
    };
    
    // If requested, fetch owners of the token
    if (fetchOwners && totalSupply.gt(0)) {
      collection.copies = await this.fetchTokenOwners(tokenId, maxOwners);
    }
    
    return collection;
  }
  
  /**
   * Fetch all owners of a specific token ID
   * @param tokenId The token ID to check
   * @param maxOwners Maximum number of owners to return
   */
  async fetchTokenOwners(tokenId: string, maxOwners: number = 20): Promise<ReadmeBookCopy[]> {
    // This is challenging in ERC-1155 since there's no built-in way to get all token owners
    // For production, we'd want to use an indexer like The Graph or Covalent API
    // For simplicity here, we're just returning a placeholder
    
    return [
      {
        tokenId,
        owner: "0x0000000000000000000000000000000000000000",
        quantity: 1
      }
    ];
  }
  
  /**
   * Get a specific copy of the book by token ID and owner
   * @param tokenId The token ID to fetch
   * @param ownerAddress The owner address to check
   */
  async getCopyById(tokenId: string, ownerAddress?: string): Promise<ReadmeBookCopy | null> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    // If owner is provided, check their balance
    if (ownerAddress) {
      try {
        const balance = await contract.balanceOf(ownerAddress, tokenId);
        if (balance.gt(0)) {
          return {
            tokenId,
            owner: ownerAddress,
            quantity: balance.toNumber(),
            metadataUri: await contract.uri(tokenId)
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching copy data for token ${tokenId} and owner ${ownerAddress}:`, error);
        return null;
      }
    }
    
    // If no owner provided, just check if the token exists by checking total supply
    try {
      const totalSupply = await contract.totalSupply(tokenId);
      if (totalSupply.gt(0)) {
        return {
          tokenId,
          owner: "multiple_owners", // ERC-1155 tokens can have multiple owners
          quantity: totalSupply.toNumber(),
          metadataUri: await contract.uri(tokenId)
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching copy data for token ${tokenId}:`, error);
      return null;
    }
  }
  
  /**
   * Get all tokens owned by a specific address
   * @param ownerAddress The address to check ownership for
   * @param knownTokenIds Optional array of known token IDs to check
   */
  async getCopiesByOwner(ownerAddress: string, knownTokenIds?: string[]): Promise<ReadmeBookCopy[]> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    try {
      // If we have known token IDs, check balance for each
      if (knownTokenIds && knownTokenIds.length > 0) {
        const copies: ReadmeBookCopy[] = [];
        
        // Batch our queries
        const batchSize = 10;
        for (let i = 0; i < knownTokenIds.length; i += batchSize) {
          const end = Math.min(i + batchSize, knownTokenIds.length);
          const batchPromises = [];
          
          for (let j = i; j < end; j++) {
            const tokenId = knownTokenIds[j];
            batchPromises.push(async () => {
              try {
                const balance = await contract.balanceOf(ownerAddress, tokenId);
                if (balance.gt(0)) {
                  return {
                    tokenId,
                    owner: ownerAddress,
                    quantity: balance.toNumber(),
                    metadataUri: await contract.uri(tokenId)
                  };
                }
                return null;
              } catch (error) {
                return null;
              }
            });
          }
          
          // Execute the batch promises
          const batchResults = await Promise.all(batchPromises.map(p => p()));
          copies.push(...batchResults.filter(copy => copy !== null) as ReadmeBookCopy[]);
        }
        
        return copies;
      }
      
      // If no known token IDs, this is challenging. We'd need an indexer in a production app.
      // For simplicity, we're returning a placeholder
      console.warn('Getting all copies by owner without known token IDs is not fully implemented. Consider using an indexer like The Graph.');
      return [];
    } catch (error) {
      console.error(`Error fetching copies for owner ${ownerAddress}:`, error);
      return [];
    }
  }
  
  /**
   * Check if a specific token is owned by an address
   * @param tokenId The token ID to check
   * @param ownerAddress The address to check ownership for
   * @param minQuantity Minimum quantity to consider as owned (default: 1)
   */
  async isOwnedBy(tokenId: string, ownerAddress: string, minQuantity: number = 1): Promise<boolean> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    try {
      const balance = await contract.balanceOf(ownerAddress, tokenId);
      return balance.gte(minQuantity);
    } catch (error) {
      console.error(`Error checking ownership for token ${tokenId}:`, error);
      return false;
    }
  }
  
  /**
   * Get all available token IDs in the collection
   * @param maxTokensToCheck Maximum number of token IDs to check
   */
  async getAllTokenIds(maxTokensToCheck: number = 100): Promise<string[]> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    try {
      // This is challenging since ERC-1155 doesn't have a built-in way to get all token IDs
      // For simplicity, we're checking the first N token IDs
      const tokenIds: string[] = [];
      
      for (let i = 1; i <= maxTokensToCheck; i++) {
        try {
          const totalSupply = await contract.totalSupply(i);
          if (totalSupply.gt(0)) {
            tokenIds.push(i.toString());
          }
        } catch (error) {
          // Skip token IDs that error
        }
      }
      
      return tokenIds;
    } catch (error) {
      console.error('Error getting all token IDs:', error);
      return [];
    }
  }
  
  /**
   * Subscribe to token transfers in real-time
   * @param callback Function to call when a transfer occurs
   * @returns A function to unsubscribe from the events
   */
  subscribeToTransfers(callback: (from: string, to: string, tokenId: string, amount: number) => void): () => void {
    // Make sure to properly handle the async provider
    const providerPromise = getProvider(this.chain);
    
    let contract: ethers.Contract;
    let singleFilter: ethers.EventFilter;
    let batchFilter: ethers.EventFilter;
    let singleListener: (operator: string, from: string, to: string, id: ethers.BigNumber, value: ethers.BigNumber) => void;
    let batchListener: (operator: string, from: string, to: string, ids: ethers.BigNumber[], values: ethers.BigNumber[]) => void;
    
    const setup = async () => {
      const provider = await providerPromise;
      contract = new ethers.Contract(this.contractAddress, this.abi, provider);
      
      // Listen for TransferSingle events
      singleFilter = contract.filters.TransferSingle();
      singleListener = (operator: string, from: string, to: string, id: ethers.BigNumber, value: ethers.BigNumber) => {
        callback(from, to, id.toString(), value.toNumber());
      };
      contract.on(singleFilter, singleListener);
      
      // Listen for TransferBatch events
      batchFilter = contract.filters.TransferBatch();
      batchListener = (operator: string, from: string, to: string, ids: ethers.BigNumber[], values: ethers.BigNumber[]) => {
        // Process each token ID in the batch
        for (let i = 0; i < ids.length; i++) {
          callback(from, to, ids[i].toString(), values[i].toNumber());
        }
      };
      contract.on(batchFilter, batchListener);
    };
    
    // Set up the subscription
    setup().catch(error => {
      console.error("Error setting up transfer subscription:", error);
    });
    
    // Return a function to unsubscribe
    return () => {
      if (contract) {
        if (singleFilter && singleListener) {
          contract.off(singleFilter, singleListener);
        }
        if (batchFilter && batchListener) {
          contract.off(batchFilter, batchListener);
        }
      }
    };
  }
  
  /**
   * Subscribe to new token creation in real-time
   * @param callback Function to call when a new token is created
   * @returns A function to unsubscribe from the events
   */
  subscribeToNewTokens(callback: (tokenId: string, uri: string) => void): () => void {
    // Make sure to properly handle the async provider
    const providerPromise = getProvider(this.chain);
    
    let contract: ethers.Contract;
    let filter: ethers.EventFilter;
    let listener: (uri: string, id: ethers.BigNumber) => void;
    
    const setup = async () => {
      const provider = await providerPromise;
      contract = new ethers.Contract(this.contractAddress, this.abi, provider);
      
      // Listen for URI events
      filter = contract.filters.URI();
      listener = (uri: string, id: ethers.BigNumber) => {
        callback(id.toString(), uri);
      };
      contract.on(filter, listener);
    };
    
    // Set up the subscription
    setup().catch(error => {
      console.error("Error setting up URI subscription:", error);
    });
    
    // Return a function to unsubscribe
    return () => {
      if (contract && filter && listener) {
        contract.off(filter, listener);
      }
    };
  }
}