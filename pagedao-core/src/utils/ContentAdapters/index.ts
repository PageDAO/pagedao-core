import { ContentAdapter, NFTMetadata, MetadataFetchOptions } from './types';
import { AlexandriaAdapter } from './AlexandriaAdapter';
import { ReadmeBooksAdapter } from './ReadmeBooksAdapter';
import { ZoraAdapter } from './ZoraAdapter';
import { MirrorAdapter } from './MirrorAdapter';
import { ethers } from 'ethers';

// Create and register all adapters
const adapters: ContentAdapter[] = [
  new AlexandriaAdapter(),
  new ReadmeBooksAdapter(),
  new ZoraAdapter(),
  new MirrorAdapter()
];

// Registry to find the right adapter
export function getAdapter(assetType: string): ContentAdapter | undefined {
  return adapters.find(adapter => adapter.canHandle(assetType));
}

// Export all types and classes
export * from './types';
export * from './BaseAdapter';
export * from './AlexandriaAdapter';
export * from './ReadmeBooksAdapter';
export * from './ZoraAdapter';
export * from './MirrorAdapter';

// Main function to get metadata using the appropriate adapter
export async function getMetadata(
  contract: ethers.Contract,
  assetType: string,
  chain: string,
  contractAddress: string,
  tokenId: string
): Promise<NFTMetadata> {
  // Create base metadata
  const baseMetadata: NFTMetadata = {
    id: `${contractAddress}-${tokenId}`,
    chain,
    contractAddress,
    tokenId
  };
  
  // Get the appropriate adapter
  const adapter = getAdapter(assetType);
  
  if (!adapter) {
    console.warn(`No adapter found for asset type: ${assetType}`);
    return baseMetadata;
  }
  
  try {
    // Use the adapter to get the metadata
    return await adapter.getMetadata(contract, baseMetadata, tokenId);
  } catch (error) {
    console.error(`Error getting metadata for ${assetType}:`, error);
    return baseMetadata;
  }
}

// Register a new adapter
export function registerAdapter(adapter: ContentAdapter): void {
  adapters.push(adapter);
}
