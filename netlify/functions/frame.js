const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  try {
    // Get selected chain from query parameters (default to showing all)
    const { chain = 'all' } = event.queryStringParameters || {};
    
    // Fetch the latest price data
    const priceData = await fetchPagePrices();
    
    // Generate button labels
    const getButtonLabel = (chainName) => {
      const formattedName = chainName.charAt(0).toUpperCase() + chainName.slice(1);
      return formattedName; // Just use the chain name without price
    };
    
    // Timestamp for cache busting the image
    const timestamp = new Date().getTime();
    
    // Get full host URL with proper protocol
    const host = process.env.URL || 'https://your-site.netlify.app';
    
    return {
      statusCode: 200,
      headers: {"Content-Type": "text/html"},
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${host}/.netlify/functions/image?chain=${chain}&t=${timestamp}" type="text/html" />
          <meta property="fc:frame:button:1" content="${getButtonLabel('ethereum')}" />
          <meta property="fc:frame:button:2" content="${getButtonLabel('optimism')}" />
          <meta property="fc:frame:button:3" content="${getButtonLabel('base')}" />
          <meta property="fc:frame:button:4" content="${getButtonLabel('osmosis')}" />
          <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
          <title>PAGE Token Prices</title>
        </head>
        <body>
          <h1>PAGE Token Prices</h1>
          <p>This is a Farcaster Frame showing current PAGE token prices.</p>
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
          <meta property="fc:frame:image" content="${process.env.URL || 'https://your-site.netlify.app'}/.netlify/functions/image?error=true" />
          <meta property="fc:frame:button:1" content="Try Again" />
          <meta property="fc:frame:post_url" content="${process.env.URL || 'https://your-site.netlify.app'}/.netlify/functions/frame" />
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