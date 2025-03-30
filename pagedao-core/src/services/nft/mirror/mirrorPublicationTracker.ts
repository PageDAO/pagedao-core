// src/services/mirror/mirrorPublicationTracker.ts (updated)

import { ethers } from 'ethers';
import { getProvider } from '../blockchain/provider';
// We'll need to import the ABI as a JSON object instead of strings
import mirrorAbi from '../../utils/ContentABIs/mirror.json';

// Publication data structure
export interface MirrorPublication {
  id: string;                  // Publication ID
  tokenId: string;             // Token ID
  owner: string;               // Current owner address
  title?: string;              // Publication title
  description?: string;        // Publication description
  contentURI?: string;         // Content URI
  imageURI?: string;           // Image URI
  fee?: number;                // Fee percentage
  price?: string;              // Price in ETH
  limit?: number;              // Edition limit
  totalSupply?: number;        // Total minted
  fundingRecipient?: string;   // Funding recipient address
  renderer?: string;           // Renderer address
  metadataUri?: string;        // URI for token metadata
  royaltyInfo?: {              // Royalty information
    recipient: string;         // Royalty recipient
    bps: number;               // Basis points
  };
}

/**
 * Service for tracking Mirror Publications
 */
export class MirrorPublicationTracker {
  private readonly abi: any;
  private readonly contractAddress: string;
  private readonly chain: string;

  /**
   * Create a new Mirror Publication tracker
   * @param contractAddress The address of the Mirror publication contract
   * @param chain The chain the publication is deployed on
   */
  constructor(contractAddress: string, chain: string = 'ethereum') {
    this.contractAddress = contractAddress;
    this.chain = chain;
    
    // Simply use the imported ABI directly - it's already in the correct format
    try {
      if (Array.isArray(mirrorAbi)) {
        // The imported mirrorAbi is already the ABI array
        this.abi = mirrorAbi;
        console.log(`Initialized Mirror tracker with chain: ${chain}`);
      } else {
        // Fallback to minimal ABI if the import isn't an array
        console.warn('Imported Mirror ABI is not in expected format, using minimal ABI');
        this.abi = [
          "function name() view returns (string)",
          "function description() view returns (string)",
          "function imageURI() view returns (string)",
          "function contentURI() view returns (string)",
          "function price() view returns (uint256)",
          "function limit() view returns (uint256)",
          "function totalSupply() view returns (uint256)",
          "function fundingRecipient() view returns (address)",
          "function renderer() view returns (address)",
          "function royaltyRecipient() view returns (address)",
          "function royaltyBPS() view returns (uint256)",
          "function ownerOf(uint256 tokenId) view returns (address)",
          "function tokenURI(uint256 tokenId) view returns (string)"
        ];
      }
    } catch (error) {
      console.error('Error initializing Mirror ABI:', error);
      // Fallback to minimal ABI
      this.abi = [
        "function ownerOf(uint256 tokenId) view returns (address)"
      ];
    }
  }
  
  /**
   * Fetch publication data
   */
  async fetchPublicationData(): Promise<MirrorPublication> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    try {
      // Fetch basic publication info with proper error handling for each call
      // This approach is more resilient against partial contract failures
      let title, description, imageURI, contentURI, price, limit, totalSupply,
          fundingRecipient, renderer, royaltyRecipient, royaltyBPS;
      
      // Use try/catch for each call to prevent one failure from blocking all
      try { title = await contract.name(); } catch (e) { title = ""; }
      try { description = await contract.description(); } catch (e) { description = ""; }
      try { imageURI = await contract.imageURI(); } catch (e) { imageURI = ""; }
      try { contentURI = await contract.contentURI(); } catch (e) { contentURI = ""; }
      try { price = await contract.price(); } catch (e) { price = ethers.BigNumber.from(0); }
      try { limit = await contract.limit(); } catch (e) { limit = ethers.BigNumber.from(0); }
      try { totalSupply = await contract.totalSupply(); } catch (e) { totalSupply = ethers.BigNumber.from(0); }
      try { fundingRecipient = await contract.fundingRecipient(); } catch (e) { fundingRecipient = ethers.constants.AddressZero; }
      try { renderer = await contract.renderer(); } catch (e) { renderer = ethers.constants.AddressZero; }
      try { royaltyRecipient = await contract.royaltyRecipient(); } catch (e) { royaltyRecipient = ethers.constants.AddressZero; }
      try { royaltyBPS = await contract.royaltyBPS(); } catch (e) { royaltyBPS = ethers.BigNumber.from(0); }
      
      return {
        id: this.contractAddress,
        tokenId: "0", // This is for the publication itself, not a specific token
        owner: fundingRecipient || ethers.constants.AddressZero, // Fallback if undefined
        title: title || "",
        description: description || "",
        contentURI: contentURI || "",
        imageURI: imageURI || "",
        fee: 0, // Default
        price: ethers.utils.formatEther(price || 0),
        limit: limit ? limit.toNumber() : 0,
        totalSupply: totalSupply ? totalSupply.toNumber() : 0,
        fundingRecipient: fundingRecipient || ethers.constants.AddressZero,
        renderer: renderer || ethers.constants.AddressZero,
        royaltyInfo: {
          recipient: royaltyRecipient || ethers.constants.AddressZero,
          bps: royaltyBPS ? royaltyBPS.toNumber() : 0
        }
      };
    } catch (error) {
      console.error(`Error fetching publication data for ${this.contractAddress}:`, error);
      
      // Return minimal data if we encounter errors
      return {
        id: this.contractAddress,
        tokenId: "0",
        owner: ethers.constants.AddressZero
      };
    }
  }
  
  // The rest of the methods would be similarly updated...
}