const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  console.log('Image request received from:', event.headers['user-agent']);
  
  try {
    console.log('About to fetch PAGE prices...');
    // Fetch latest prices
    const priceData = await fetchPagePrices();
    console.log('Successfully fetched prices:', priceData);
    
    // Calculate average price
    const chains = ['ethereum', 'optimism', 'base', 'osmosis'];
    const avgPrice = chains.reduce((sum, chain) => sum + priceData[chain], 0) / chains.length;
    console.log('Calculated average price:', avgPrice);
    
    // Create the SVG
    console.log('Creating SVG response');
    const svg = `
      <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="628" fill="#1e2d3a"/>
        <text x="100" y="100" font-size="48" fill="white" font-weight="bold">$PAGE Token Prices</text>
        <text x="100" y="180" font-size="36" fill="white">Ethereum: ${priceData.ethereum.toFixed(6)}</text>
        <text x="100" y="240" font-size="36" fill="white">Optimism: ${priceData.optimism.toFixed(6)}</text>
        <text x="100" y="300" font-size="36" fill="white">Base: ${priceData.base.toFixed(6)}</text>
        <text x="100" y="360" font-size="36" fill="white">Osmosis: ${priceData.osmosis.toFixed(6)}</text>
        <text x="100" y="440" font-size="40" fill="white" font-weight="bold">Average: ${avgPrice.toFixed(6)}</text>
        <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
      </svg>
    `;
    
    console.log('Returning successful SVG response');
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
    console.error('Error in image function:', error);
    console.log('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Return a simple SVG error image
    const errorSvg = `
      <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="628" fill="#5c1e1e"/>
        <text x="100" y="100" font-size="48" fill="white" font-weight="bold">Error Fetching $PAGE Prices</text>
        <text x="100" y="180" font-size="36" fill="white">Please try again later</text>
        <text x="100" y="240" font-size="24" fill="#dddddd">${error.message}</text>
      </svg>
    `;
    
    console.log('Returning error SVG response');
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