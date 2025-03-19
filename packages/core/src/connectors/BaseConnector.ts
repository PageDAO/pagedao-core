import { providers } from 'ethers';
import { getProvider } from '../providers';
import { BlockchainConnector } from './BlockchainConnector';
import { EthereumConnector } from './EthereumConnector';

// Logger setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[BASE-CONNECTOR:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[BASE-CONNECTOR:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[BASE-CONNECTOR:ERROR] ${message}`, data ? data : '');
  }
};

/**
 * Base blockchain connector implementation
 * Extends EthereumConnector since most functionality is the same
 */
export class BaseConnector extends EthereumConnector {
  /**
   * Create a new Base connector
   */
  constructor() {
    super('base');
    logger.info('Created Base connector');
  }
  
  /**
   * Get the chain ID (override to ensure correct chain ID)
   */
  async getChainId(): Promise<number> {
    try {
      const provider = await getProvider('base');
      const network = await provider.getNetwork();
      
      // Base mainnet chain ID is 8453
      if (network.chainId !== 8453) {
        logger.warn(`Connected to Base with unexpected chain ID: ${network.chainId}`);
      }
      
      return network.chainId;
    } catch (error) {
      logger.error('Failed to get Base chain ID', error);
      throw new Error(`Failed to get Base chain ID: ${(error as Error).message}`);
    }
  }
  
  // Additional Base-specific methods could be added here
}
