import { ZoraNftTracker } from './zoraNftTracker';

/**
 * Registry for Zora NFTs
 */
export class ZoraNftRegistry {
  private trackers: Map<string, ZoraNftTracker> = new Map();
  
  /**
   * Get a tracker for a specific Zora NFT contract
   * Creates a new one if it doesn't exist yet
   * 
   * @param contractAddress The address of the Zora NFT contract
   * @param standard The NFT standard ('ERC721' or 'ERC1155')
   * @param chain The chain the NFT is deployed on
   * @returns A tracker for the specified NFT contract
   */
  getTracker(
    contractAddress: string, 
    standard: 'ERC721' | 'ERC1155' = 'ERC721', 
    chain: string = 'zora'
  ): ZoraNftTracker {
    const key = `${chain}:${contractAddress.toLowerCase()}:${standard}`;
    
    if (!this.trackers.has(key)) {
      this.trackers.set(
        key, 
        new ZoraNftTracker(contractAddress, standard, chain)
      );
    }
    
    return this.trackers.get(key)!;
  }
  
  /**
   * Get all registered trackers
   */
  getAllTrackers(): ZoraNftTracker[] {
    return Array.from(this.trackers.values());
  }
}