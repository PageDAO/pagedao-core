const { fetchPagePrices, getPoolReserves, fetchOsmosisTVL } = require('./utils/tokenServices');
const { PAGE_TOKEN_CONFIG } = require('./utils/tokenConfig');

// Helper function to check if user is on a chain-specific view
function isUserOnChainView(body) {
  // If we have a state parameter or previous url with "Back to Overview" button, 
  // the user is on a chain view
  return body.untrustedData?.state && 
         body.untrustedData.state.includes('chain') ||
         body.untrustedData?.url && 
         body.untrustedData.url.includes('Back%20to%20Overview');
}

// Helper function to check if this is the initial screen button press
function isInitialButtonPress(body) {
  return body.untrustedData?.url && 
         !body.untrustedData.url.includes('Back%20to%20Overview') && 
         !body.untrustedData.state;
}

// Helper function to create overview SVG with improved visuals
function createOverviewSvg(avgPrice, marketCap, fdv, circulatingSupply, totalSupply) {
  return `
    <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
      <!-- Background with simple color -->
      <rect width="1200" height="628" fill="#1e2d3a"/>
      
      <!-- Main title -->
      <text x="100" y="110" font-size="64" fill="white" font-weight="bold">$PAGE Token Metrics</text>
      
      <!-- Key metrics section -->
      <text x="100" y="200" font-size="48" fill="white">Average Price: $${avgPrice.toFixed(6)}</text>
      <text x="100" y="280" font-size="48" fill="white">Market Cap: $${(marketCap).toLocaleString()}</text>
      <text x="100" y="360" font-size="48" fill="white">Fully Diluted Value: $${(fdv).toLocaleString()}</text>
      
      <!-- Supply information -->
      <text x="100" y="440" font-size="36" fill="#dddddd">Circulating Supply: ${circulatingSupply.toLocaleString()} PAGE</text>
      <text x="100" y="500" font-size="36" fill="#dddddd">Total Supply: ${totalSupply.toLocaleString()} PAGE</text>
      
      <!-- Footer with timestamp -->
      <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
    </svg>
  `;
}

// Function to create chain-specific SVG
function createChainDetailSvg(chainName, price, tvl) {
  return `
    <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="1200" height="628" fill="#1e2d3a"/>
      
      <!-- Title -->
      <text x="100" y="120" font-size="64" fill="white" font-weight="bold">$PAGE on ${chainName}</text>
      
      <!-- Price -->
      <text x="100" y="220" font-size="54" fill="white">Price: $${price.toFixed(6)}</text>
      
      <!-- TVL -->
      <text x="100" y="320" font-size="54" fill="white">TVL: ${tvl}</text>
      
      <!-- Chain label -->
      <rect x="900" y="80" width="200" height="80" rx="10" fill="#4dabf7"/>
      <text x="1000" y="130" font-size="36" text-anchor="middle" fill="white" font-weight="bold">${chainName}</text>
      
      <!-- Footer with timestamp -->
      <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
    </svg>
  `;
}

// Error SVG with improved visuals
function createErrorSvg(errorMessage) {
  return `
    <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="628" fill="#5c1e1e"/>
      <text x="100" y="120" font-size="64" fill="white" font-weight="bold">Error Fetching $PAGE Prices</text>
      <text x="100" y="220" font-size="48" fill="#eeeeee">Please try again later</text>
      <text x="100" y="320" font-size="32" fill="#dddddd">${errorMessage || 'Connection error'}</text>
      
      <!-- Warning icon -->
      <circle cx="1000" cy="120" r="70" fill="#5c1e1e" stroke="#ff6b6b" stroke-width="3"/>
      <text x="1000" y="140" font-size="80" text-anchor="middle" fill="#ff6b6b">!</text>
      
      <!-- Footer -->
      <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
    </svg>
  `;
}

