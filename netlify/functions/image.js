const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  try {
    // Get the selected chain
    const { chain = 'all' } = event.queryStringParameters || {};
    
    // Fetch latest prices
    const priceData = await fetchPagePrices();
    
    // Calculate average price (only from the four chains)
    const chains = ['ethereum', 'optimism', 'base', 'osmosis'];
    const avgPrice = chains.reduce((sum, chain) => sum + priceData[chain], 0) / chains.length;
    
    // Create SVG image directly
    const svg = `
      <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="628" fill="#1e2d3a"/>
        <text x="100" y="100" font-family="Arial" font-size="48" fill="white" font-weight="bold">$PAGE Token Prices</text>
        <text x="100" y="180" font-family="Arial" font-size="36" fill="white">Ethereum: ${priceData.ethereum.toFixed(6)}</text>
        <text x="100" y="240" font-family="Arial" font-size="36" fill="white">Optimism: ${priceData.optimism.toFixed(6)}</text>
        <text x="100" y="300" font-family="Arial" font-size="36" fill="white">Base: ${priceData.base.toFixed(6)}</text>
        <text x="100" y="360" font-family="Arial" font-size="36" fill="white">Osmosis: ${priceData.osmosis.toFixed(6)}</text>
        <text x="100" y="440" font-family="Arial" font-size="40" fill="white" font-weight="bold">Average: ${avgPrice.toFixed(6)}</text>
        <text x="100" y="580" font-family="Arial" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
      </svg>
    `;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      },
      body: svg
    };
  } catch (error) {
    console.error('Error:', error);
    
    // Return a simple SVG error image
    const errorSvg = `
      <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="628" fill="#5c1e1e"/>
        <text x="100" y="100" font-family="Arial" font-size="48" fill="white" font-weight="bold">Error Fetching $PAGE Prices</text>
        <text x="100" y="180" font-family="Arial" font-size="36" fill="white">Please try again later</text>
        <text x="100" y="240" font-family="Arial" font-size="24" fill="#dddddd">${error.message}</text>
      </svg>
    `;
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      },
      body: errorSvg
    };
  }
};