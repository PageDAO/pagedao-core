const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  try {
    // Fetch latest prices
    const priceData = await fetchPagePrices();
    
    // Calculate average
    const chains = ['ethereum', 'optimism', 'base', 'osmosis'];
    const avgPrice = chains.reduce((sum, chain) => sum + priceData[chain], 0) / chains.length;
    
    // Create minimal 1x1 transparent PNG as base64
    const transparentPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    return {
      statusCode: 200,
      headers: {"Content-Type": "text/html"},
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="data:image/png;base64,${transparentPixel}" />
          <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
          <meta property="og:image" content="https://pagetokenprices.netlify.app/.netlify/functions/image?t=${Date.now()}" />
          <meta property="fc:frame:button:1" content="Ethereum: ${priceData.ethereum.toFixed(6)}" />
          <meta property="fc:frame:button:2" content="Optimism: ${priceData.optimism.toFixed(6)}" />
          <meta property="fc:frame:button:3" content="Base: ${priceData.base.toFixed(6)}" />
          <meta property="fc:frame:button:4" content="Avg: ${avgPrice.toFixed(6)}" />
          <meta property="fc:frame:post_url" content="${process.env.URL || 'https://pagetokenprices.netlify.app'}/.netlify/functions/frame" />
          <title>PAGE Token Prices</title>
        </head>
        <body>
          <h1>PAGE Token Prices</h1>
          <p>Current prices: ETH ${priceData.ethereum.toFixed(6)}, OPT ${priceData.optimism.toFixed(6)}, BASE ${priceData.base.toFixed(6)}, OSMO ${priceData.osmosis.toFixed(6)}</p>
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