exports.handler = async function(event) {
  try {
    // Check if this is initial load or button interaction
    const isPost = event.httpMethod === 'POST';
    let buttonPressed = null;
    
    // Site base URL
    const host = process.env.URL || 'https://pagetokenprices.netlify.app';
    
    // Default image (IPFS-hosted static image)
    let imageUrl = "https://pink-quiet-quelea-944.mypinata.cloud/ipfs/bafkreigyddi6zzsf2hkv7im4qtkvhkdvj5dvzs36xzotam7kvv7n6lksmu?pinataGatewayToken=NQ6fEH8plNGyNnOv1CjExntu8JtvIZvzUaX_g3zU12PMtovIWlpcaxnsTJrV29l-";
    
    // Circulation and total supply
    const CIRCULATING_SUPPLY = 42500000;
    const TOTAL_SUPPLY = 100000000;
    
    // Parse POST data if this is a button interaction
    if (isPost && event.body) {
      try {
        const body = JSON.parse(event.body);
        buttonPressed = body.untrustedData?.buttonIndex;
        console.log("Button pressed:", buttonPressed);
        
        // Fetch latest prices for all calculations
        const priceData = await fetchPagePrices();
        console.log("Fetched prices:", priceData);
        
        // Calculate average price
        const avgPrice = (priceData.ethereum + priceData.optimism + priceData.base + priceData.osmosis) / 4;
        
        // Calculate market cap and FDV based on average price
        const marketCap = avgPrice * CIRCULATING_SUPPLY;
        const fdv = avgPrice * TOTAL_SUPPLY;

        // Handle "Back to Overview" button from a chain-specific view
        if (buttonPressed === 1 && isUserOnChainView(body)) {
          // User pressed "Back to Overview" when viewing a chain
          const svg = createOverviewSvg(avgPrice, marketCap, fdv, CIRCULATING_SUPPLY, TOTAL_SUPPLY);
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
              <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
              <meta property="fc:frame:state" content="overview" />
              <title>PAGE Token Metrics</title>
            </head>
            <body></body>
            </html>
            `
          };
        }
        
        // Handle initial "Show Prices" button press
        else if (buttonPressed === 1 && isInitialButtonPress(body)) {
          const svg = createOverviewSvg(avgPrice, marketCap, fdv, CIRCULATING_SUPPLY, TOTAL_SUPPLY);
          
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
              <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
              <meta property="fc:frame:state" content="overview" />
              <title>PAGE Token Metrics</title>
            </head>
            <body></body>
            </html>
            `
          };
        }
        
        // Handle chain-specific button presses from the overview screen
        else if ([1, 2, 3, 4].includes(buttonPressed) && !isUserOnChainView(body)) {
          let chain = "ethereum";
          let price = 0;
          let dexUrl = "";
          let chainName = "";
          
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
          }
          
          // Get pool reserves data if available (for TVL)
          let tvl = "N/A";
          try {
            if (chain === "osmosis") {
              // For Osmosis, use our dedicated TVL calculation
              if (priceData.osmosisTVL) {
                tvl = `$${priceData.osmosisTVL.toLocaleString()}`;
              } else {
                // If not in cache, fetch it directly
                const osmosisTVL = await fetchOsmosisTVL();
                tvl = `$${osmosisTVL.toLocaleString()}`;
              }
            } else {
              // For EVM chains, use existing calculation
              const tokenConfig = PAGE_TOKEN_CONFIG.find(config => 
                (chain === "ethereum" && config.chainId === 1) ||
                (chain === "optimism" && config.chainId === 10) ||
                (chain === "base" && config.chainId === 8453)
              );
              
              if (tokenConfig) {
                const reserves = await getPoolReserves(tokenConfig.lpAddress, tokenConfig, chain);
                const pageValueInPool = reserves.tokenAAmount * price;
                const ethValue = reserves.tokenBAmount * priceData.ethPrice;
                tvl = `$${(pageValueInPool + ethValue).toLocaleString()}`;
              }
            }
          } catch (error) {
            console.error(`Error getting TVL for ${chain}:`, error);
            tvl = "Error calculating TVL";
          }
          
          // Use the enhanced chain detail SVG
          const svg = createChainDetailSvg(chainName, price, tvl);
          
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
              <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
              <meta property="fc:frame:state" content="chain_${chain}" />
              <title>PAGE Token on ${chainName}</title>
            </head>
            <body></body>
            </html>
            `
          };
        }
      } catch (error) {
        console.error('Error processing button press:', error);
        // Generate error SVG for button press errors
        const svg = createErrorSvg(error.message);
        
        // Encode SVG to data URI
        const svgBase64 = Buffer.from(svg).toString('base64');
        imageUrl = `data:image/svg+xml;base64,${svgBase64}`;
      }
    }
    
    // Initial frame or error recovery - with the three original buttons
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
        <meta property="fc:frame:button:2" content="Visit PageDAO.org" />
        <meta property="fc:frame:button:3" content="Join PAGE Channel" />
        <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content="https://pagedao.org" />
        <meta property="fc:frame:button:3:action" content="link" />
        <meta property="fc:frame:button:3:target" content="https://warpcast.com/~/channel/page" />
        <title>PAGE Token Metrics</title>
      </head>
      <body></body>
      </html>
      `
    };
  } catch (error) {
    console.error('Unhandled error in frame handler:', error);
    
    // Generate error SVG for catastrophic errors
    const errorSvg = createErrorSvg("Service Temporarily Unavailable");
    
    // Get host for error recovery
    const host = process.env.URL || 'https://pagetokenprices.netlify.app';
    
    // Encode SVG to data URI
    const svgBase64 = Buffer.from(errorSvg).toString('base64');
    const errorImageUrl = `data:image/svg+xml;base64,${svgBase64}`;
    
    return {
      statusCode: 200, // Still return 200 to show the error frame
      headers: {"Content-Type": "text/html"},
      body: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${errorImageUrl}" />
        <meta property="fc:frame:button:1" content="Try Again" />
        <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
        <title>PAGE Token Metrics Error</title>
      </head>
      <body></body>
      </html>
      `
    };
  }
}
