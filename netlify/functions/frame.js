const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  // Check if this is initial load or button interaction
  const isPost = event.httpMethod === 'POST';
  let buttonPressed = null;
  
  // Parse POST data if this is a button interaction
  if (isPost && event.body) {
    try {
      const body = JSON.parse(event.body);
      buttonPressed = body.untrustedData?.buttonIndex;
    } catch (e) {
      console.error('Error parsing post data:', e);
    }
  }
  
  // Site base URL
  const host = process.env.URL || 'https://pagetokenprices.netlify.app';
  
  // Default to static image for initial load
  let imageUrl = `${host}/images/page-prices-static.png`;
  let buttonLabels = ["Refresh Prices", "Visit PageDAO.org", "Join PAGE Channel"];
  
  // Only try to generate dynamic content after button press
  if (isPost && buttonPressed === 1) {
    try {
      // Fetch latest prices
      const priceData = await fetchPagePrices();
      
      // Create SVG with current prices
      const svg = `
        <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="628" fill="#1e2d3a"/>
          <text x="100" y="100" font-size="48" fill="white" font-weight="bold">$PAGE Token Prices</text>
          <text x="100" y="180" font-size="36" fill="white">Ethereum: ${priceData.ethereum.toFixed(6)}</text>
          <text x="100" y="240" font-size="36" fill="white">Optimism: ${priceData.optimism.toFixed(6)}</text>
          <text x="100" y="300" font-size="36" fill="white">Base: ${priceData.base.toFixed(6)}</text>
          <text x="100" y="360" font-size="36" fill="white">Osmosis: ${priceData.osmosis.toFixed(6)}</text>
          <text x="100" y="440" font-size="40" fill="white" font-weight="bold">Average: ${
            ((priceData.ethereum + priceData.optimism + priceData.base + priceData.osmosis) / 4).toFixed(6)
          }</text>
          <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
        </svg>
      `;
      
      // Encode SVG to data URI
      const svgBase64 = Buffer.from(svg).toString('base64');
      imageUrl = `data:image/svg+xml;base64,${svgBase64}`;
      
      // Update button labels with prices
      buttonLabels = [
        "Refresh Prices", 
        "Visit PageDAO.org", 
        "Join PAGE Channel"
      ];
    } catch (error) {
      console.error('Error refreshing prices:', error);
      // Fall back to static image on error
      imageUrl = `${host}/images/page-prices-error.png`;
    }
  }
  
  // Return the frame HTML
  return {
    statusCode: 200,
    headers: {"Content-Type": "text/html"},
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${imageUrl}" />
        <meta property="fc:frame:button:1" content="${buttonLabels[0]}" />
        <meta property="fc:frame:button:2" content="${buttonLabels[1]}" />
        <meta property="fc:frame:button:3" content="${buttonLabels[2]}" />
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
};