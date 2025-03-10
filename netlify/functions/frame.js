const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  try {
    // Get selected chain from query parameters (default to showing all)
    const { chain = 'all' } = event.queryStringParameters || {};
    
    // Fetch the latest price data
    const priceData = await fetchPagePrices();
    
    // Generate button labels with prices if available - format to 4 decimal places
    const getButtonLabel = (chainName) => {
      const price = priceData[chainName];
      return price ? `${chainName.charAt(0).toUpperCase() + chainName.slice(1)}: ${price.toFixed(4)}` : chainName;
    };
    
    // Timestamp for cache busting the image
    const timestamp = new Date().getTime();
    
    return {
      statusCode: 200,
      headers: {"Content-Type": "text/html"},
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${process.env.URL || 'http://localhost:8888'}/.netlify/functions/image?chain=${chain}&t=${timestamp}" />
          <meta property="fc:frame:button:1" content="${getButtonLabel('ethereum')}" />
          <meta property="fc:frame:button:2" content="${getButtonLabel('optimism')}" />
          <meta property="fc:frame:button:3" content="${getButtonLabel('base')}" />
          <meta property="fc:frame:button:4" content="${getButtonLabel('osmosis')}" />
          <meta property="fc:frame:post_url" content="${process.env.URL || 'http://localhost:8888'}/.netlify/functions/frame" />
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
          <meta property="fc:frame:image" content="${process.env.URL || 'http://localhost:8888'}/.netlify/functions/image?error=true" />
          <meta property="fc:frame:button:1" content="Try Again" />
          <meta property="fc:frame:post_url" content="${process.env.URL || 'http://localhost:8888'}/.netlify/functions/frame" />
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