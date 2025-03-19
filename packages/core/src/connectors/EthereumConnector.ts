import { providers, Contract, BigNumber, ContractInterface } from 'ethers';
import { getProvider } from '../providers';
import { BlockchainConnector } from './BlockchainConnector';

// Logger setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[ETH-CONNECTOR:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[ETH-CONNECTOR:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[ETH-CONNECTOR:ERROR] ${message}`, data ? data : '');
  }
};

// ERC20 token ABI fragments
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)'
];

/**
 * Ethereum blockchain connector implementation
 */
export class EthereumConnector implements BlockchainConnector {
  private chainName: string;
  
  /**
   * Create a new Ethereum connector
   * @param chainName The chain name to use with the provider system
   */
  constructor(chainName: string = 'ethereum') {
    this.chainName = chainName;
    logger.info(`Created Ethereum connector for chain: ${chainName}`);
  }
  
  /**
   * Get the provider for this chain
   */
  private async getChainProvider(): Promise<providers.JsonRpcProvider> {
    return getProvider(this.chainName);
  }
  
  /**
   * Get the chain ID
   */
  async getChainId(): Promise<number> {
    try {
      const provider = await this.getChainProvider();
      const network = await provider.getNetwork();
      return network.chainId;
    } catch (error) {
      logger.error(`Failed to get chain ID for ${this.chainName}`, error);
      throw new Error(`Failed to get chain ID: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get the latest block number
   */
  async getBlockNumber(): Promise<number> {
    try {
      const provider = await this.getChainProvider();
      return provider.getBlockNumber();
    } catch (error) {
      logger.error(`Failed to get block number for ${this.chainName}`, error);
      throw new Error(`Failed to get block number: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get the balance of an address
   * @param address The address to check
   */
  async getBalance(address: string): Promise<BigNumber> {
    try {
      const provider = await this.getChainProvider();
      return provider.getBalance(address);
    } catch (error) {
      logger.error(`Failed to get balance for ${address} on ${this.chainName}`, error);
      throw new Error(`Failed to get balance: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get token balance for an ERC20 token
   * @param tokenAddress The token contract address
   * @param ownerAddress The address of the token owner
   */
  async getTokenBalance(tokenAddress: string, ownerAddress: string): Promise<BigNumber> {
    try {
      const provider = await this.getChainProvider();
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
      return tokenContract.balanceOf(ownerAddress);
    } catch (error) {
      logger.error(`Failed to get token balance for ${ownerAddress} on token ${tokenAddress}`, error);
      throw new Error(`Failed to get token balance: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get token decimals
   * @param tokenAddress The token contract address
   */
  async getTokenDecimals(tokenAddress: string): Promise<number> {
    try {
      const provider = await this.getChainProvider();
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
      return tokenContract.decimals();
    } catch (error) {
      logger.error(`Failed to get token decimals for ${tokenAddress}`, error);
      throw new Error(`Failed to get token decimals: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get token symbol
   * @param tokenAddress The token contract address
   */
  async getTokenSymbol(tokenAddress: string): Promise<string> {
    try {
      const provider = await this.getChainProvider();
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
      return tokenContract.symbol();
    } catch (error) {
      logger.error(`Failed to get token symbol for ${tokenAddress}`, error);
      throw new Error(`Failed to get token symbol: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get token total supply
   * @param tokenAddress The token contract address
   */
  async getTokenTotalSupply(tokenAddress: string): Promise<BigNumber> {
    try {
      const provider = await this.getChainProvider();
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
      return tokenContract.totalSupply();
    } catch (error) {
      logger.error(`Failed to get token total supply for ${tokenAddress}`, error);
      throw new Error(`Failed to get token total supply: ${(error as Error).message}`);
    }
  }
  
  /**
   * Call a read-only contract method
   * @param contractAddress The contract address
   * @param abi The contract ABI or ABI fragment for the method
   * @param methodName The method name to call
   * @param args Arguments to pass to the method
   */
  async callContractMethod(
    contractAddress: string,
    abi: ContractInterface,
    methodName: string,
    args: any[] = []
  ): Promise<any> {
    try {
      const provider = await this.getChainProvider();
      const contract = new Contract(contractAddress, abi, provider);
      
      if (!contract[methodName]) {
        throw new Error(`Method ${methodName} not found in contract ABI`);
      }
      
      return contract[methodName](...args);
    } catch (error) {
      logger.error(`Failed to call contract method ${methodName} on ${contractAddress}`, error);
      throw new Error(`Failed to call contract method: ${(error as Error).message}`);
    }
  }
}
