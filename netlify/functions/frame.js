const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  try {
    // Fetch the latest price data
    const priceData = await fetchPagePrices();
    
    // Calculate average price
    const chains = ['ethereum', 'optimism', 'base', 'osmosis'];
    const avgPrice = chains.reduce((sum, chain) => sum + priceData[chain], 0) / chains.length;
    
    // Format prices for URL (limited decimal places)
    const eth = priceData.ethereum.toFixed(6);
    const opt = priceData.optimism.toFixed(6);
    const base = priceData.base.toFixed(6);
    const osmo = priceData.osmosis.toFixed(6);
    const avg = avgPrice.toFixed(6);
    
    // Use a public image generation service
    // This creates a simple image with text - you can customize the parameters
    const imageUrl = `https://img.shields.io/badge/PAGE-ETH:${eth}|OPT:${opt}|BASE:${base}|OSMO:${osmo}|AVG:${avg}-blue?style=for-the-badge`;
    
    // Timestamp for cache busting
    const timestamp = new Date().getTime();
    const host = process.env.URL || 'https://pagetokenprices.netlify.app';
    
    return {
      statusCode: 200,
      headers: {"Content-Type": "text/html"},
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${imageUrl}" />
          <meta property="fc:frame:button:1" content="Refresh Prices" />
          <meta property="fc:frame:button:2" content="Visit PageDAO.org" />
          <meta property="fc:frame:button:3" content="/page Channel" />
          <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="https://pagedao.org" />
          <meta property="fc:frame:button:3:action" content="link" />
          <meta property="fc:frame:button:3:target" content="https://warpcast.com/~/channel/page" />
          <title>PAGE Token Prices</title>
        </head>
        <body>
          <h1>PAGE Token Prices</h1>
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
          <meta property="fc:frame:image" content="https://img.shields.io/badge/ERROR-Please%20try%20again-red?style=for-the-badge" />
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