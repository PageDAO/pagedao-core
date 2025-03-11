const { fetchPagePrices } = require('./utils/tokenServices');
const { PAGE_TOKEN_CONFIG } = require('./utils/tokenConfig');

exports.handler = async function(event) {
  // Check if this is initial load or button interaction
  const isPost = event.httpMethod === 'POST';
  let buttonPressed = null;
  
  // Site base URL
  const host = process.env.URL || 'https://pagetokenprices.netlify.app';
  
  // Default image (your IPFS-hosted static image)
  let imageUrl = "https://pink-quiet-quelea-944.mypinata.cloud/ipfs/bafkreigyddi6zzsf2hkv7im4qtkvhkdvj5dvzs36xzotam7kvv7n6lksmu?pinataGatewayToken=NQ6fEH8plNGyNnOv1CjExntu8JtvIZvzUaX_g3zU12PMtovIWlpcaxnsTJrV29l-";
  
  // Parse POST data if this is a button interaction
  if (isPost && event.body) {
    try {
      const body = JSON.parse(event.body);
      buttonPressed = body.untrustedData?.buttonIndex;
      console.log("Button pressed:", buttonPressed);
      
      // If user clicked "Show Prices"
      if (buttonPressed === 1) {
        // Fetch latest prices
        const priceData = await fetchPagePrices();
        console.log("Fetched prices:", priceData);
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
            
            <!-- Add a visual trading call-to-action -->
            <rect x="100" y="480" width="500" height="60" fill="#0052ff" rx="10" />
            <text x="350" y="522" font-size="32" fill="white" text-anchor="middle">Trade $PAGE on Base via Uniswap</text>
            
            <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
          </svg>
        `;
        
        // Encode SVG to data URI
        const svgBase64 = Buffer.from(svg).toString('base64');
        imageUrl = `data:image/svg+xml;base64,${svgBase64}`;
        
        return {
          statusCode: 200,
          headers: {"Content-Type": "text/html"},
          body: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta property="fc:frame" content="vNext" />
              <meta property="fc:frame:image" content="${imageUrl}" />
              <meta property="fc:frame:button:1" content="Trade Now" />
              <meta property="fc:frame:button:1:action" content="link" />
              <meta property="fc:frame:button:1:target" content="https://app.uniswap.org/#/swap?outputCurrency=0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE&chain=base" />
              <meta property="fc:frame:button:2" content="Refresh Prices" />
              <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
              <title>PAGE Token Prices</title>
            </head>
            <body></body>
            </html>
          `
        };
      }
    } catch (error) {
      console.error('Error processing button press:', error);
    }
  }
  

  const uniswapUrl = "https://app.uniswap.org/#/swap?outputCurrency=0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE&chain=base";
  return {
    statusCode: 200,
    headers: {"Content-Type": "text/html"},
    body: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="${imageUrl}" />
      <meta property="fc:frame:button:1" content="Show Prices" />
      <meta property="fc:frame:button:2" content="Trade on Uniswap" />
      <meta property="fc:frame:button:2:action" content="link" />
      <meta property="fc:frame:button:2:target" content="${uniswapUrl}" />
      <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
      <title>PAGE Token Prices</title>
    </head>
    <body></body>
    </html>
    `
  };}