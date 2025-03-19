import { providers } from 'ethers';
import { getProvider } from '../providers';
import { BlockchainConnector } from './BlockchainConnector';
import { EthereumConnector } from './EthereumConnector';

// Logger setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[OPTIMISM-CONNECTOR:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[OPTIMISM-CONNECTOR:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[OPTIMISM-CONNECTOR:ERROR] ${message}`, data ? data : '');
  }
};

/**
 * Optimism blockchain connector implementation
 * Extends EthereumConnector since most functionality is the same
 */
export class OptimismConnector extends EthereumConnector {
  /**
   * Create a new Optimism connector
   */
  constructor() {
    super('optimism');
    logger.info('Created Optimism connector');
  }
  
  /**
   * Get the chain ID (override to ensure correct chain ID)
   */
  async getChainId(): Promise<number> {
    try {
      const provider = await getProvider('optimism');
      const network = await provider.getNetwork();
      
      // Optimism mainnet chain ID is 10
      if (network.chainId !== 10) {
        logger.warn(`Connected to Optimism with unexpected chain ID: ${network.chainId}`);
      }
      
      return network.chainId;
    } catch (error) {
      logger.error('Failed to get Optimism chain ID', error);
      throw new Error(`Failed to get Optimism chain ID: ${(error as Error).message}`);
    }
  }
  
  // Additional Optimism-specific methods could be added here
}
