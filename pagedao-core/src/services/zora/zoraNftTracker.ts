import { ethers } from 'ethers';
import { getProvider } from '../../services/blockchain/provider';

// NFT token data structure
export interface ZoraNft {
  id: string;                  // NFT ID (contract address + token ID)
  contractAddress: string;     // Contract address
  tokenId: string;             // Token ID
  standard: 'ERC721' | 'ERC1155'; // NFT standard
  owner?: string;              // Owner (for ERC721) or null (for ERC1155)
  creator?: string;            // Original creator/first minter
  title?: string;              // NFT title/name
  description?: string;        // NFT description
  tokenURI?: string;           // Token URI
  imageUrl?: string;           // Image URL
  maxSupply?: number;          // Maximum supply
  totalMinted?: number;        // Total minted
  royaltyInfo?: {              // Royalty information
    recipient: string;         // Royalty recipient
    bps: number;               // Basis points
    mintSchedule: number;      // Mint schedule
  };
  permissions?: Record<string, number>; // User permissions
}

/**
 * Service for tracking Zora NFTs
 */
export class ZoraNftTracker {
  private readonly contractAddress: string;
  private readonly chain: string;
  private readonly standard: 'ERC721' | 'ERC1155';
  private readonly zoraNft1155Abi: any;

  /**
   * Create a new Zora NFT tracker
   * @param contractAddress The address of the Zora NFT contract
   * @param standard The NFT standard ('ERC721' or 'ERC1155')
   * @param chain The chain the NFT is deployed on
   */
  constructor(
    contractAddress: string, 
    standard: 'ERC721' | 'ERC1155' = 'ERC1155', 
    chain: string = 'zora'
  ) {
    this.contractAddress = contractAddress;
    this.standard = standard;
    this.chain = chain;
    
    // Real ABI for Zora ERC1155 contracts
    this.zoraNft1155Abi = [
      // Basic functions
      "function balanceOf(address account, uint256 id) view returns (uint256)",
      "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[] batchBalances)",
      "function isApprovedForAll(address account, address operator) view returns (bool)",
      "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
      "function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)",
      "function setApprovalForAll(address operator, bool approved)",
      
      // NFT info functions
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function contractName() view returns (string)",
      "function contractURI() view returns (string)",
      "function uri(uint256 tokenId) view returns (string)",
      "function nextTokenId() view returns (uint256)",
      "function totalSupply() view returns (uint256)",
      
      // Token-specific info
      "function getTokenInfo(uint256 tokenId) view returns (tuple(string uri, uint256 maxSupply, uint256 totalMinted))",
      "function firstMinters(uint256 tokenId) view returns (address)",
      "function permissions(uint256 tokenId, address user) view returns (uint256)",
      
      // Royalty info
      "function royalties(uint256 tokenId) view returns (uint32 royaltyMintSchedule, uint32 royaltyBPS, address royaltyRecipient)",
      "function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address receiver, uint256 royaltyAmount)",
      
      // Events
      "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
      "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
      "event SetupNewToken(uint256 indexed tokenId, address indexed sender, string newURI, uint256 maxSupply)"
    ];
  }
  
