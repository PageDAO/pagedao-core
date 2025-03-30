// src/services/nft/metadataFetcher.ts

import { ethers } from 'ethers';
import { getProvider } from '../blockchain/provider';
import { MIRROR_ABI, README_BOOKS_ABI, ZORA_ABI } from '../../utils/abis';

/**
 * NFTMetadata interface - represents standardized metadata for all NFT types
 */
export interface NFTMetadata {
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
  tokenId: string;          // Token ID
  owner?: string;           // Current owner (if available)
  totalSupply?: number;     // Total supply for this token (if applicable)
  maxSupply?: number;       // Maximum possible supply (if applicable)
  // Can be extended with additional fields as needed
  additionalData?: Record<string, any>; // For type-specific data
}

/**
 * Maps asset types to their ABIs
 */
const ABI_MAP: Record<string, any> = {
  'book': README_BOOKS_ABI,
  'alexandria_book': README_BOOKS_ABI,
  'publication': MIRROR_ABI,
  'mirror_publication': MIRROR_ABI,
  'nft': ZORA_ABI,
  'zora_nft': ZORA_ABI,
  // Add more mappings as needed
};

/**
 * Cache for metadata to reduce RPC calls
 * Key format: `${chain}:${contractAddress}:${tokenId}`
 */
const metadataCache: Map<string, { data: NFTMetadata, timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch metadata for an NFT
 * 
 * @param contractAddress The NFT contract address
 * @param assetType The type of asset ("book", "publication", "nft", etc.)
 * @param chain The blockchain network
 * @param tokenId The token ID
 * @param options Additional options
 * @returns Promise with NFT metadata
 */
export async function fetchNFTMetadata(
  contractAddress: string,
  assetType: string,
  chain: string,
  tokenId: string,
  options?: {
    forceRefresh?: boolean,
    includeOwnership?: boolean
  }
): Promise<NFTMetadata> {
  // Check cache first (if not forcing refresh)
  const cacheKey = `${chain}:${contractAddress}:${tokenId}`;
  if (!options?.forceRefresh) {
    const cached = metadataCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data;
    }
  }
  
  // Get the appropriate ABI
  const abi = ABI_MAP[assetType.toLowerCase()];
  if (!abi) {
    throw new Error(`Unsupported asset type: ${assetType}`);
  }
  
  // Get provider
  const provider = await getProvider(chain);
  
  // Create contract instance
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  // Fetch base metadata - common for all types
  const baseMetadata: NFTMetadata = {
    id: `${contractAddress}-${tokenId}`,
    chain,
    contractAddress,
    tokenId
  };
  
  try {
    // Type-specific fetching logic
    let metadata: NFTMetadata;
    
    switch(assetType.toLowerCase()) {
      case 'book':
      case 'alexandria_book':
        metadata = await fetchBookMetadata(contract, baseMetadata, tokenId);
        break;
      
      case 'publication':
      case 'mirror_publication':
        metadata = await fetchPublicationMetadata(contract, baseMetadata, tokenId);
        break;
      
      case 'nft':
      case 'zora_nft':
        metadata = await fetchZoraNFTMetadata(contract, baseMetadata, tokenId);
        break;
      
      default:
        throw new Error(`Fetching logic not implemented for type: ${assetType}`);
    }
    
    // Add ownership information if requested
    if (options?.includeOwnership) {
      metadata.owner = await fetchOwner(contract, assetType, tokenId);
    }
    
    // Cache the result
    metadataCache.set(cacheKey, {
      data: metadata,
      timestamp: Date.now()
    });
    
    return metadata;
  } catch (error) {
    console.error(`Error fetching metadata for ${assetType} at ${contractAddress} on ${chain}:`, error);
    
    // Return minimal metadata on error
    return baseMetadata;
  }
}

/**
 * Fetch owner of a token
 */
async function fetchOwner(
  contract: ethers.Contract,
  assetType: string,
  tokenId: string
): Promise<string | undefined> {
  try {
    // Different NFT standards have different methods for ownership
    if (['nft', 'zora_nft', 'publication', 'mirror_publication'].includes(assetType.toLowerCase())) {
      // ERC-721 style
      return await contract.ownerOf(tokenId);
    } else {
      // For ERC-1155 tokens, this is more complex as multiple addresses can own the same token
      // Just returning undefined for now
      return undefined;
    }
  } catch (error) {
    console.error(`Error fetching owner for token ${tokenId}:`, error);
    return undefined;
  }
}

