import { AlexandriaBookTracker } from './AlexandriaBookTracker';

/**
 * Registry for Alexandria Books
 */
export class AlexandriaBookRegistry {
  private trackers: Map<string, AlexandriaBookTracker> = new Map();
  
  /**
   * Get a tracker for a specific Alexandria book
   * Creates a new one if it doesn't exist yet
   * 
   * @param contractAddress The address of the Alexandria book contract
   * @param chain The chain the book is deployed on
   * @returns A tracker for the specified book
   */
  getTracker(contractAddress: string, chain: string = 'base'): AlexandriaBookTracker {
    const key = `${chain}:${contractAddress.toLowerCase()}`;
    
    if (!this.trackers.has(key)) {
      this.trackers.set(key, new AlexandriaBookTracker(contractAddress, chain));
    }
    
    return this.trackers.get(key)!;
  }
  
  /**
   * Get all registered trackers
   */
  getAllTrackers(): AlexandriaBookTracker[] {
    return Array.from(this.trackers.values());
  }
  
  /**
   * Create a new tracker for each book
   * 
   * @param books Array of book addresses and chains
   * @returns An object with all created trackers mapped by their addresses
   */
  registerBooks(books: { address: string, chain?: string }[]): Record<string, AlexandriaBookTracker> {
    const result: Record<string, AlexandriaBookTracker> = {};
    
    for (const { address, chain = 'base' } of books) {
      const tracker = this.getTracker(address, chain);
      result[address] = tracker;
    }
    
    return result;
  }
}