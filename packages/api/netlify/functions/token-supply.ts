import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { ethers } from 'ethers';

// Import core functionality
import { getConnector } from '@pagedao/core/src/connectors';
import config from '@pagedao/core/src/config';

// Logger setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[API-TOKEN-SUPPLY:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[API-TOKEN-SUPPLY:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[API-TOKEN-SUPPLY:ERROR] ${message}`, data ? data : '');
  }
};

// Schema for query parameters
const QuerySchema = z.object({
  chain: z.string().optional()
});

// Known excluded addresses (e.g., burn addresses, locked contracts)
const EXCLUDED_ADDRESSES = [
  '0x000000000000000000000000000000000000dead', // Burn address
  '0x0000000000000000000000000000000000000000'  // Zero address
];

/**
 * Get token supply metrics for a specific chain
 * @param chain The blockchain network name
 * @returns Object with total and circulating supply
 */
async function getTokenSupply(chain: string): Promise<{ total: string, circulating: string }> {
  try {
    logger.info(`Fetching token supply for chain: ${chain}`);
    
    // Find token config for this chain
    const tokenConfig = config.tokens.PAGE[chain as keyof typeof config.tokens.PAGE];
    
    if (!tokenConfig) {
      throw new Error(`No token configuration found for chain: ${chain}`);
    }
    
    // Get connector for this chain
    const connector = getConnector(chain);
    
    // Check if it's a Cosmos chain (like Osmosis) or an EVM chain
    if ('denom' in tokenConfig) {
      // Handle Cosmos chains (like Osmosis)
      logger.info(`Fetching token supply for Cosmos chain: ${chain}`);
      // You might need to implement a different method for Cosmos chains
      // For now, return placeholder values
      return {
        total: "100000000", // Placeholder
        circulating: "42500000" // Placeholder
      };
    } else if ('address' in tokenConfig) {
      // Handle EVM chains (Ethereum, Optimism, Base)
      // Get total supply
      const totalSupplyBN = await connector.getTokenTotalSupply(tokenConfig.address);
      
      // Get token decimals
      const decimals = tokenConfig.decimals;
      
      // Calculate circulating supply by subtracting excluded balances
      let excludedBalanceBN = ethers.BigNumber.from(0);
      
      for (const address of EXCLUDED_ADDRESSES) {
        const balance = await connector.getTokenBalance(tokenConfig.address, address);
        excludedBalanceBN = excludedBalanceBN.add(balance);
      }
      
      const circulatingSupplyBN = totalSupplyBN.sub(excludedBalanceBN);
      
      // Format supplies with proper decimals
      const totalSupply = ethers.utils.formatUnits(totalSupplyBN, decimals);
      const circulatingSupply = ethers.utils.formatUnits(circulatingSupplyBN, decimals);
      
      return {
        total: totalSupply,
        circulating: circulatingSupply
      };
    } else {
      throw new Error(`Invalid token configuration for chain: ${chain}`);
    }
  } catch (error) {
    logger.error(`Error fetching token supply for ${chain}`, error);
    throw error;
  }
}
const handler: Handler = async (event) => {
  try {
    logger.info(`Received token supply request: ${event.httpMethod} ${event.path}`);
    
    // Parse and validate query parameters
    const query = event.queryStringParameters || {};
    const validatedQuery = QuerySchema.parse(query);
    
    const { chain } = validatedQuery;
    
    // Prepare response data
    let responseData: any = {};
    
    if (chain) {
      // Single chain request
      logger.info(`Fetching token supply for chain: ${chain}`);
      
      // Validate chain
      const validChains = ['ethereum', 'optimism', 'base', 'osmosis'];
      if (!validChains.includes(chain)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Invalid chain: ${chain}` })
        };
      }
      
      // Get token supply for the specified chain
      const supplyData = await getTokenSupply(chain);
      
      responseData = {
        chain,
        ...supplyData
      };
    } else {
      // All chains request
      logger.info(`Fetching token supply for all chains`);
      
      // Get token supply for all supported chains
      const chains = ['ethereum', 'optimism', 'base', 'osmosis'];
      const supplyPromises = chains.map(async (chainName) => {
        try {
          return {
            chain: chainName,
            supply: await getTokenSupply(chainName)
          };
        } catch (error) {
          logger.error(`Failed to get supply for ${chainName}`, error);
          return {
            chain: chainName,
            error: (error as Error).message
          };
        }
      });
      
      const results = await Promise.all(supplyPromises);
      
      // Calculate total supply across all chains
      let totalSupply = 0;
      let totalCirculating = 0;
      
      results.forEach(result => {
        if (result.supply) {
          totalSupply += parseFloat(result.supply.total);
          totalCirculating += parseFloat(result.supply.circulating);
        }
      });
      
      responseData = {
        total: {
          total: totalSupply.toString(),
          circulating: totalCirculating.toString()
        },
        chains: {}
      };
      
      // Add individual chain data
      results.forEach(result => {
        if (result.supply) {
          responseData.chains[result.chain] = result.supply;
        } else {
          responseData.chains[result.chain] = { error: result.error };
        }
      });
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5 minute cache
      },
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    logger.error('Error processing token supply request', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid request parameters',
          details: error.errors
        })
      };
    }
    
    // Handle other errors
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: (error as Error).message
      })
    };
  }
};

export { handler };