/**
 * Check if a token is owned by a specific address
 * Works with both ERC-721 and ERC-1155 tokens
 * 
 * @param contractAddress The NFT contract address
 * @param assetType The type of asset ("book", "publication", "nft", etc.)
 * @param chain The blockchain network
 * @param tokenId The token ID
 * @param ownerAddress The address to check ownership for
 * @param options Additional options
 * @returns Promise resolving to true if owned, false otherwise
 */
export async function isOwnedBy(
  contractAddress: string,
  assetType: string,
  chain: string,
  tokenId: string,
  ownerAddress: string,
  options?: {
    minQuantity?: number  // For ERC-1155 tokens, minimum quantity to consider as owned
  }
): Promise<boolean> {
  const abi = ABI_MAP[assetType.toLowerCase()];
  if (!abi) {
    throw new Error(`Unsupported asset type: ${assetType}`);
  }
  
  const provider = await getProvider(chain);
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  // Default minimum quantity is 1
  const minQuantity = options?.minQuantity || 1;
  
  try {
    if (['nft', 'zora_nft', 'publication', 'mirror_publication'].includes(assetType.toLowerCase())) {
      // ERC-721 style - Use ownerOf method
      try {
        const owner = await contract.ownerOf(tokenId);
        return owner.toLowerCase() === ownerAddress.toLowerCase();
      } catch (error) {
        // If ownerOf throws, the token might not exist or the contract doesn't support ownerOf
        console.error(`Error checking ownership with ownerOf for token ${tokenId}:`, error);
        return false;
      }
    } else {
      // ERC-1155 style - Use balanceOf method with token ID
      try {
        const balance = await contract.balanceOf(ownerAddress, tokenId);
        return balance.gte(minQuantity);
      } catch (error) {
        console.error(`Error checking ownership with balanceOf for token ${tokenId}:`, error);
        return false;
      }
    }
  } catch (error) {
    console.error(`General error checking ownership for token ${tokenId}:`, error);
    return false;
  }
}

/**
 * Get all tokens owned by an address for a specific contract
 * Note: This is a best-effort function that has limitations for each NFT standard
 */
