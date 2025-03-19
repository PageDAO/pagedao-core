import * as ethers from 'ethers';

/**
 * Interface for blockchain connector implementations
 */
export interface BlockchainConnector {
  /**
   * Get the chain ID for this blockchain
   */
  getChainId(): Promise<number>;
  
  /**
   * Get the latest block number
   */
  getBlockNumber(): Promise<number>;
  
  /**
   * Get the balance of an address
   * @param address The address to check
   */
  getBalance(address: string): Promise<ethers.BigNumber>;
  
  /**
   * Get token balance for an ERC20 token
   * @param tokenAddress The token contract address
   * @param ownerAddress The address of the token owner
   */
  getTokenBalance(tokenAddress: string, ownerAddress: string): Promise<ethers.BigNumber>;
  
  /**
   * Get token decimals
   * @param tokenAddress The token contract address
   */
  getTokenDecimals(tokenAddress: string): Promise<number>;
  
  /**
   * Get token symbol
   * @param tokenAddress The token contract address
   */
  getTokenSymbol(tokenAddress: string): Promise<string>;
  
  /**
   * Get token total supply
   * @param tokenAddress The token contract address
   */
  getTokenTotalSupply(tokenAddress: string): Promise<ethers.BigNumber>;
  
  /**
   * Call a read-only contract method
   * @param contractAddress The contract address
   * @param abi The contract ABI or ABI fragment for the method
   * @param methodName The method name to call
   * @param args Arguments to pass to the method
   */
  callContractMethod(
    contractAddress: string,
    abi: ethers.ContractInterface,
    methodName: string,
    args?: any[]
  ): Promise<any>;
}