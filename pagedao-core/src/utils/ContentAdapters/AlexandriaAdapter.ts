import { ethers } from 'ethers';
import { NFTMetadata } from './types';
import { BaseAdapter } from './BaseAdapter';

export class AlexandriaAdapter extends BaseAdapter {
  constructor() {
    super(['alexandria_book', 'alexandria']);
  }
  
  async getMetadata(
    contract: ethers.Contract,
    baseMetadata: NFTMetadata,
    tokenId: string
  ): Promise<NFTMetadata> {
    try {
      // Get tokenURI (Alexandria uses ERC721)
      let uri = await this.safeCall<string>(contract, 'tokenURI', tokenId);
      
      // Fetch basic contract information
      const [name, symbol] = await Promise.all([
        this.safeCall<string>(contract, 'name'),
        this.safeCall<string>(contract, 'symbol')
      ]);
      
      // Get additional contract information
      let creator = await this.safeCall<string>(contract, 'owner');
      let totalSupply = await this.safeCall<ethers.BigNumber>(contract, 'totalSupply');
      
      // Fetch metadata from tokenURI
      const tokenMetadata = await this.fetchJsonFromUri(uri || '');
      
      // Extract Alexandria-specific metadata
      const metadata: NFTMetadata = {
        ...baseMetadata,
        title: tokenMetadata?.name || name || '',
        description: tokenMetadata?.description || '',
        creator: creator,
        contentURI: this.parseUri(
          tokenMetadata?.properties?.media?.[0]?.uri || ''
        ),
        imageURI: this.parseUri(
          tokenMetadata?.image || tokenMetadata?.animation_url || ''
        ),
        metadataURI: this.parseUri(uri || ''),
        format: tokenMetadata?.properties?.media?.[0]?.type || 'ebook',
        totalSupply: totalSupply ? totalSupply.toNumber() : undefined,
      };
      
      // Process publication date
      if (tokenMetadata?.properties?.publication_date) {
        metadata.createdAt = new Date(tokenMetadata.properties.publication_date).getTime();
      } else if (tokenMetadata?.attributes) {
        // Check attributes array for publication date
        const pubDateAttr = tokenMetadata.attributes.find(
          (attr: any) => attr.trait_type === 'Publication date'
        );
        if (pubDateAttr?.value) {
          if (typeof pubDateAttr.value === 'number') {
            metadata.createdAt = pubDateAttr.value * 1000; // Convert seconds to milliseconds
          } else {
            metadata.createdAt = new Date(pubDateAttr.value).getTime();
          }
        }
      }
      
      // Add Alexandria-specific fields to additionalData
      metadata.additionalData = {
        symbol: symbol,
        publisher: tokenMetadata?.properties?.publisher,
        author: tokenMetadata?.properties?.author,
        language: tokenMetadata?.properties?.language,
        pageCount: tokenMetadata?.properties?.page_count,
        edition: tokenMetadata?.properties?.edition,
        categories: tokenMetadata?.properties?.categories,
        contributors: tokenMetadata?.properties?.contributors,
        externalUrl: tokenMetadata?.external_url,
        attributes: tokenMetadata?.attributes,
        media: tokenMetadata?.properties?.media,
        metadata_schema: tokenMetadata?.metadata_schema
      };
      
      return metadata;
    } catch (error) {
      console.error(`Alexandria adapter error:`, error);
      return baseMetadata;
    }
  }
}
