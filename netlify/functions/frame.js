const { fetchPagePrices, getPoolReserves, getOsmosisPoolData } = require('./utils/tokenServices');
const { PAGE_TOKEN_CONFIG } = require('./utils/tokenConfig');

exports.handler = async function(event) {
  // Check if this is initial load or button interaction
  const isPost = event.httpMethod === 'POST';
  let buttonPressed = null;
  
  // Site base URL
  const host = process.env.URL || 'https://pagetokenprices.netlify.app';
  
  // Default image (your IPFS-hosted static image)
  let imageUrl = "https://pink-quiet-quelea-944.mypinata.cloud/ipfs/bafkreigyddi6zzsf2hkv7im4qtkvhkdvj5dvzs36xzotam7kvv7n6lksmu?pinataGatewayToken=NQ6fEH8plNGyNnOv1CjExntu8JtvIZvzUaX_g3zU12PMtovIWlpcaxnsTJrV29l-";
  
  // Circulation and total supply
  const CIRCULATING_SUPPLY = 42500000;
  const TOTAL_SUPPLY = 100000000;
  
  // Get the current state from the URL if present
  const url = new URL(event.rawUrl || `${host}${event.path}`);
  const currentState = url.searchParams.get('state') || 'initial';
  
  // Parse POST data if this is a button interaction
  if (isPost && event.body) {
    try {
      const body = JSON.parse(event.body);
      buttonPressed = body.untrustedData?.buttonIndex;
      console.log("Button pressed:", buttonPressed, "Current state:", currentState);
      
      // Fetch latest prices for all calculations
      const priceData = await fetchPagePrices();
      console.log("Fetched prices:", priceData);
      
      // Calculate average price
      const avgPrice = (priceData.ethereum + priceData.optimism + priceData.base + priceData.osmosis) / 4;
      
      // Calculate market cap and FDV based on average price
      const marketCap = avgPrice * CIRCULATING_SUPPLY;
      const fdv = avgPrice * TOTAL_SUPPLY;
      
      // Handle button press based on current state
      
      // INITIAL STATE
      if (currentState === 'initial' && buttonPressed === 1) {
        // User clicked "Show Overview" from initial state
        const svg = `
          <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
            <rect width="1200" height="628" fill="#1e2d3a"/>
            <text x="100" y="100" font-size="48" fill="white" font-weight="bold">$PAGE Token Metrics</text>
            <text x="100" y="180" font-size="36" fill="white">Average Price: ${avgPrice.toFixed(6)}</text>
            <text x="100" y="250" font-size="36" fill="white">Market Cap: ${(marketCap).toLocaleString()}</text>
            <text x="100" y="320" font-size="36" fill="white">Fully Diluted Value: ${(fdv).toLocaleString()}</text>
            <text x="100" y="400" font-size="28" fill="#aaaaaa">Circulating Supply: ${CIRCULATING_SUPPLY.toLocaleString()} PAGE</text>
            <text x="100" y="450" font-size="28" fill="#aaaaaa">Total Supply: ${TOTAL_SUPPLY.toLocaleString()} PAGE</text>
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
            <meta property="fc:frame:button:1" content="Ethereum" />
            <meta property="fc:frame:button:2" content="Optimism" />
            <meta property="fc:frame:button:3" content="Base" />
            <meta property="fc:frame:button:4" content="Osmosis" />
            <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame?state=overview" />
            <title>PAGE Token Metrics</title>
          </head>
          <body></body>
          </html>
          `
        };
      }
      
      // OVERVIEW STATE - Handle chain selection
      else if (currentState === 'overview') {
        let chain = "";
        let price = 0;
        let dexUrl = "";
        let chainName = "";
        
        // Map button to chain
        switch(buttonPressed) {
          case 1: // Ethereum
            chain = "ethereum";
            price = priceData.ethereum;
            chainName = "Ethereum";
            dexUrl = PAGE_TOKEN_CONFIG[0].dexUrl;
            break;
          case 2: // Optimism
            chain = "optimism";
            price = priceData.optimism;
            chainName = "Optimism";
            dexUrl = PAGE_TOKEN_CONFIG[1].dexUrl;
            break;
          case 3: // Base
            chain = "base";
            price = priceData.base;
            chainName = "Base";
            dexUrl = PAGE_TOKEN_CONFIG[2].dexUrl;
            break;
          case 4: // Osmosis
            chain = "osmosis";
            price = priceData.osmosis;
            chainName = "Osmosis";
            dexUrl = "https://app.osmosis.zone/?from=USDC&to=PAGE";
            break;
          default:
            // Invalid button - show overview again
            return {
              statusCode: 302,
              headers: {"Location": `${host}/.netlify/functions/frame?state=initial`},
              body: ""
            };
        }
        
        if (!chain) return;
        
        // Get pool reserves data if available (for TVL and token count)
        let tvl = "N/A";
        let pageTokensInPool = "N/A";
        
        try {
          if (chain !== "osmosis") {
            const tokenConfig = PAGE_TOKEN_CONFIG.find(config => 
              (chain === "ethereum" && config.chainId === 1) ||
              (chain === "optimism" && config.chainId === 10) ||
              (chain === "base" && config.chainId === 8453)
            );
            
            if (tokenConfig) {
              const reserves = await getPoolReserves(tokenConfig.lpAddress, tokenConfig, chain);
              
              // Calculate TVL
              const pageValueInPool = reserves.tokenAAmount * price;
              const ethValue = reserves.tokenBAmount * priceData.ethPrice;
              tvl = `${(pageValueInPool + ethValue).toLocaleString()}`;
              
              // Get PAGE tokens in pool
              pageTokensInPool = `${reserves.tokenAAmount.toLocaleString()} PAGE`;
            }
          } else {
            // For Osmosis, use our new function
            const osmosisData = await getOsmosisPoolData();
            tvl = `${osmosisData.tvl.toLocaleString()}`;
            pageTokensInPool = `${osmosisData.pageAmount.toLocaleString()} PAGE`;
          }
        } catch (error) {
          console.error(`Error getting pool data for ${chain}:`, error);
        }
        
        const svg = `
          <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
            <rect width="1200" height="628" fill="#1e2d3a"/>
            <text x="100" y="100" font-size="48" fill="white" font-weight="bold">$PAGE on ${chainName}</text>
            <text x="100" y="180" font-size="36" fill="white">Price: ${price.toFixed(6)}</text>
            <text x="100" y="240" font-size="36" fill="white">Total Value Locked: ${tvl}</text>
            <text x="100" y="300" font-size="36" fill="white">$PAGE in Pool: ${pageTokensInPool}</text>
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
            <meta property="fc:frame:button:1" content="Back to Overview" />
            <meta property="fc:frame:button:2" content="Trade on ${chainName}" />
            <meta property="fc:frame:button:2:action" content="link" />
            <meta property="fc:frame:button:2:target" content="${dexUrl}" />
            <meta property="fc:frame:button:3" content="Return Home" />
            <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame?state=overview" />
            <title>PAGE Token on ${chainName}</title>
          </head>
          <body></body>
          </html>
          `
        };
      }
            // CHAIN-SPECIFIC STATE - Button 1 returns to overview
      else if (currentState === 'chain' && buttonPressed === 1) {
        // Redirect back to overview
        return {
          statusCode: 302,
          headers: {"Location": `${host}/.netlify/functions/frame?state=overview`},
          body: ""
        };
      }
      // CHAIN-SPECIFIC STATE - Handle "Return Home" button
      else if (currentState === 'overview' && buttonPressed === 3) {
        // Redirect all the way back to the home/initial screen
        return {
          statusCode: 302,
          headers: {"Location": `${host}/.netlify/functions/frame`},
          body: ""
        };
      }
      
    } catch (error) {
      console.error('Error processing button press:', error);
    }
  }
  
  // Initial frame
  return {
    statusCode: 200,
    headers: {"Content-Type": "text/html"},
    body: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="${imageUrl}" />
      <meta property="fc:frame:button:1" content="Show Overview" />
      <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame?state=initial" />
      <title>PAGE Token Metrics</title>
    </head>
    <body></body>
    </html>
    `
  };
}