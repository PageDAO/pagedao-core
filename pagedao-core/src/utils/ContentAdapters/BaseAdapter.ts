import { ethers } from 'ethers';
import { ContentAdapter, NFTMetadata } from './types';

export abstract class BaseAdapter implements ContentAdapter {
  protected assetTypes: string[];
  
  constructor(assetTypes: string[]) {
    this.assetTypes = assetTypes.map(type => type.toLowerCase());
  }
  
  abstract getMetadata(
    contract: ethers.Contract,
    baseMetadata: NFTMetadata,
    tokenId: string
  ): Promise<NFTMetadata>;
  
  canHandle(assetType: string): boolean {
    return this.assetTypes.includes(assetType.toLowerCase());
  }
  
  // Common utility methods
  protected async safeCall<T>(
    contract: ethers.Contract, 
    method: string, 
    ...args: any[]
  ): Promise<T | undefined> {
    try {
      return await contract[method](...args);
    } catch (e) {
      return undefined;
    }
  }
  
  // Helper for parsing URIs
  protected parseUri(uri: string): string {
    if (!uri) return '';
    // Convert IPFS URIs to HTTPS gateway URLs
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    return uri;
  }
  
  // Helper for fetching metadata JSON
  protected async fetchJsonFromUri(uri: string): Promise<any> {
    try {
      if (!uri) return null;
      const parsedUri = this.parseUri(uri);
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
}
