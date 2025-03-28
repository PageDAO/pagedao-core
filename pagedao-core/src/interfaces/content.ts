// src/interfaces/content.ts

/**
 * Base content metadata interface that applies to all content types
 */
export interface ContentMetadata {
    id: string;               // Unique identifier (contract+tokenId)
    title?: string;           // Content title
    description?: string;     // Content description
    creator?: string;         // Creator/author address or name
    contentURI?: string;      // URI for the actual content
    imageURI?: string;        // URI for cover image/preview
    metadataURI?: string;     // URI for full metadata
    createdAt?: number;       // Timestamp of creation
    lastUpdatedAt?: number;   // Timestamp of last update
    format?: string;          // Content format (ebook, audiobook, etc.)
    chain: string;            // Blockchain network
    contractAddress: string;  // Contract address
  }
  
  /**
   * Ownership information
   */
  export interface Ownership {
    owner: string;            // Current owner address
    acquiredAt?: number;      // When ownership was acquired
    tokenId: string;          // The token ID within the contract
  }
  
  /**
   * Rights/licensing information
   */
  export interface ContentRights {
    license?: string;         // License type
    royaltyBps?: number;      // Royalty basis points
    royaltyRecipient?: string; // Who receives royalties
    transferable: boolean;    // Whether it can be transferred
    commercial: boolean;      // Whether commercial use is allowed
  }
  
  /**
   * Content history entry
   */
  export interface ContentHistoryEntry {
    timestamp: number;        // When this event occurred
    eventType: string;        // Event type (mint, transfer, update, etc.)
    from?: string;            // Address initiating event
    to?: string;              // Address receiving (if applicable)
    data?: any;               // Additional event data
  }
  
  /**
   * Collection info interface
   */
  export interface CollectionInfo {
    name: string;             // Collection name
    symbol?: string;          // Collection symbol
    description?: string;     // Collection description
    contractAddress: string;  // Contract address
    chain: string;            // Blockchain network
    totalSupply?: number;     // Total tokens minted
    maxSupply?: number;       // Maximum possible supply
    creator?: string;         // Collection creator
    imageURI?: string;        // Collection image URI
  }
  
  /**
   * Base content tracker interface
   * Provides a standardized API for all content types
   */
  export interface ContentTracker {
    // Basic information
    getContractAddress(): string;
    getChain(): string;
    getContentType(): string; // "book", "publication", "nft", etc.
    
    // Content fetching
    fetchMetadata(tokenId: string): Promise<ContentMetadata>;
    fetchOwnership(tokenId: string): Promise<Ownership>;
    fetchRights(tokenId: string): Promise<ContentRights>;
    
    // Ownership operations
    isOwnedBy(tokenId: string, address: string): Promise<boolean>;
    getTokensByOwner(ownerAddress: string, options?: any): Promise<string[]>;
    
    // Collection
    getCollectionInfo(): Promise<CollectionInfo>;
    getAllTokens(options?: any): Promise<string[]>;
    
    // Events
    subscribeToTransfers(callback: (from: string, to: string, tokenId: string) => void): () => void;
  }