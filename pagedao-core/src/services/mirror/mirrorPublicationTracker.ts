import { ethers } from 'ethers';
import { getProvider } from '../../services/blockchain/provider';

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
    
    // Real ABI for Mirror publication contracts
    this.abi = [
      // ERC721 standard functions
      "function balanceOf(address owner) view returns (uint256)",
      "function ownerOf(uint256 tokenId) view returns (address)",
      "function tokenURI(uint256 tokenId) view returns (string)",
      
      // Mirror-specific functions
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function description() view returns (string)",
      "function imageURI() view returns (string)",
      "function contentURI() view returns (string)",
      "function contractURI() view returns (string)",
      "function baseDescriptionURI() view returns (string)",
      "function totalSupply() view returns (uint256)",
      "function price() view returns (uint256)",
      "function limit() view returns (uint256)",
      "function fee() view returns (uint16)",
      "function fundingRecipient() view returns (address)",
      "function renderer() view returns (address)",
      "function royaltyBPS() view returns (uint256)",
      "function royaltyRecipient() view returns (address)",
      
      // Events
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
      "event WritingEditionPurchased(address indexed clone, uint256 tokenId, address indexed recipient, uint256 price, string message)"
    ];
  }
  
  /**
   * Fetch publication data
   */
  async fetchPublicationData(): Promise<MirrorPublication> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    try {
      // Fetch basic publication info
      const [
        title,
        description,
        imageURI,
        contentURI,
        price,
        limit,
        fee,
        totalSupply,
        fundingRecipient,
        renderer,
        royaltyRecipient,
        royaltyBPS
      ] = await Promise.all([
        contract.name(),
        contract.description(),
        contract.imageURI(),
        contract.contentURI(),
        contract.price(),
        contract.limit(),
        contract.fee(),
        contract.totalSupply(),
        contract.fundingRecipient(),
        contract.renderer(),
        contract.royaltyRecipient(),
        contract.royaltyBPS()
      ]);
      
      return {
        id: this.contractAddress,
        tokenId: "0", // This is for the publication itself, not a specific token
        owner: fundingRecipient, // In Mirror, the fundingRecipient is typically the owner/author
        title,
        description,
        contentURI,
        imageURI,
        fee: fee / 100, // Convert basis points to percentage
        price: ethers.utils.formatEther(price),
        limit: limit.toNumber(),
        totalSupply: totalSupply.toNumber(),
        fundingRecipient,
        renderer,
        royaltyInfo: {
          recipient: royaltyRecipient,
          bps: royaltyBPS.toNumber()
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
  
  /**
   * Get all tokens and their owners
   * @param maxTokens Maximum number of tokens to fetch (default: 100)
   */
  async getTokenOwners(maxTokens: number = 100): Promise<{ tokenId: string, owner: string }[]> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    try {
      const totalSupply = await contract.totalSupply();
      const tokenCount = Math.min(totalSupply.toNumber(), maxTokens);
      
      const result: { tokenId: string, owner: string }[] = [];
      
      // Process in batches to avoid overwhelming the provider
      const batchSize = 10;
      for (let i = 1; i <= tokenCount; i += batchSize) {
        const promises = [];
        
        for (let j = i; j < i + batchSize && j <= tokenCount; j++) {
          promises.push(
            contract.ownerOf(j).then((owner: string) => ({
              tokenId: j.toString(),
              owner
            }))
            .catch(() => null) // Skip tokens that might have been burned
          );
        }
        
        const owners = await Promise.all(promises);
        owners.filter(Boolean).forEach(owner => result.push(owner));
      }
      
      return result;
    } catch (error) {
      console.error(`Error fetching token owners for ${this.contractAddress}:`, error);
      return [];
    }
  }
  
  /**
   * Get the metadata for a specific token
   * @param tokenId The token ID to fetch
   */
  async getTokenMetadata(tokenId: string): Promise<any> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    try {
      const tokenURI = await contract.tokenURI(tokenId);
      
      // Handle IPFS URIs
      const uri = tokenURI.startsWith('ipfs://') 
        ? tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/') 
        : tokenURI;
      
      const response = await fetch(uri);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching metadata for token ${tokenId}:`, error);
      return null;
    }
  }
  
  /**
   * Get tokens owned by a specific address
   * @param ownerAddress The address to check
   * @param maxTokens Maximum number of tokens to check (default: 100)
   */
  async getTokensByOwner(ownerAddress: string, maxTokens: number = 100): Promise<string[]> {
    const tokens = await this.getTokenOwners(maxTokens);
    return tokens
      .filter(token => token.owner.toLowerCase() === ownerAddress.toLowerCase())
      .map(token => token.tokenId);
  }
  
  /**
   * Check if a token is owned by a specific address
   * @param tokenId The token ID to check
   * @param ownerAddress The address to check
   */
  async isOwnedBy(tokenId: string, ownerAddress: string): Promise<boolean> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.abi, provider);
    
    try {
      const owner = await contract.ownerOf(tokenId);
      return owner.toLowerCase() === ownerAddress.toLowerCase();
    } catch (error) {
      console.error(`Error checking ownership for token ${tokenId}:`, error);
      return false;
    }
  }
  
  /**
   * Subscribe to new purchases
   * @param callback Function to call when a new purchase is made
   * @returns A function to unsubscribe from the events
   */
  subscribeToNewPurchases(callback: (tokenId: string, recipient: string, price: string) => void): () => void {
    // Setup async provider and contract
    let contract: ethers.Contract;
    let filter: ethers.EventFilter;
    let listener: (clone: string, tokenId: ethers.BigNumber, recipient: string, price: ethers.BigNumber, message: string) => void;
    
    const setup = async () => {
      // Properly await the provider
      const provider = await getProvider(this.chain);
      contract = new ethers.Contract(this.contractAddress, this.abi, provider);
      
      filter = contract.filters.WritingEditionPurchased();
      
      listener = (
        clone: string, 
        tokenId: ethers.BigNumber, 
        recipient: string, 
        price: ethers.BigNumber, 
        message: string
      ) => {
        callback(
          tokenId.toString(), 
          recipient, 
          ethers.utils.formatEther(price)
        );
      };
      
      contract.on(filter, listener);
    };
    
    // Initialize the subscription
    setup().catch(error => {
      console.error("Error setting up purchase subscription:", error);
    });
    
    // Return a function to unsubscribe
    return () => {
      if (contract && filter && listener) {
        contract.off(filter, listener);
      }
    };
  }
}