import { ethers } from 'ethers';
import { NFTMetadata } from './types';
import { BaseAdapter } from './BaseAdapter';

export class MirrorAdapter extends BaseAdapter {
  constructor() {
    super(['publication', 'mirror_publication']);
  }
  
  async getMetadata(
    contract: ethers.Contract,
    baseMetadata: NFTMetadata,
    tokenId: string
  ): Promise<NFTMetadata> {
    try {
      // Basic publication info
      const [
        name,
        symbol,
        tokenURI,
        contractURI,
        totalSupply
      ] = await Promise.all([
        this.safeCall<string>(contract, 'name'),
        this.safeCall<string>(contract, 'symbol'),
        this.safeCall<string>(contract, 'tokenURI', tokenId),
        this.safeCall<string>(contract, 'contractURI'),
        this.safeCall<ethers.BigNumber>(contract, 'totalSupply')
      ]);
      
      // Try to get content and image URI directly from contract if available
      const contentURI = await this.safeCall<string>(contract, 'contentURI');
      const imageURI = await this.safeCall<string>(contract, 'imageURI');
      const description = await this.safeCall<string>(contract, 'description');
      
      // Try to get funding recipient as fallback creator
      let creator = await this.safeCall<string>(contract, 'fundingRecipient') || 
                  await this.safeCall<string>(contract, 'owner');
      
      // Get token specific metadata if available
      const tokenMetadata = await this.fetchJsonFromUri(tokenURI || '');
      const contractMetadata = await this.fetchJsonFromUri(contractURI || '');
      
      // Get royalty information if available
      let royaltyBPS = await this.safeCall<number>(contract, 'royaltyBPS');
      let royaltyRecipient = await this.safeCall<string>(contract, 'royaltyRecipient');
      
      // Compile final metadata
      const metadata: NFTMetadata = {
        ...baseMetadata,
        title: tokenMetadata?.name || contractMetadata?.name || name || '',
        description: tokenMetadata?.description || contractMetadata?.description || description || '',
        creator: creator,
        contentURI: this.parseUri(contentURI || tokenMetadata?.content_uri || tokenMetadata?.contentURI || ''),
        imageURI: this.parseUri(imageURI || tokenMetadata?.image || contractMetadata?.image || ''),
        metadataURI: this.parseUri(tokenURI || ''),
        format: 'publication',
        totalSupply: totalSupply ? totalSupply.toNumber() : undefined
      };
      
      // Add Mirror publication specific data
      metadata.additionalData = {
        symbol: symbol,
        royaltyBPS: royaltyBPS,
        royaltyRecipient: royaltyRecipient,
        attributes: tokenMetadata?.attributes,
        externalUrl: tokenMetadata?.external_url || contractMetadata?.external_url
      };
      
      return metadata;
    } catch (error) {
      console.error(`Mirror adapter error:`, error);
      return baseMetadata;
    }
  }
}
