const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  try {
    // Fetch the latest price data
    const priceData = await fetchPagePrices();
    
    // Format prices (4 decimal places for readability)
    const eth = priceData.ethereum.toFixed(4);
    const opt = priceData.optimism.toFixed(4);
    const base = priceData.base.toFixed(4);
    const osmo = priceData.osmosis.toFixed(4);
    
    // Calculate average
    const chains = ['ethereum', 'optimism', 'base', 'osmosis'];
    const avgPrice = chains.reduce((sum, chain) => sum + priceData[chain], 0) / chains.length;
    const avg = avgPrice.toFixed(4);
    
    // Use mage.space - a service designed specifically for Farcaster Frames
    const imageUrl = `https://api.mage.space/v0/images/text?p=%7B%22t%22%3A%22PAGE%20Token%20Prices%22%2C%22d%22%3A%22ETH%3A%20%24${eth}%20%7C%20OPT%3A%20%24${opt}%20%7C%20BASE%3A%20%24${base}%20%7C%20OSMO%3A%20%24${osmo}%20%7C%20AVG%3A%20%24${avg}%22%2C%22bg%22%3A%22%231e2d3a%22%2C%22tc%22%3A%22%23ffffff%22%2C%22ff%22%3A%22Inter%22%2C%22ts%22%3A72%2C%22maxw%22%3A1200%2C%22maxh%22%3A630%2C%22w%22%3A1200%2C%22h%22%3A630%7D`;
    
    // For cache busting
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
          <meta property="fc:frame:button:1" content="Refresh" />
          <meta property="fc:frame:button:2" content="Visit PageDAO.org" />
          <meta property="fc:frame:button:3" content="Join PAGE Channel" />
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
      statusCode: 200,
      headers: {"Content-Type": "text/html"},
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="https://api.mage.space/v0/images/text?p=%7B%22t%22%3A%22Error%20Fetching%20PAGE%20Prices%22%2C%22d%22%3A%22Please%20try%20again%20later%22%2C%22bg%22%3A%22%235c1e1e%22%2C%22tc%22%3A%22%23ffffff%22%2C%22ff%22%3A%22Inter%22%2C%22ts%22%3A72%2C%22maxw%22%3A1200%2C%22maxh%22%3A630%2C%22w%22%3A1200%2C%22h%22%3A630%7D" />
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