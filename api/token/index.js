const { fetchPagePrices } = require('../../packages/core/src/analytics/priceCalculator');
const { fetchAllTVL, calculateTVLWeights } = require('../../packages/core/src/analytics/tvlCalculator');

exports.handler = async function(event) {
  try {
    // Get query parameters
    const params = event.queryStringParameters || {};
    
    // Fetch latest prices
    const priceData = await fetchPagePrices();
    
    // Fetch TVL data
    const tvlData = await fetchAllTVL(priceData);
    
    // Calculate TVL weights
    const weights = calculateTVLWeights(tvlData);
    
    // Calculate weighted average price
    const weightedAvgPrice = (
      priceData.ethereum * weights.ethereum +
      priceData.optimism * weights.optimism +
      priceData.base * weights.base +
      priceData.osmosis * weights.osmosis
    );
    
    // Calculate market cap and FDV
    const CIRCULATING_SUPPLY = 42500000;
    const TOTAL_SUPPLY = 100000000;
    
    const marketCap = weightedAvgPrice * CIRCULATING_SUPPLY;
    const fdv = weightedAvgPrice * TOTAL_SUPPLY;
    
    // Prepare response
    const response = {
      timestamp: Date.now(),
      prices: {
        ethereum: priceData.ethereum,
        optimism: priceData.optimism,
        base: priceData.base,
        osmosis: priceData.osmosis,
        weighted: weightedAvgPrice
      },
      ethPrice: priceData.ethPrice,
      tvl: {
        ethereum: tvlData.ethereum,
        optimism: tvlData.optimism,
        base: tvlData.base,
        osmosis: tvlData.osmosis,
        total: tvlData.ethereum + tvlData.optimism + tvlData.base + tvlData.osmosis
      },
      weights: weights,
      marketCap: marketCap,
      fdv: fdv,
      supply: {
        circulating: CIRCULATING_SUPPLY,
        total: TOTAL_SUPPLY
      }
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error in token API:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to fetch token metrics',
        message: error.message
      })
    };
  }
};
