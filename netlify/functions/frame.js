const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  try {
    // Fetch the latest price data
    const priceData = await fetchPagePrices();
    
    // Calculate average price
    const chains = ['ethereum', 'optimism', 'base', 'osmosis'];
    const avgPrice = chains.reduce((sum, chain) => sum + priceData[chain], 0) / chains.length;
    
    // Format prices for display
    const eth = priceData.ethereum.toFixed(6);
    const opt = priceData.optimism.toFixed(6);
    const base = priceData.base.toFixed(6);
    const osmo = priceData.osmosis.toFixed(6);
    const avg = avgPrice.toFixed(6);
    
    // Tiniest possible transparent 1x1 pixel PNG as base64
    const transparentPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    // Host URL
    const host = process.env.URL || 'https://pagetokenprices.netlify.app';
    
    return {
      statusCode: 200,
      headers: {"Content-Type": "text/html"},
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="data:image/png;base64,${transparentPixel}" />
          <meta property="fc:frame:button:1" content="ETH ${eth}" />
          <meta property="fc:frame:button:2" content="OPT ${opt}" />
          <meta property="fc:frame:button:3" content="BASE ${base}" />
          <meta property="fc:frame:button:4" content="AVG ${avg}" />
          <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
          <title>PAGE Token Prices</title>
        </head>
        <body>
          <h1>PAGE Token Prices</h1>
          <p>Current prices: ETH ${eth}, OPT ${opt}, BASE ${base}, OSMO ${osmo}, AVG ${avg}</p>
        </body>
        </html>
      `
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {"Content-Type": "text/html"},
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" />
          <meta property="fc:frame:button:1" content="Try Again" />
          <title>Error</title>
        </head>
        <body>
          <h1>Error loading PAGE prices</h1>
        </body>
        </html>
      `
    };
  }
};