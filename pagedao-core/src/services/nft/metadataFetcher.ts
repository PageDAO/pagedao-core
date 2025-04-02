import { ethers } from 'ethers';
import { getProvider } from '../blockchain/provider';
import { MIRROR_ABI, README_BOOKS_ABI, ZORA_ABI, ALEXANDRIA_ABI } from '../../utils/abis';
import { 
  getMetadata, 
  getAdapter, 
  NFTMetadata as AdapterNFTMetadata, 
  MetadataFetchOptions 
} from '../../utils/ContentAdapters';

// Re-export the NFTMetadata interface
export type NFTMetadata = AdapterNFTMetadata;

/**
 * Ensure ABI is in the correct array format for ethers.js
 */
function ensureAbiArray(abiValue: any): any[] {
  if (!abiValue) return [];
  if (Array.isArray(abiValue)) return abiValue;
  if (abiValue.default && Array.isArray(abiValue.default)) return abiValue.default;
  if (typeof abiValue === 'object') {
    const values = Object.values(abiValue);
    if (values.length > 0 && Array.isArray(values[0])) return values[0];
    return values;
  }
  if (typeof abiValue === 'string') {
    try { return JSON.parse(abiValue); }
    catch (e) { return []; }
  }
  console.warn('Unknown ABI format, returning empty array');
  return [];
}

console.log("USING LOCAL VERSION OF PAGEDAO-CORE");

/**
 * Maps asset types to their ABIs
 */
const ABI_MAP: Record<string, any> = {
  'book': README_BOOKS_ABI,
  'alexandria_book': ALEXANDRIA_ABI,
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
  
  // Create contract instance with properly formatted ABI
  console.log("Original ABI type:", typeof abi, Array.isArray(abi));
  const abiArray = ensureAbiArray(abi);
  console.log("Processed ABI type:", typeof abiArray, Array.isArray(abiArray));
  const contract = new ethers.Contract(contractAddress, abiArray, provider);

  try {
    // Use the new ContentAdapter system to fetch metadata
    const metadata = await getMetadata(
      contract, 
      assetType, 
      chain, 
      contractAddress,
      tokenId
    );
    
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
    return {
      id: `${contractAddress}-${tokenId}`,
      chain,
      contractAddress,
      tokenId
    };
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
    minQuantity?: number // For ERC-1155 tokens, minimum quantity to consider as owned
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

