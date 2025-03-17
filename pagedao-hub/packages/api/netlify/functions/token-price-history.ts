// packages/api/netlify/functions/token-price-history.ts
import { Handler } from '@netlify/functions';
import { fetchPagePrices, getSupportedChains } from '@pagedao/core';

interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}

/**
 * Generate mock price history data for testing
 * In production, this would pull from a database or time-series storage
 */
function generateMockPriceHistory(
  timeframe: string, 
  basePrice: number,
  volatility: number = 0.1
): PriceHistoryPoint[] {
  const now = Date.now();
  let points: PriceHistoryPoint[] = [];
  let duration: number;
  let interval: number;
  
  // Configure timeframe parameters
  switch(timeframe) {
    case '24h':
      duration = 24 * 60 * 60 * 1000; // 24 hours
      interval = 60 * 60 * 1000; // 1 hour
      break;
    case '7d':
      duration = 7 * 24 * 60 * 60 * 1000; // 7 days
      interval = 6 * 60 * 60 * 1000; // 6 hours
      break;
    case '30d':
      duration = 30 * 24 * 60 * 60 * 1000; // 30 days
      interval = 24 * 60 * 60 * 1000; // 1 day
      break;
    case '90d':
      duration = 90 * 24 * 60 * 60 * 1000; // 90 days
      interval = 3 * 24 * 60 * 60 * 1000; // 3 days
      break;
    case '1y':
      duration = 365 * 24 * 60 * 60 * 1000; // 1 year
      interval = 7 * 24 * 60 * 60 * 1000; // 1 week
      break;
    default:
      duration = 24 * 60 * 60 * 1000; // Default to 24 hours
      interval = 60 * 60 * 1000; // 1 hour
  }
  
  // Generate points
  const numPoints = Math.floor(duration / interval) + 1;
  let currentPrice = basePrice;
  
  for (let i = 0; i < numPoints; i++) {
    const timestamp = now - (numPoints - 1 - i) * interval;
    
    // Add some random price movement
    const changePercent = (Math.random() * 2 - 1) * volatility;
    currentPrice = currentPrice * (1 + changePercent);
    
    // Ensure price doesn't go below 0.005
    currentPrice = Math.max(currentPrice, 0.005);
    
    points.push({
      timestamp,
      price: currentPrice
    });
  }
  
  return points;
}

const handler: Handler = async (event, context) => {
  try {
    // Get timeframe from query parameter
    const timeframe = event.queryStringParameters?.timeframe || '24h';
    const validTimeframes = ['24h', '7d', '30d', '90d', '1y'];
    
    if (!validTimeframes.includes(timeframe)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid timeframe',
          validTimeframes
        })
      };
    }
    
    // Get current prices to use as the base for historical data
    const priceData = await fetchPagePrices();
    const supportedChains = getSupportedChains();
    
    // Generate mock historical data for each chain
    const byChain: Record<string, PriceHistoryPoint[]> = {};
    
    for (const chain of supportedChains) {
      const chainPrice = priceData[chain as keyof typeof priceData] as number;
      // Different volatility for different chains to create variety
      const volatility = {
        ethereum: 0.08,
        optimism: 0.12,
        base: 0.1,
        osmosis: 0.15
      }[chain] || 0.1;
      
      byChain[chain] = generateMockPriceHistory(
        timeframe, 
        chainPrice, 
        volatility
      );
    }
    
    // Calculate aggregated data (weighted average of all chains)
    const timestamps = byChain[supportedChains[0]].map(point => point.timestamp);
    const aggregated = timestamps.map(timestamp => {
      // For each timestamp, get the weighted average price
      const liquidities = {
        ethereum: 1000000,
        optimism: 500000,
        base: 750000,
        osmosis: 250000
      };
      
      const totalLiquidity = Object.values(liquidities).reduce((sum, val) => sum + val, 0);
      
      // Calculate weighted price at this timestamp
      let weightedPrice = 0;
      let pointsFound = 0;
      
      for (const chain of supportedChains) {
        const chainPoint = byChain[chain].find(p => p.timestamp === timestamp);
        if (chainPoint) {
          const weight = liquidities[chain as keyof typeof liquidities] / totalLiquidity;
          weightedPrice += chainPoint.price * weight;
          pointsFound++;
        }
      }
      
      return {
        timestamp,
        price: pointsFound > 0 ? weightedPrice : 0
      };
    });
    
    // Prepare response
    const response = {
      timeframe,
      byChain,
      aggregated
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5 minute cache
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error in price history endpoint:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch price history data',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

export { handler };