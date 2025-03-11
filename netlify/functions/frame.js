const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  // Check if this is initial load or button interaction
  const isPost = event.httpMethod === 'POST';
  let buttonPressed = null;
  
  // Site base URL
  const host = process.env.URL || 'https://pagetokenprices.netlify.app';
  
  // Default image (your IPFS-hosted static image)
  let imageUrl = "https://pink-quiet-quelea-944.mypinata.cloud/ipfs/bafkreigyddi6zzsf2hkv7im4qtkvhkdvj5dvzs36xzotam7kvv7n6lksmu?pinataGatewayToken=NQ6fEH8plNGyNnOv1CjExntu8JtvIZvzUaX_g3zU12PMtovIWlpcaxnsTJrV29l-";
  
  console.log("Request method:", event.httpMethod);
  console.log("Query params:", event.queryStringParameters);
  
  // Parse POST data if this is a button interaction
  if (isPost && event.body) {
    try {
      const body = JSON.parse(event.body);
      buttonPressed = body.untrustedData?.buttonIndex;
      console.log("Button pressed:", buttonPressed);
      
      // INITIAL SCREEN BUTTON - "Show Prices"
      if (buttonPressed === 1 && !event.queryStringParameters?.view) {
        // Fetch latest prices
        const priceData = await fetchPagePrices();
        console.log("Fetched prices:", priceData);
        
        const avgPrice = ((priceData.ethereum + priceData.optimism + priceData.base + priceData.osmosis) / 4);
        
        const svg = `
          <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
            <rect width="1200" height="628" fill="#1e2d3a"/>
            <text x="100" y="100" font-size="48" fill="white" font-weight="bold">$PAGE Token Prices</text>
            <text x="100" y="180" font-size="36" fill="white">Ethereum: $${priceData.ethereum.toFixed(6)}</text>
            <text x="100" y="240" font-size="36" fill="white">Optimism: $${priceData.optimism.toFixed(6)}</text>
            <text x="100" y="300" font-size="36" fill="white">Base: $${priceData.base.toFixed(6)}</text>
            <text x="100" y="360" font-size="36" fill="white">Osmosis: $${priceData.osmosis.toFixed(6)}</text>
            <text x="100" y="440" font-size="40" fill="white" font-weight="bold">Average: $${avgPrice.toFixed(6)}</text>
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
            <meta property="fc:frame:button:1" content="ETH" />
            <meta property="fc:frame:button:2" content="Optimism" />
            <meta property="fc:frame:button:3" content="Base" />
            <meta property="fc:frame:button:4" content="Osmosis" />
            <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame?view=prices" />
            <title>PAGE Token Prices</title>
          </head>
          <body></body>
          </html>
          `
        };
      }
      
      // PRICES VIEW - Chain selection
      else if (event.queryStringParameters?.view === "prices") {
        const priceData = await fetchPagePrices();
        
        let chainId, chainName, dexUrl, price;
        
        // Map button clicks to chains
        switch(buttonPressed) {
          case 1: // ETH
            chainId = "ethereum";
            chainName = "Ethereum";
            dexUrl = "https://app.uniswap.org/#/swap?outputCurrency=0x3F382DbD960E3a9bbCeaE22651E88158d2791550&chain=ethereum";
            price = priceData.ethereum;
            break;
          case 2: // Optimism
            chainId = "optimism";
            chainName = "Optimism";
            dexUrl = "https://app.uniswap.org/#/swap?outputCurrency=0x95aE5f69A02999cB8b18Fc47f54ca0d99Ae58227&chain=optimism";
            price = priceData.optimism;
            break;
          case 3: // Base
            chainId = "base";
            chainName = "Base";
            dexUrl = "https://app.uniswap.org/#/swap?outputCurrency=0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE&chain=base";
            price = priceData.base;
            break;
          case 4: // Osmosis
            chainId = "osmosis";
            chainName = "Osmosis";
            dexUrl = "https://app.osmosis.zone/?from=USDC&to=PAGE";
            price = priceData.osmosis;
            break;
          default:
            // Invalid button - show home screen
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
                <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
                <title>PAGE Token Prices</title>
              </head>
              <body></body>
              </html>
              `
            };
        }
        
        // Simple chain-specific view for now
        const svg = `
          <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
            <rect width="1200" height="628" fill="#1e2d3a"/>
            <text x="100" y="100" font-size="48" fill="white" font-weight="bold">$PAGE on ${chainName}</text>
            <text x="100" y="180" font-size="36" fill="white">Price: $${price.toFixed(6)}</text>
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
            <meta property="fc:frame:button:1" content="Back" />
            <meta property="fc:frame:button:2" content="Trade on ${chainName}" />
            <meta property="fc:frame:button:2:action" content="link" />
            <meta property="fc:frame:button:2:target" content="${dexUrl}" />
            <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame?view=chain" />
            <title>PAGE Token on ${chainName}</title>
          </head>
          <body></body>
          </html>
          `
        };
      }
      
      // CHAIN VIEW - Back button
      else if (event.queryStringParameters?.view === "chain" && buttonPressed === 1) {
        // User clicked "Back" from chain view
        const priceData = await fetchPagePrices();
        
        const avgPrice = ((priceData.ethereum + priceData.optimism + priceData.base + priceData.osmosis) / 4);
        
        const svg = `
          <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
            <rect width="1200" height="628" fill="#1e2d3a"/>
            <text x="100" y="100" font-size="48" fill="white" font-weight="bold">$PAGE Token Prices</text>
            <text x="100" y="180" font-size="36" fill="white">Ethereum: $${priceData.ethereum.toFixed(6)}</text>
            <text x="100" y="240" font-size="36" fill="white">Optimism: $${priceData.optimism.toFixed(6)}</text>
            <text x="100" y="300" font-size="36" fill="white">Base: $${priceData.base.toFixed(6)}</text>
            <text x="100" y="360" font-size="36" fill="white">Osmosis: $${priceData.osmosis.toFixed(6)}</text>
            <text x="100" y="440" font-size="40" fill="white" font-weight="bold">Average: $${avgPrice.toFixed(6)}</text>
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
            <meta property="fc:frame:button:1" content="ETH" />
            <meta property="fc:frame:button:2" content="Optimism" />
            <meta property="fc:frame:button:3" content="Base" />
            <meta property="fc:frame:button:4" content="Osmosis" />
            <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame?view=prices" />
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
  
  // Initial frame - this is the home screen with just the "Show Prices" button
  console.log("Serving initial frame");
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
      <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
      <title>PAGE Token Prices</title>
    </head>
    <body></body>
    </html>
    `
  };
}
