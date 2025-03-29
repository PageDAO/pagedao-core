import { ReadmeBooksTracker } from './ReadmeBooksTracker';

/**
 * Registry for Readme Books
 */
export class ReadmeBooksRegistry {
  private trackers: Map<string, ReadmeBooksTracker> = new Map();
  
  /**
   * Get a tracker for a specific Readme book
   * Creates a new one if it doesn't exist yet
   * 
   * @param contractAddress The address of the Readme book contract
   * @param chain The chain the book is deployed on
   * @returns A tracker for the specified book
   */
  getTracker(contractAddress: string, chain: string = 'polygon'): ReadmeBooksTracker {
    const key = `${chain}:${contractAddress.toLowerCase()}`;
    
    if (!this.trackers.has(key)) {
      this.trackers.set(key, new ReadmeBooksTracker(contractAddress, chain));
    }
    
    return this.trackers.get(key)!;
  }
  
  /**
   * Get all registered trackers
   */
  getAllTrackers(): ReadmeBooksTracker[] {
    return Array.from(this.trackers.values());
  }
  
  /**
   * Create a new tracker for each book
   * 
   * @param books Array of book addresses and chains
   * @returns An object with all created trackers mapped by their addresses
   */
  registerBooks(books: { address: string, chain?: string }[]): Record<string, ReadmeBooksTracker> {
    const result: Record<string, ReadmeBooksTracker> = {};
    
    for (const { address, chain = 'polygon' } of books) {
      const tracker = this.getTracker(address, chain);
      result[address] = tracker;
    }
    
    return result;
  }
}