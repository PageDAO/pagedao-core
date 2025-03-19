// packages/api/netlify/functions/token-price.ts
import { Handler } from '@netlify/functions';
import { fetchPagePrices, getSupportedChains, calculateWeightedPrice } from '@pagedao/core';

interface TokenPriceResponse {
  price: number;
  byChain?: Record<string, number>;
  timestamp: number;
  chain?: string;
}

const handler: Handler = async (event, context) => {
  try {
    // Extract chain from path parameter if present
    const pathParts = event.path.split('/');
    const chain = pathParts[pathParts.length - 1] !== 'token-price' ? pathParts[pathParts.length - 1] : undefined;
    const supportedChains = getSupportedChains();
    
    // Fetch prices from all chains
    const priceData = await fetchPagePrices();
    
    // Prepare response
    const response: TokenPriceResponse = {
      price: 0,
      timestamp: priceData.timestamp
    };
    
    // If a specific chain was requested, validate and return that chain's price
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
      response.price = priceData[chain as keyof typeof priceData] as number;
    } else {
      // Return weighted average price and prices by chain
      const liquidities: Record<string, number> = {
        ethereum: 1000000, // Placeholder values - will be replaced with actual TVL data
        optimism: 500000,
        base: 750000,
        osmosis: priceData.osmosisTVL || 250000
      };
      
      // Calculate weighted average price
      response.price = calculateWeightedPrice(
        {
          ethereum: priceData.ethereum,
          optimism: priceData.optimism,
          base: priceData.base,
          osmosis: priceData.osmosis
        },
        liquidities
      );
      
      // Include prices by chain
      response.byChain = {
        ethereum: priceData.ethereum,
        optimism: priceData.optimism,
        base: priceData.base,
        osmosis: priceData.osmosis
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
    console.error('Error in token price endpoint:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch token price data',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

export { handler };
