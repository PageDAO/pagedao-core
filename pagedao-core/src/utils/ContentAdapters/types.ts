import { ethers } from 'ethers';

// Base metadata interface
export interface NFTMetadata {
  id: string; // Unique identifier (contract+tokenId)
  title?: string; // Content title
  description?: string; // Content description
  creator?: string; // Creator/author address or name
  contentURI?: string; // URI for the actual content
  imageURI?: string; // URI for cover image/preview
  metadataURI?: string; // URI for full metadata
  createdAt?: number; // Timestamp of creation
  lastUpdatedAt?: number; // Timestamp of last update
  format?: string; // Content format (ebook, audiobook, etc.)
  chain: string; // Blockchain network
  contractAddress: string; // Contract address
  tokenId: string; // Token ID
  owner?: string; // Current owner (if available)
  totalSupply?: number; // Total supply for this token (if applicable)
  maxSupply?: number; // Maximum possible supply (if applicable)
  additionalData?: Record<string, any>; // For type-specific data
}

// Interface for metadata adapters
export interface ContentAdapter {
  // Main method to get metadata from a contract
  getMetadata(
    contract: ethers.Contract,
    baseMetadata: NFTMetadata,
    tokenId: string
  ): Promise<NFTMetadata>;
  
  // Helper method to check if this adapter can handle a contract
  canHandle(assetType: string): boolean;
}

// Options for metadata fetching
export interface MetadataFetchOptions {
  forceRefresh?: boolean;
  includeOwnership?: boolean;
}