  /**
   * Fetch NFT data for a specific token ID
   * @param tokenId The token ID to fetch
   */
  async fetchNftData(tokenId: string): Promise<ZoraNft> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.zoraNft1155Abi, provider);
    
    try {
      // Fetch basic token info
      const [contractName, tokenInfo, royaltyInfo] = await Promise.all([
        contract.contractName(),
        contract.getTokenInfo(tokenId),
        contract.royalties(tokenId)
      ]);
      
      // Get creator
      let creator;
      try {
        creator = await contract.firstMinters(tokenId);
      } catch (error) {
        // This might not be available for all tokens
      }
      
      // Create NFT object
      const nft: ZoraNft = {
        id: `${this.contractAddress}-${tokenId}`,
        contractAddress: this.contractAddress,
        tokenId,
        standard: this.standard,
        title: contractName,
        creator,
        tokenURI: tokenInfo.uri,
        maxSupply: tokenInfo.maxSupply.toNumber(),
        totalMinted: tokenInfo.totalMinted.toNumber(),
        royaltyInfo: {
          recipient: royaltyInfo.royaltyRecipient,
          bps: royaltyInfo.royaltyBPS,
          mintSchedule: royaltyInfo.royaltyMintSchedule
        }
      };
      
      // Try to fetch metadata if URI is available
      if (nft.tokenURI) {
        try {
          // Handle IPFS URIs
          const uri = nft.tokenURI.startsWith('ipfs://') 
            ? nft.tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/') 
            : nft.tokenURI;
          
          const response = await fetch(uri);
          const metadata = await response.json();
          
          nft.title = metadata.name || nft.title;
          nft.description = metadata.description;
          nft.imageUrl = metadata.image;
        } catch (error) {
          console.warn(`Error fetching metadata for token ${tokenId}:`, error);
        }
      }
      
      return nft;
    } catch (error) {
      console.error(`Error fetching NFT data for token ${tokenId}:`, error);
      
      // Return minimal data if we encounter errors
      return {
        id: `${this.contractAddress}-${tokenId}`,
        contractAddress: this.contractAddress,
        tokenId,
        standard: this.standard
      };
    }
  }
  
  /**
   * Get token holders for a specific token ID
   * @param tokenId The token ID to check
   * @param addresses Array of addresses to check
   */
  async getTokenHolders(tokenId: string, addresses: string[] = []): Promise<{address: string, balance: number}[]> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.zoraNft1155Abi, provider);
    
    try {
      // If no addresses provided, we can't efficiently find all holders
      if (addresses.length === 0) {
        console.warn('No addresses provided to check for token holders. Provide an array of addresses to check balances.');
        return [];
      }
      
      // Get balances for all provided addresses
      const balances = await contract.balanceOfBatch(
        addresses,
        Array(addresses.length).fill(tokenId)
      );
      
      // Return addresses with non-zero balances
      return addresses
        .map((address, index) => ({
          address,
          balance: balances[index].toNumber()
        }))
        .filter(holder => holder.balance > 0);
    } catch (error) {
      console.error(`Error fetching token holders for ${tokenId}:`, error);
      return [];
    }
  }
  
  /**
   * Check if an address holds a token
   * @param tokenId The token ID to check
   * @param address The address to check
   * @param minBalance The minimum balance to consider as holding (default: 1)
   */
  async isHeldBy(tokenId: string, address: string, minBalance: number = 1): Promise<boolean> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.zoraNft1155Abi, provider);
    
    try {
      const balance = await contract.balanceOf(address, tokenId);
      return balance.gte(minBalance);
    } catch (error) {
      console.error(`Error checking token balance for ${address}:`, error);
      return false;
    }
  }
  
  /**
   * Get the metadata URI for a token
   * @param tokenId The token ID to check
   */
  async getTokenURI(tokenId: string): Promise<string> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.zoraNft1155Abi, provider);
    
    try {
      return await contract.uri(tokenId);
    } catch (error) {
      console.error(`Error fetching token URI for ${tokenId}:`, error);
      return '';
    }
  }
  
  /**
   * Get metadata for a token
   * @param tokenId The token ID to check
   */
  async getTokenMetadata(tokenId: string): Promise<any> {
    const uri = await this.getTokenURI(tokenId);
    
    if (!uri) return null;
    
    try {
      // Handle IPFS URIs
      const formattedUri = uri.startsWith('ipfs://') 
        ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/') 
        : uri;
      
      const response = await fetch(formattedUri);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching metadata for token ${tokenId}:`, error);
      return null;
    }
  }
  
  /**
   * Get the next token ID
   */
  async getNextTokenId(): Promise<number> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.zoraNft1155Abi, provider);
    
    try {
      const nextTokenId = await contract.nextTokenId();
      return nextTokenId.toNumber();
    } catch (error) {
      console.error('Error fetching next token ID:', error);
      return 0;
    }
  }
  
  /**
   * Get all tokens in the collection
   * @param fromTokenId Start from this token ID (inclusive)
   * @param toTokenId End at this token ID (inclusive)
   */
  async getAllTokens(fromTokenId: number = 1, toTokenId?: number): Promise<ZoraNft[]> {
    const provider = await getProvider(this.chain);
    const contract = new ethers.Contract(this.contractAddress, this.zoraNft1155Abi, provider);
    
    try {
      // If toTokenId is not provided, get the next token ID
      if (!toTokenId) {
        toTokenId = await this.getNextTokenId();
      }
      
      // Limit the range to avoid overloading
      const maxRange = 50;
      const endTokenId = Math.min(fromTokenId + maxRange, toTokenId);
      
      // Fetch all tokens in range
      const tokens: ZoraNft[] = [];
      for (let tokenId = fromTokenId; tokenId < endTokenId; tokenId++) {
        try {
          const token = await this.fetchNftData(tokenId.toString());
          tokens.push(token);
        } catch (error) {
          console.warn(`Error fetching token ${tokenId}:`, error);
        }
      }
      
      return tokens;
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return [];
    }
  }
  
  /**
   * Subscribe to token transfers
   * @param callback Function to call when a transfer occurs
   * @returns A function to unsubscribe from the events
   */
  subscribeToTransfers(callback: (from: string, to: string, tokenId: string, amount: number) => void): () => void {
    // Set up variables for contract and listeners
    let contract: ethers.Contract;
    let singleFilter: ethers.EventFilter;
    let batchFilter: ethers.EventFilter;
    let singleListener: (operator: string, from: string, to: string, id: ethers.BigNumber, value: ethers.BigNumber) => void;
    let batchListener: (operator: string, from: string, to: string, ids: ethers.BigNumber[], values: ethers.BigNumber[]) => void;
    
    // Async setup for provider and contract
    const setup = async () => {
      // Properly await the provider
      const provider = await getProvider(this.chain);
      contract = new ethers.Contract(this.contractAddress, this.zoraNft1155Abi, provider);
      
      // Listen to TransferSingle events
      singleFilter = contract.filters.TransferSingle();
      singleListener = (operator: string, from: string, to: string, id: ethers.BigNumber, value: ethers.BigNumber) => {
        callback(from, to, id.toString(), value.toNumber());
      };
      contract.on(singleFilter, singleListener);
      
      // Listen to TransferBatch events
      batchFilter = contract.filters.TransferBatch();
      batchListener = (operator: string, from: string, to: string, ids: ethers.BigNumber[], values: ethers.BigNumber[]) => {
        for (let i = 0; i < ids.length; i++) {
          callback(from, to, ids[i].toString(), values[i].toNumber());
        }
      };
      contract.on(batchFilter, batchListener);
    };
    
    // Initialize the subscription
    setup().catch(error => {
      console.error("Error setting up transfer subscription:", error);
    });
    
    // Return a function to unsubscribe
    return () => {
      if (contract) {
        if (singleFilter && singleListener) {
          contract.off(singleFilter, singleListener);
        }
        if (batchFilter && batchListener) {
          contract.off(batchFilter, batchListener);
        }
      }
    };
  }
  
  /**
   * Subscribe to new token creations
   * @param callback Function to call when a new token is created
   * @returns A function to unsubscribe from the events
   */
  subscribeToNewTokens(callback: (tokenId: string, creator: string, uri: string, maxSupply: number) => void): () => void {
    // Set up variables for contract and listener
    let contract: ethers.Contract;
    let filter: ethers.EventFilter;
    let listener: (tokenId: ethers.BigNumber, sender: string, newURI: string, maxSupply: ethers.BigNumber) => void;
    
    // Async setup for provider and contract
    const setup = async () => {
      // Properly await the provider
      const provider = await getProvider(this.chain);
      contract = new ethers.Contract(this.contractAddress, this.zoraNft1155Abi, provider);
      
      // Listen to SetupNewToken events
      filter = contract.filters.SetupNewToken();
      listener = (tokenId: ethers.BigNumber, sender: string, newURI: string, maxSupply: ethers.BigNumber) => {
        callback(tokenId.toString(), sender, newURI, maxSupply.toNumber());
      };
      contract.on(filter, listener);
    };
    
    // Initialize the subscription
    setup().catch(error => {
      console.error("Error setting up new token subscription:", error);
    });
    
    // Return a function to unsubscribe
    return () => {
      if (contract && filter && listener) {
        contract.off(filter, listener);
      }
    };
  }
}