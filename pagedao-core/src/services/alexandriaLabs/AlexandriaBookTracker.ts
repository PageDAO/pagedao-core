// src/services/alexandriaLabs/AlexandriaBookTracker.ts

import { ethers } from 'ethers';
import { getProvider } from '../../services/blockchain/provider';

// Book copy data structure
export interface BookCopy {
  tokenId: string;             // Token ID (the copy number)
  owner: string;               // Current owner address
  metadataUri?: string;        // URI for token metadata
  lastTransferTimestamp?: number; // When it was last transferred
}

// Book metadata structure
export interface BookMetadata {
  name?: string;
  description?: string;
  author?: string;
  image?: string;
  contentUri?: string;
  content_uri?: string;
  format?: string;
  title?: string;
  coverImageUrl?: string;
}

// Book collection data structure
export interface BookCollection {
  name: string;                // Collection/book name
  symbol: string;              // Collection symbol
  contractAddress: string;     // Contract address
  chain: string;               // Chain name
  totalSupply: number;         // Total copies minted
  maxSupply: number;           // Maximum possible supply
  availableMintDate: number;   // When minting becomes available
  price: string;               // Mint price
  walletLimit: number;         // Max copies per wallet
  publisher: string;           // Publisher address
  metadataFrozen: boolean;     // Whether metadata can be changed
  baseTokenUri: string;        // Base URI for token metadata
  
  // Metadata about the book itself
  bookMetadata?: BookMetadata;
  
  // Optional list of token owners (only populated if fetchOwners is true)
  copies?: BookCopy[];
}

/**
 * Service for tracking Alexandria Books
 */
export class AlexandriaBookTracker {
  private readonly abi: any;
  private readonly contractAddress: string;
  private readonly chain: string;

  /**
   * Create a new Alexandria Book tracker
   * @param contractAddress The address of the Alexandria book contract
   * @param chain The chain the book is deployed on
   */
  constructor(contractAddress: string, chain: string = 'base') {
    this.contractAddress = contractAddress;
    this.chain = chain;
    
    // ABI for Alexandria collection contracts
    this.abi = [
      // Collection info functions
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function contractURI() view returns (string)",
      "function baseTokenURI() view returns (string)",
      "function metadataFrozen() view returns (bool)",
      "function totalSupply() view returns (uint256)",
      "function remainingSupply() view returns (uint256)",
      "function availableToMint() view returns (bool)",
      "function publisher() view returns (address)",
      "function owner() view returns (address)",
      
      // Collection parameters
      "function collectionParameters() view returns (uint256 maxSupply, uint256 availableToMintDate, uint256 price, uint256 walletLimit, uint96 secondaryRoyaltyPercentage)",
      
      // Token specific functions
      "function tokenURI(uint256 tokenId) view returns (string)",
      "function ownerOf(uint256 tokenId) view returns (address)",
      "function balanceOf(address owner) view returns (uint256)",
      
      // Events
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
    ];
  }
  