export async function getTokensForOwner(
  contractAddress: string,
  assetType: string,
  chain: string,
  ownerAddress: string,
  options?: {
    maxTokensToCheck?: number,
    knownTokenIds?: string[]
  }
): Promise<string[]> {
  const abi = ABI_MAP[assetType.toLowerCase()];
  if (!abi) {
    throw new Error(`Unsupported asset type: ${assetType}`);
  }
  
  const provider = await getProvider(chain);
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  // Default to checking up to 100 tokens if not specified
  const maxTokensToCheck = options?.maxTokensToCheck || 100;
  
  try {
    // If there are known token IDs, just check those for ownership
    if (options?.knownTokenIds && options.knownTokenIds.length > 0) {
      const ownedTokens: string[] = [];
      
      // Check each token ID in batches
      const batchSize = 10; // Process 10 at a time to avoid rate limiting
      for (let i = 0; i < options.knownTokenIds.length; i += batchSize) {
        const batch = options.knownTokenIds.slice(i, i + batchSize);
        
        // Check each token ID in parallel
        const ownershipPromises = batch.map(async (tokenId) => {
          const isOwned = await isOwnedBy(contractAddress, assetType, chain, tokenId, ownerAddress);
          return isOwned ? tokenId : null;
        });
        
        const results = await Promise.all(ownershipPromises);
        ownedTokens.push(...results.filter(Boolean) as string[]);
      }
      
      return ownedTokens;
    }
    
    // Method depends on the asset type
    if (['nft', 'zora_nft', 'publication', 'mirror_publication'].includes(assetType.toLowerCase())) {
      // For ERC-721 type NFTs we'll check the owner's balance and then enumerate tokens
      try {
        // First get the owner's balance
        const balance = await contract.balanceOf(ownerAddress);
        
        if (balance.eq(0)) {
          return []; // No tokens owned
        }
        
        // Some contracts (like ERC721Enumerable) have a tokenOfOwnerByIndex function
        let ownedTokens: string[] = [];
        try {
          // Try to use ERC721Enumerable's tokenOfOwnerByIndex if available
          for (let i = 0; i < Math.min(balance.toNumber(), maxTokensToCheck); i++) {
            const tokenId = await contract.tokenOfOwnerByIndex(ownerAddress, i);
            ownedTokens.push(tokenId.toString());
          }
          return ownedTokens;
        } catch (indexError) {
          // tokenOfOwnerByIndex not supported, fall back to scanning
          console.log("tokenOfOwnerByIndex not supported, falling back to token scanning method");
        }
        
        // If we're here, we need to scan tokens - this is inefficient but a fallback
        // Try to get the total supply or next token ID
        let maxTokenId: number;
        try {
          maxTokenId = (await contract.nextTokenId()).toNumber();
        } catch (e1) {
          try {
            maxTokenId = (await contract.totalSupply()).toNumber();
          } catch (e2) {
            // Neither exists, default to checking up to maxTokensToCheck
            maxTokenId = maxTokensToCheck;
          }
        }
        
        // Scan tokens in batches
        ownedTokens = [];
        const batchSize = 10;
        for (let i = 1; i <= Math.min(maxTokenId, maxTokensToCheck); i += batchSize) {
          const batchPromises = [];
          
          for (let j = i; j < i + batchSize && j <= Math.min(maxTokenId, maxTokensToCheck); j++) {
            batchPromises.push(
              (async () => {
                try {
                  const owner = await contract.ownerOf(j);
                  return owner.toLowerCase() === ownerAddress.toLowerCase() ? j.toString() : null;
                } catch (e) {
                  return null; // Token doesn't exist or was burned
                }
              })()
            );
          }
          
          const results = await Promise.all(batchPromises);
          ownedTokens.push(...results.filter(Boolean) as string[]);
          
          // If we've found enough tokens to match the balance, we can stop
          if (ownedTokens.length >= balance.toNumber()) {
            break;
          }
        }
        
        return ownedTokens;
      } catch (error) {
        console.error(`Error getting tokens for owner with ERC721 approach:`, error);
        return [];
      }
    } else {
      // For ERC-1155 tokens
      // We need to scan tokens since ERC1155 doesn't have a standard way to enumerate
      // This is limited by not knowing which token IDs exist
      try {
        // For ERC-1155, we need to scan potential token IDs
        const ownedTokens: string[] = [];
        
        // Try to get the total supply if available
        let maxTokenId: number;
        try {
          // Some contracts have this, but it's not part of the ERC-1155 standard
          maxTokenId = (await contract.nextTokenId()).toNumber();
        } catch (e) {
          // Default to checking maxTokensToCheck tokens
          maxTokenId = maxTokensToCheck;
        }
        
        // Scan tokens in batches
        const batchSize = 10;
        for (let i = 1; i <= maxTokenId; i += batchSize) {
          const batchPromises = [];
          
          for (let j = i; j < i + batchSize && j <= maxTokenId; j++) {
            batchPromises.push(
              (async () => {
                try {
                  // For ERC-1155, check if the owner has a balance > 0
                  const balance = await contract.balanceOf(ownerAddress, j);
                  return balance.gt(0) ? j.toString() : null;
                } catch (e) {
                  return null; // Token ID might not exist
                }
              })()
            );
          }
          
          const results = await Promise.all(batchPromises);
          ownedTokens.push(...results.filter(Boolean) as string[]);
          
          // Limit the number of tokens returned
          if (ownedTokens.length >= maxTokensToCheck) {
            break;
          }
        }
        
        return ownedTokens;
      } catch (error) {
        console.error(`Error getting tokens for owner with ERC1155 approach:`, error);
        return [];
      }
    }
  } catch (error) {
    console.error(`Error in getTokensForOwner:`, error);
    return [];
  }
}

/**
 * Helper function to parse IPFS URIs and make them accessible
 */
function parseUri(uri: string): string {
  if (!uri) return '';
  
  // Convert IPFS URIs to HTTPS gateway URLs
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  
  return uri;
}

/**
 * Helper function to fetch and parse JSON metadata from a URI
 */
