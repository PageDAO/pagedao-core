// packages/api/netlify/functions/token-price.ts
import { Handler } from '@netlify/functions';
import { fetchPagePrices, getSupportedChains, calculateWeightedPrice } from '@pagedao/core';

interface TokenPriceResponse {
  price: number;
  byChain?: Record<string, number>;
  timestamp: number;
  chain?: string;
  weightedPrice?: number;
  weightedPriceChange24h?: number;
}

// Mock 24h change data (would come from a historical data service in production)
const mockChange24h = {
  ethereum: 2.3,
  optimism: 1.8,
  base: 3.5,
  osmosis: -0.7
};

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
      timestamp: priceData.timestamp || Date.now()
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
        ethereum: 1000000, // Placeholder values or get from TVL service
        optimism: 500000,
        base: 750000,
        osmosis: priceData.osmosisTVL || 250000
      };
      
      // Calculate weighted average price
      const prices: Record<string, number> = {
        ethereum: priceData.ethereum,
        optimism: priceData.optimism,
        base: priceData.base,
        osmosis: priceData.osmosis
      };
      
      response.price = calculateWeightedPrice(
        prices as any,
        liquidities as any
      );
      
      // Include prices by chain
      response.byChain = prices;
      
      // Add weighted price and change for dashboard needs
      response.weightedPrice = response.price;
      
      // Calculate weighted price change (simple weighted average for now)
      const totalLiquidity = Object.values(liquidities).reduce((sum, val) => sum + val, 0);
      response.weightedPriceChange24h = Object.keys(prices).reduce((acc, chain) => {
        const chainWeight = liquidities[chain] / totalLiquidity;
        return acc + (mockChange24h[chain as keyof typeof mockChange24h] * chainWeight);
      }, 0);
      
      // Format for the dashboard API response
      const formattedResponse = {
        prices: Object.keys(prices).reduce((acc, chain) => {
          acc[chain] = {
            price: prices[chain],
            change24h: mockChange24h[chain as keyof typeof mockChange24h],
            lastUpdated: response.timestamp
          };
          return acc;
        }, {} as Record<string, any>),
        weightedPrice: response.weightedPrice,
        weightedPriceChange24h: response.weightedPriceChange24h
      };
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60'
        },
        body: JSON.stringify(formattedResponse)
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