  /**
   * Fetch book collection data
   * @param fetchOwners Whether to fetch token owners (can be resource-intensive for large collections)
   * @param maxCopies Maximum number of copies to fetch owners for
   */
  async fetchBookData(fetchOwners: boolean = false, maxCopies: number = 20): Promise<BookCollection> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    // Get basic collection data
    const [
      name,
      symbol,
      baseTokenUri,
      metadataFrozen,
      totalSupply,
      collectionParams,
      publisherAddress
    ] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.baseTokenURI(),
      contract.metadataFrozen(),
      contract.totalSupply(),
      contract.collectionParameters(),
      contract.publisher()
    ]);
    
    // Get book metadata from the first token or contract URI
    let bookMetadata: BookMetadata = {};
    try {
      if (totalSupply.gt(0)) {
        // Try to get metadata from the first token
        const tokenURI = await contract.tokenURI(1);
        
        // Handle IPFS URIs
        const uri = tokenURI.startsWith('ipfs://') 
          ? tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/') 
          : tokenURI;
        
        const response = await fetch(uri);
        bookMetadata = await response.json();
      }
    } catch (error) {
      console.warn('Error fetching book metadata:', error);
    }
    
    // Build the base collection data
    const collection: BookCollection = {
      name,
      symbol,
      contractAddress: this.contractAddress,
      chain: this.chain,
      totalSupply: totalSupply.toNumber(),
      maxSupply: collectionParams.maxSupply.toNumber(),
      availableMintDate: collectionParams.availableToMintDate.toNumber(),
      price: ethers.utils.formatEther(collectionParams.price),
      walletLimit: collectionParams.walletLimit.toNumber(),
      publisher: publisherAddress,
      metadataFrozen,
      baseTokenUri,
      bookMetadata: {
        title: bookMetadata.name,
        description: bookMetadata.description,
        author: bookMetadata.author,
        coverImageUrl: bookMetadata.image,
        contentUri: bookMetadata.contentUri || bookMetadata.content_uri,
        format: bookMetadata.format
      }
    };
    
    // If requested, fetch owners of each token
    if (fetchOwners) {
      collection.copies = [];
      const totalMinted = totalSupply.toNumber();
      
      // Limit the number of copies to fetch
      const copiesToFetch = Math.min(totalMinted, maxCopies);
      
      // Batch our requests to avoid overloading the provider
      const batchSize = 10;
      for (let i = 0; i < copiesToFetch; i += batchSize) {
        const end = Math.min(i + batchSize, copiesToFetch);
        const batchPromises = [];
        
        for (let tokenId = i + 1; tokenId <= end; tokenId++) {
          batchPromises.push(this.fetchCopyData(contract, tokenId.toString()));
        }
        
        const batchResults = await Promise.all(batchPromises);
        collection.copies.push(...batchResults.filter(copy => copy !== null) as BookCopy[]);
      }
    }
    
    return collection;
  }
  
  /**
   * Fetch data for a specific copy of the book
   * @param contract The ethers contract instance
   * @param tokenId The token ID to fetch
   */
  private async fetchCopyData(contract: ethers.Contract, tokenId: string): Promise<BookCopy | null> {
    try {
      // Get owner and metadata URI
      const [owner, tokenUri] = await Promise.all([
        contract.ownerOf(tokenId),
        contract.tokenURI(tokenId)
      ]);
      
      // Get transfer timestamp - for a more complete implementation
      // we'd query for the Transfer event, but simplifying for now
      const lastTransferTimestamp = Math.floor(Date.now() / 1000);
      
      return {
        tokenId,
        owner,
        metadataUri: tokenUri,
        lastTransferTimestamp
      };
    } catch (error) {
      console.error(`Error fetching copy data for token ${tokenId}:`, error);
      return null;
    }
  }
  
  /**
   * Get a specific copy of the book by token ID
   * @param tokenId The token ID to fetch
   */
  async getCopyById(tokenId: string): Promise<BookCopy | null> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    return this.fetchCopyData(contract, tokenId);
  }
  
  /**
   * Get all copies owned by a specific address
   * @param ownerAddress The address to check ownership for
   */
  async getCopiesByOwner(ownerAddress: string): Promise<BookCopy[]> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    try {
      // First we need to check how many copies this address owns
      const balance = await contract.balanceOf(ownerAddress);
      
      if (balance.isZero()) {
        return [];
      }
      
      // Unfortunately, we need to scan all tokens to find the ones owned by this address
      // This could be inefficient for large collections
      const totalSupply = await contract.totalSupply();
      const copies: BookCopy[] = [];
      
      // Batch our queries
      const batchSize = 10;
      const totalMinted = totalSupply.toNumber();
      
      for (let i = 0; i < totalMinted; i += batchSize) {
        const end = Math.min(i + batchSize, totalMinted);
        const batchPromises = [];
        
        for (let tokenId = i + 1; tokenId <= end; tokenId++) {
          batchPromises.push(async () => {
            try {
              const owner = await contract.ownerOf(tokenId);
              if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
                const copy = await this.fetchCopyData(contract, tokenId.toString());
                return copy;
              }
              return null;
            } catch (error) {
              return null;
            }
          });
        }
        
        // Execute the batch promises
        const batchResults = await Promise.all(batchPromises.map(p => p()));
        copies.push(...batchResults.filter(copy => copy !== null) as BookCopy[]);
        
        // If we found all the copies, we can stop searching
        if (copies.length >= balance.toNumber()) {
          break;
        }
      }
      
      return copies;
    } catch (error) {
      console.error(`Error fetching copies for owner ${ownerAddress}:`, error);
      return [];
    }
  }
  
  /**
   * Check if a specific copy is owned by an address
   * @param tokenId The token ID to check
   * @param ownerAddress The address to check ownership for
   */
  async isOwnedBy(tokenId: string, ownerAddress: string): Promise<boolean> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    try {
      const owner = await contract.ownerOf(tokenId);
      return owner.toLowerCase() === ownerAddress.toLowerCase();
    } catch (error) {
      console.error(`Error checking ownership for token ${tokenId}:`, error);
      return false;
    }
  }
  
  /**
   * Get collection pricing and availability info
   */
  async getMintingInfo(): Promise<{
    price: string,
    availableMintDate: number,
    availableNow: boolean,
    walletLimit: number,
    totalMinted: number,
    maxSupply: number,
    remaining: number
  }> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    const [
      collectionParams,
      totalMinted,
      availableNow
    ] = await Promise.all([
      contract.collectionParameters(),
      contract.totalSupply(),
      contract.availableToMint()
    ]);
    
    const remaining = collectionParams.maxSupply.sub(totalMinted).toNumber();
    
    return {
      price: ethers.utils.formatEther(collectionParams.price),
      availableMintDate: collectionParams.availableToMintDate.toNumber(),
      availableNow,
      walletLimit: collectionParams.walletLimit.toNumber(),
      totalMinted: totalMinted.toNumber(),
      maxSupply: collectionParams.maxSupply.toNumber(),
      remaining
    };
  }
  
  /**
   * Listen for new mints in real-time
   * @param callback Function to call when a new mint occurs
   * @returns A function to unsubscribe from the events
   */
  subscribeToMints(callback: (tokenId: string, to: string) => void): () => void {
    // Make sure to properly handle the async provider
    const providerPromise = getProvider(this.chain);
    
    let contract: ethers.Contract;
    let filter: ethers.EventFilter;
    let listener: (from: string, to: string, tokenId: ethers.BigNumber) => void;
    
    const setup = async () => {
      const provider = await providerPromise;
      contract = new ethers.Contract(this.contractAddress, this.abi, provider);
      
      // Listen for Transfer events from the zero address (mints)
      filter = contract.filters.Transfer(ethers.constants.AddressZero);
      
      listener = (from: string, to: string, tokenId: ethers.BigNumber) => {
        callback(tokenId.toString(), to);
      };
      
      contract.on(filter, listener);
    };
    
    // Set up the subscription
    setup().catch(error => {
      console.error("Error setting up mint subscription:", error);
    });
    
    // Return a function to unsubscribe
    return () => {
      if (contract && filter && listener) {
        contract.off(filter, listener);
      }
    };
  }
}