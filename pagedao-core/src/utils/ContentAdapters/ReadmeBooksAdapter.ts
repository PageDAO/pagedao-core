import { ethers } from 'ethers';
import { NFTMetadata } from './types';
import { BaseAdapter } from './BaseAdapter';

export class ReadmeBooksAdapter extends BaseAdapter {
  constructor() {
    super(['book', 'readme_book']);
  }
  
  async getMetadata(
    contract: ethers.Contract,
    baseMetadata: NFTMetadata,
    tokenId: string
  ): Promise<NFTMetadata> {
    try {
      // ReadMe uses ERC1155
      let uri = await this.safeCall<string>(contract, 'uri', tokenId);
      
      // Fetch basic information
      const [name, symbol] = await Promise.all([
        this.safeCall<string>(contract, 'name'),
        this.safeCall<string>(contract, 'symbol')
      ]);
      
      // Get additional information
      let creator = await this.safeCall<string>(contract, 'creators', tokenId);
      let maxSupply = await this.safeCall<ethers.BigNumber>(contract, 'maxSupply', tokenId);
      let totalSupply = await this.safeCall<ethers.BigNumber>(contract, 'totalSupply', tokenId);
      
      // Fetch metadata from URI
      const tokenMetadata = await this.fetchJsonFromUri(uri || '');
      
      // Extract ReadMe-specific metadata
      const metadata: NFTMetadata = {
        ...baseMetadata,
        title: tokenMetadata?.title || tokenMetadata?.name || name || '',
        description: tokenMetadata?.description || '',
        creator: creator,
        contentURI: this.parseUri(tokenMetadata?.contentUri || tokenMetadata?.content_uri || ''),
        imageURI: this.parseUri(tokenMetadata?.image || tokenMetadata?.coverImageUrl || ''),
        metadataURI: this.parseUri(uri || ''),
        format: tokenMetadata?.format || 'ebook',
        maxSupply: maxSupply ? maxSupply.toNumber() : undefined,
        totalSupply: totalSupply ? totalSupply.toNumber() : undefined,
      };
      
      // Add ReadMe-specific fields to additionalData
      metadata.additionalData = {
        symbol: symbol,
        publisher: tokenMetadata?.publisher,
        author: tokenMetadata?.author,
        language: tokenMetadata?.language,
        pageCount: tokenMetadata?.pageCount,
        genre: tokenMetadata?.genre
      };
      
      return metadata;
    } catch (error) {
      console.error(`ReadmeBooks adapter error:`, error);
      return baseMetadata;
    }
  }
}