async function fetchJsonFromUri(uri: string): Promise<any> {
  try {
    if (!uri) return null;
    
    const parsedUri = parseUri(uri);
    const response = await fetch(parsedUri);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching JSON from ${uri}:`, error);
    return null;
  }
}

/**
 * Book-specific metadata fetching (Alexandria Books/ReadMe Books)
 * Implementation based on the contract and ABI
 */
async function fetchBookMetadata(
  contract: ethers.Contract, 
  baseMetadata: NFTMetadata,
  tokenId: string
): Promise<NFTMetadata> {
  try {
    // Fetch basic token information
    const [
      uri,
      name,
      symbol
    ] = await Promise.all([
      contract.uri(tokenId),
      contract.name(),
      contract.symbol()
    ]);
    
    // Try to get additional information that might be available
    let maxSupply: ethers.BigNumber | undefined;
    let totalSupply: ethers.BigNumber | undefined;
    
    try {
      maxSupply = await contract.maxSupply(tokenId);
    } catch (e) {
      // Function might not exist, ignore error
    }
    
    try {
      totalSupply = await contract.totalSupply(tokenId);
    } catch (e) {
      // Function might not exist, ignore error
    }
    
    // Try to get creator information
    let creator: string | undefined;
    try {
      creator = await contract.creators(tokenId);
    } catch (e) {
      // Try owner as fallback
      try {
        creator = await contract.owner();
      } catch (e2) {
        // Neither exists, leave undefined
      }
    }
    
    // Enhanced metadata from URI
    const tokenMetadata = await fetchJsonFromUri(uri);
    
    // Compile final metadata
    const metadata: NFTMetadata = {
      ...baseMetadata,
      title: tokenMetadata?.title || tokenMetadata?.name || name,
      description: tokenMetadata?.description || '',
      creator: creator,
      contentURI: parseUri(tokenMetadata?.contentUri || tokenMetadata?.content_uri || ''),
      imageURI: parseUri(tokenMetadata?.image || tokenMetadata?.coverImageUrl || ''),
      metadataURI: parseUri(uri),
      format: tokenMetadata?.format || 'ebook',
      maxSupply: maxSupply ? maxSupply.toNumber() : undefined,
      totalSupply: totalSupply ? totalSupply.toNumber() : undefined
    };
    
    // Add any other relevant fields from the token metadata
    if (tokenMetadata?.publicationDate) {
      metadata.createdAt = new Date(tokenMetadata.publicationDate).getTime();
    }
    
    // Additional data field for book-specific metadata
    metadata.additionalData = {
      publisher: tokenMetadata?.publisher,
      author: tokenMetadata?.author,
      language: tokenMetadata?.language,
      pageCount: tokenMetadata?.pageCount,
      genre: tokenMetadata?.genre
    };
    
    return metadata;
  } catch (error) {
    console.error(`Error fetching book metadata for token ${tokenId}:`, error);
    return baseMetadata;
  }
}

/**
 * Publication-specific metadata fetching (Mirror Publications)
 * Implementation based on the Mirror contract ABI
 */
async function fetchPublicationMetadata(
  contract: ethers.Contract, 
  baseMetadata: NFTMetadata,
  tokenId: string
): Promise<NFTMetadata> {
  try {
    // Make sure contract methods don't fail if they don't exist
    const safeCall = async <T>(method: string, ...args: any[]): Promise<T | undefined> => {
      try {
        return await contract[method](...args);
      } catch (e) {
        return undefined;
      }
    };
    
    // Basic publication info
    const [
      name,
      symbol,
      tokenURI,
      contractURI,
      totalSupply
    ] = await Promise.all([
      safeCall<string>('name'),
      safeCall<string>('symbol'),
      safeCall<string>('tokenURI', tokenId),
      safeCall<string>('contractURI'),
      safeCall<ethers.BigNumber>('totalSupply')
    ]);
    
    // Try to get content and image URI directly from contract if available
    const contentURI = await safeCall<string>('contentURI');
    const imageURI = await safeCall<string>('imageURI');
    const description = await safeCall<string>('description');
    
    // Try to get funding recipient as fallback creator
    let creator = undefined;
    try {
      creator = await contract.fundingRecipient();
    } catch (e) {
      try {
        creator = await contract.owner();
      } catch (e2) {
        // Neither exists
      }
    }
    
    // Get token specific metadata if available
    const tokenMetadata = await fetchJsonFromUri(tokenURI || '');
    const contractMetadata = await fetchJsonFromUri(contractURI || '');
    
    // Get royalty information if available
    let royaltyBPS: number | undefined;
    let royaltyRecipient: string | undefined;
    
    try {
      royaltyBPS = await contract.royaltyBPS();
      royaltyRecipient = await contract.royaltyRecipient();
    } catch (e) {
      // Royalty info not available
    }
    
    // Compile final metadata
    const metadata: NFTMetadata = {
      ...baseMetadata,
      title: tokenMetadata?.name || contractMetadata?.name || name || '',
      description: tokenMetadata?.description || contractMetadata?.description || description || '',
      creator: creator,
      contentURI: parseUri(contentURI || tokenMetadata?.content_uri || tokenMetadata?.contentURI || ''),
      imageURI: parseUri(imageURI || tokenMetadata?.image || contractMetadata?.image || ''),
      metadataURI: parseUri(tokenURI || ''),
      format: 'publication',
      totalSupply: totalSupply ? totalSupply.toNumber() : undefined
    };
    
    // Add any Mirror publication specific data
    metadata.additionalData = {
      royaltyBPS: royaltyBPS,
      royaltyRecipient: royaltyRecipient
    };
    
    return metadata;
  } catch (error) {
    console.error(`Error fetching publication metadata for token ${tokenId}:`, error);
    return baseMetadata;
  }
}

/**
 * Zora NFT-specific metadata fetching
 * Implementation based on the Zora contract ABI
 */
async function fetchZoraNFTMetadata(
  contract: ethers.Contract, 
  baseMetadata: NFTMetadata,
  tokenId: string
): Promise<NFTMetadata> {
  try {
    // Safe function caller that won't throw if method doesn't exist
    const safeCall = async <T>(method: string, ...args: any[]): Promise<T | undefined> => {
      try {
        return await contract[method](...args);
      } catch (e) {
        return undefined;
      }
    };
    
    // Get token URI and data
    const [uri, name, contractURI, totalSupply] = await Promise.all([
      safeCall<string>('uri', tokenId),
      safeCall<string>('name'),
      safeCall<string>('contractURI'),
      safeCall<ethers.BigNumber>('totalSupply')
    ]);
    
    // Try to get token info (Zora specific function)
    let maxSupply: number | undefined = undefined;
    let tokenInfo;
    try {
      tokenInfo = await contract.getTokenInfo(tokenId);
      maxSupply = tokenInfo?.maxSupply ? tokenInfo.maxSupply.toNumber() : undefined;
    } catch (e) {
      // getTokenInfo not available
    }
    
    // Try to get first minter as creator
    let creator: string | undefined;
    try {
      creator = await contract.firstMinters(tokenId);
    } catch (e) {
      try {
        creator = await contract.owner();
      } catch (e2) {
        // Neither function exists
      }
    }
    
    // Fetch royalty information
    let royalties;
    try {
      royalties = await contract.royalties(tokenId);
    } catch (e) {
      // Royalties function not available
    }
    
    // Get metadata from URI
    const tokenMetadata = await fetchJsonFromUri(uri || '');
    const contractMetadata = await fetchJsonFromUri(contractURI || '');
    
    // Compile final metadata
    const metadata: NFTMetadata = {
      ...baseMetadata,
      title: tokenMetadata?.name || contractMetadata?.name || name || '',
      description: tokenMetadata?.description || contractMetadata?.description || '',
      creator: creator,
      contentURI: parseUri(tokenMetadata?.animation_url || tokenMetadata?.content_uri || ''),
      imageURI: parseUri(tokenMetadata?.image || ''),
      metadataURI: parseUri(uri || ''),
      format: 'nft',
      maxSupply: maxSupply,
      totalSupply: totalSupply ? totalSupply.toNumber() : undefined
    };
    
    // Add Zora-specific additional data
    metadata.additionalData = {
      royalties: royalties ? {
        royaltyBPS: royalties.royaltyBPS,
        royaltyRecipient: royalties.royaltyRecipient
      } : undefined,
      attributes: tokenMetadata?.attributes || undefined,
      external_url: tokenMetadata?.external_url || undefined
    };
    
    return metadata;
  } catch (error) {
    console.error(`Error fetching Zora NFT metadata for token ${tokenId}:`, error);
    return baseMetadata;
  }
}