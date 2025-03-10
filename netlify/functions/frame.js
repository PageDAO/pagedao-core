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
  
  // Use the IPFS image as the static image
  let imageUrl = "https://pink-quiet-quelea-944.mypinata.cloud/ipfs/bafkreigyddi6zzsf2hkv7im4qtkvhkdvj5dvzs36xzotam7kvv7n6lksmu?pinataGatewayToken=NQ6fEH8plNGyNnOv1CjExntu8JtvIZvzUaX_g3zU12PMtovIWlpcaxnsTJrV29l-";
  
  // Only try to generate dynamic content after button press
  if (isPost && buttonPressed === 1) {
    try {
      // Fetch latest prices
      const priceData = await fetchPagePrices();
      
      // For now, continue using the static image but update button text
      // We can implement dynamic image generation after confirming the basic frame works
      
      return {
        statusCode: 200,
        headers: {"Content-Type": "text/html"},
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${imageUrl}" />
            <meta property="fc:frame:button:1" content="ETH: ${priceData.ethereum.toFixed(4)}" />
            <meta property="fc:frame:button:2" content="OPT: ${priceData.optimism.toFixed(4)}" />
            <meta property="fc:frame:button:3" content="BASE: ${priceData.base.toFixed(4)}" />
            <meta property="fc:frame:button:4" content="OSMO: ${priceData.osmosis.toFixed(4)}" />
            <meta property="fc:frame:post_url" content="${process.env.URL || 'https://pagetokenprices.netlify.app'}/.netlify/functions/frame" />
            <title>PAGE Token Prices</title>
          </head>
          <body>
            <h1>PAGE Token Prices</h1>
          </body>
          </html>
        `
      };
    } catch (error) {
      console.error('Error refreshing prices:', error);
    }
  }
  
  // Default return for initial load or errors
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
        <meta property="fc:frame:button:3" content="Join PAGE Channel" />
        <meta property="fc:frame:button:4" content="View Documentation" />
        <meta property="fc:frame:post_url" content="${process.env.URL || 'https://pagetokenprices.netlify.app'}/.netlify/functions/frame" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content="https://pagedao.org" />
        <meta property="fc:frame:button:3:action" content="link" />
        <meta property="fc:frame:button:3:target" content="https://warpcast.com/~/channel/page" />
        <meta property="fc:frame:button:4:action" content="link" />
        <meta property="fc:frame:button:4:target" content="https://docs.pagedao.org" />
        <title>PAGE Token Prices</title>
      </head>
      <body>
        <h1>PAGE Token Prices</h1>
      </body>
      </html>
    `
  };
};