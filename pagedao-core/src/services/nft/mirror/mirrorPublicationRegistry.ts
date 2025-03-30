import { MirrorPublicationTracker } from './mirrorPublicationTracker';

/**
 * Registry for Mirror Publications
 */
export class MirrorPublicationRegistry {
  private trackers: Map<string, MirrorPublicationTracker> = new Map();
  
  /**
   * Get a tracker for a specific Mirror publication
   * Creates a new one if it doesn't exist yet
   * 
   * @param contractAddress The address of the Mirror publication contract
   * @param chain The chain the publication is deployed on
   * @returns A tracker for the specified publication
   */
  getTracker(contractAddress: string, chain: string = 'ethereum'): MirrorPublicationTracker {
    const key = `${chain}:${contractAddress.toLowerCase()}`;
    
    if (!this.trackers.has(key)) {
      this.trackers.set(key, new MirrorPublicationTracker(contractAddress, chain));
    }
    
    return this.trackers.get(key)!;
  }
  
  /**
   * Get all registered trackers
   */
  getAllTrackers(): MirrorPublicationTracker[] {
    return Array.from(this.trackers.values());
  }
}