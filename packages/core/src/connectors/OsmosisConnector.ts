import { BigNumber, ContractInterface } from 'ethers';
import { BlockchainConnector } from './BlockchainConnector';

// Logger setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[OSMOSIS-CONNECTOR:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[OSMOSIS-CONNECTOR:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[OSMOSIS-CONNECTOR:ERROR] ${message}`, data ? data : '');
  }
};

/**
 * Osmosis blockchain connector implementation
 * Note: Since Osmosis is a Cosmos SDK chain, not EVM-compatible,
 * this connector uses REST APIs instead of JSON-RPC
 */
export class OsmosisConnector implements BlockchainConnector {
  private baseUrl: string;
  private imperatorUrl: string;
  
  /**
   * Create a new Osmosis connector
   * @param baseUrl The base URL for Osmosis REST API
   * @param imperatorUrl The base URL for Imperator Osmosis API
   */
  constructor(
    baseUrl: string = 'https://lcd-osmosis.keplr.app',
    imperatorUrl: string = 'https://api-osmosis.imperator.co'
  ) {
    this.baseUrl = baseUrl;
    this.imperatorUrl = imperatorUrl;
    logger.info(`Created Osmosis connector with base URL: ${baseUrl}`);
  }
  
  /**
   * Get the chain ID
   */
  async getChainId(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/cosmos/base/tendermint/v1beta1/node_info`);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      // Return a numeric representation of the chain ID
      // Osmosis-1 would be represented as 1
      const chainIdStr = data.default_node_info.network;
      const chainIdNum = parseInt(chainIdStr.split('-')[1]) || 1;
      
      return chainIdNum;
    } catch (error) {
      logger.error('Failed to get Osmosis chain ID', error);
      // Default to 1 for Osmosis mainnet
      logger.warn('Defaulting to chain ID 1 for Osmosis');
      return 1;
    }
  }
  
  /**
   * Get the latest block number
   */
  async getBlockNumber(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/cosmos/base/tendermint/v1beta1/blocks/latest`);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      return parseInt(data.block.header.height);
    } catch (error) {
      logger.error('Failed to get Osmosis block number', error);
      throw new Error(`Failed to get Osmosis block number: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get the balance of an address
   * @param address The address to check
   */
  async getBalance(address: string): Promise<BigNumber> {
    try {
      const response = await fetch(`${this.baseUrl}/cosmos/bank/v1beta1/balances/${address}`);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Find OSMO balance
      const osmoBalance = data.balances.find((b: any) => b.denom === 'uosmo');
      
      if (!osmoBalance) {
        return BigNumber.from(0);
      }
      
      return BigNumber.from(osmoBalance.amount);
    } catch (error) {
      logger.error(`Failed to get Osmosis balance for ${address}`, error);
      throw new Error(`Failed to get Osmosis balance: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get token balance for a token
   * @param tokenAddress The token denom
   * @param ownerAddress The address of the token owner
   */
  async getTokenBalance(tokenAddress: string, ownerAddress: string): Promise<BigNumber> {
    try {
      const response = await fetch(`${this.baseUrl}/cosmos/bank/v1beta1/balances/${ownerAddress}`);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Find the specified token balance
      const tokenBalance = data.balances.find((b: any) => b.denom === tokenAddress);
      
      if (!tokenBalance) {
        return BigNumber.from(0);
      }
      
      return BigNumber.from(tokenBalance.amount);
    } catch (error) {
      logger.error(`Failed to get Osmosis token balance for ${ownerAddress}`, error);
      throw new Error(`Failed to get Osmosis token balance: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get token decimals
   * @param tokenAddress The token denom
   */
  async getTokenDecimals(tokenAddress: string): Promise<number> {
    // Most Cosmos tokens use 6 decimals
    if (tokenAddress === 'uosmo') {
      return 6;
    }
    
    // For IBC tokens, we'd need a token registry
    // For now, default to 6 which is common in Cosmos
    return 6;
  }
  
  /**
   * Get token symbol
   * @param tokenAddress The token denom
   */
  async getTokenSymbol(tokenAddress: string): Promise<string> {
    // For Osmosis, we can extract symbol from denom
    if (tokenAddress === 'uosmo') {
      return 'OSMO';
    }
    
    // For IBC tokens, we'd need to resolve the denom
    if (tokenAddress.startsWith('ibc/')) {
      try {
        // Try to get symbol from Imperator API
        const hash = tokenAddress.split('/')[1];
        const response = await fetch(`${this.imperatorUrl}/tokens/v2/${hash}`);
        
        if (response.ok) {
          const data = await response.json();
          return data.symbol || 'IBC';
        }
      } catch (error) {
        logger.warn(`Failed to resolve IBC token symbol for ${tokenAddress}`, error);
      }
      
      return 'IBC';
    }
    
    // For other tokens, strip the 'u' prefix if it exists
    if (tokenAddress.startsWith('u')) {
      return tokenAddress.substring(1).toUpperCase();
    }
    
    return tokenAddress;
  }
  
  /**
   * Get token total supply
   * @param tokenAddress The token denom
   */
  async getTokenTotalSupply(tokenAddress: string): Promise<BigNumber> {
    try {
      const response = await fetch(`${this.baseUrl}/cosmos/bank/v1beta1/supply/${tokenAddress}`);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      return BigNumber.from(data.amount.amount);
    } catch (error) {
      logger.error(`Failed to get Osmosis token supply for ${tokenAddress}`, error);
      throw new Error(`Failed to get Osmosis token supply: ${(error as Error).message}`);
    }
  }
  
  /**
   * Call a contract method - not directly applicable to Osmosis
   * This is implemented to satisfy the interface, but most calls will not work
   * as Osmosis uses CosmWasm contracts, not EVM contracts
   */
  async callContractMethod(
    contractAddress: string,
    abi: ContractInterface,
    methodName: string,
    args: any[] = []
  ): Promise<any> {
    logger.warn('callContractMethod is not fully supported for Osmosis');
    
    // For specific known methods, we can implement custom logic
    if (methodName === 'getPoolInfo' && contractAddress.startsWith('pool/')) {
      const poolId = contractAddress.split('/')[1];
      return this.getPoolInfo(poolId);
    }
    
    throw new Error('Contract method calls are not supported for Osmosis connector');
  }
  
  /**
   * Get pool information from Osmosis
   * @param poolId The Osmosis pool ID
   */
  private async getPoolInfo(poolId: string): Promise<any> {
    try {
      const response = await fetch(`${this.imperatorUrl}/pools/v2/${poolId}`);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      logger.error(`Failed to get Osmosis pool info for ${poolId}`, error);
      throw new Error(`Failed to get Osmosis pool info: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get PAGE token price from Osmosis
   * @param pageTokenDenom The PAGE token denom on Osmosis
   */
  async getPageTokenPrice(pageTokenDenom: string): Promise<number> {
    try {
      // Find the pool that contains PAGE token
      const response = await fetch(`${this.imperatorUrl}/tokens/v2/price/${pageTokenDenom}`);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      return data.price;
    } catch (error) {
      logger.error(`Failed to get PAGE token price on Osmosis`, error);
      throw new Error(`Failed to get PAGE token price: ${(error as Error).message}`);
    }
  }
}
