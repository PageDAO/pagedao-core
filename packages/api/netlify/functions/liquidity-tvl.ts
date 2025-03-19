// packages/api/netlify/functions/liquidity-tvl.ts
import { Handler } from '@netlify/functions';
import { getSupportedChains } from '@pagedao/core';

interface TVLResponse {
  tvl: number;
  byChain?: Record<string, number>;
  timestamp: number;
  chain?: string;
}

const handler: Handler = async (event, context) => {
  try {
    // Extract chain from path parameter if present
    const pathParts = event.path.split('/');
    const chain = pathParts[pathParts.length - 1] !== 'liquidity-tvl' ? pathParts[pathParts.length - 1] : undefined;
    const supportedChains = getSupportedChains();
    
    // For now, we'll use placeholder TVL data
    // In the future, this will be replaced with actual TVL calculations
    const tvlData = {
      ethereum: 1000000,
      optimism: 500000,
      base: 750000,
      osmosis: 250000,
      timestamp: Date.now()
    };
    
    // Prepare response
    const response: TVLResponse = {
      tvl: 0,
      timestamp: tvlData.timestamp
    };
    
    // If a specific chain was requested, validate and return that chain's TVL
    if (chain) {
      if (!supportedChains.includes(chain)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: `Unsupported chain: ${chain}`,
            supportedChains
          })
        };
      }
      
      response.chain = chain;
      response.tvl = tvlData[chain as keyof typeof tvlData] as number;
    } else {
      // Return total TVL and TVL by chain
      response.tvl = Object.values(tvlData)
        .filter(value => typeof value === 'number')
        .reduce((sum, value) => sum + value, 0) as number;
      
      // Include TVL by chain
      response.byChain = {
        ethereum: tvlData.ethereum,
        optimism: tvlData.optimism,
        base: tvlData.base,
        osmosis: tvlData.osmosis
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error in TVL endpoint:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch TVL data',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

export { handler };
