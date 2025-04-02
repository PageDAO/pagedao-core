import { ethers } from 'ethers';
import { NFTMetadata } from './types';
import { BaseAdapter } from './BaseAdapter';

export class ZoraAdapter extends BaseAdapter {
  constructor() {
    super(['nft', 'zora_nft']);
  }
  
  async getMetadata(
    contract: ethers.Contract,
    baseMetadata: NFTMetadata,
    tokenId: string
  ): Promise<NFTMetadata> {
    try {
      // Get token URI and data
      const [uri, name, contractURI, totalSupply] = await Promise.all([
        this.safeCall<string>(contract, 'uri', tokenId),
        this.safeCall<string>(contract, 'name'),
        this.safeCall<string>(contract, 'contractURI'),
        this.safeCall<ethers.BigNumber>(contract, 'totalSupply')
      ]);
      
      // Try to get token info (Zora specific function)
      let maxSupply: number | undefined = undefined;
      let tokenInfo = await this.safeCall<any>(contract, 'getTokenInfo', tokenId);
      if (tokenInfo?.maxSupply) {
        maxSupply = tokenInfo.maxSupply.toNumber();
      }
      
      // Try to get first minter as creator
      let creator = await this.safeCall<string>(contract, 'firstMinters', tokenId) || 
                   await this.safeCall<string>(contract, 'owner');
      
      // Fetch royalty information
      let royalties = await this.safeCall<any>(contract, 'royalties', tokenId);
      
      // Get metadata from URI
      const tokenMetadata = await this.fetchJsonFromUri(uri || '');
      const contractMetadata = await this.fetchJsonFromUri(contractURI || '');
      
      // Compile final metadata
      const metadata: NFTMetadata = {
        ...baseMetadata,
        title: tokenMetadata?.name || contractMetadata?.name || name || '',
        description: tokenMetadata?.description || contractMetadata?.description || '',
        creator: creator,
        contentURI: this.parseUri(tokenMetadata?.animation_url || tokenMetadata?.content_uri || ''),
        imageURI: this.parseUri(tokenMetadata?.image || ''),
        metadataURI: this.parseUri(uri || ''),
        format: 'nft',
        maxSupply: maxSupply,
        totalSupply: totalSupply ? totalSupply.toNumber() : undefined
      };
      
      // Add Zora-specific additional data
      metadata.additionalData = {
        royalties: royalties ? {
          royaltyBPS: royalties.royaltyBPS,
          royaltyRecipient: royalties.royaltyRecipient
        } : undefined,
        attributes: tokenMetadata?.attributes || undefined,
        external_url: tokenMetadata?.external_url || undefined
      };
      
      return metadata;
    } catch (error) {
      console.error(`Zora adapter error:`, error);
      return baseMetadata;
    }
  }
}
