import { BlockchainConnector } from './BlockchainConnector';
import { EthereumConnector } from './EthereumConnector';
import { OptimismConnector } from './OptimismConnector';
import { BaseConnector } from './BaseConnector';
import { OsmosisConnector } from './OsmosisConnector';

// Logger setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[CONNECTOR:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[CONNECTOR:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[CONNECTOR:ERROR] ${message}`, data ? data : '');
  }
};

// Cache for blockchain connectors
const connectorCache: Record<string, BlockchainConnector> = {};

/**
 * Get a blockchain connector for the specified chain
 * @param chain The blockchain network name
 * @returns A blockchain connector instance
 */
export function getConnector(chain: string): BlockchainConnector {
  // Check if we have a cached connector
  if (connectorCache[chain]) {
    logger.info(`Using cached connector for ${chain}`);
    return connectorCache[chain];
  }
  
  logger.info(`Creating new connector for ${chain}`);
  
  // Create the appropriate connector based on chain name
  let connector: BlockchainConnector;
  
  switch (chain.toLowerCase()) {
    case 'ethereum':
    case 'mainnet':
      connector = new EthereumConnector('ethereum');
      break;
      
    case 'optimism':
      connector = new OptimismConnector();
      break;
      
    case 'base':
      connector = new BaseConnector();
      break;
      
    case 'osmosis':
      connector = new OsmosisConnector();
      break;
      
    default:
      // For unknown chains, default to Ethereum connector with the specified chain name
      logger.warn(`Unknown chain ${chain}, defaulting to EthereumConnector`);
      connector = new EthereumConnector(chain);
  }
  
  // Cache the connector
  connectorCache[chain] = connector;
  return connector;
}

/**
 * Clear the connector cache for a specific chain or all chains
 * @param chain Optional chain name to clear specific cache
 */
export function clearConnectorCache(chain?: string): void {
  if (chain) {
    if (connectorCache[chain]) {
      delete connectorCache[chain];
      logger.info(`Cleared connector cache for ${chain}`);
    }
  } else {
    Object.keys(connectorCache).forEach(key => delete connectorCache[key]);
    logger.info('Cleared all connector caches');
  }
}

export { BlockchainConnector, EthereumConnector, OptimismConnector, BaseConnector, OsmosisConnector };
