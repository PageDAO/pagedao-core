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
      <!-- Background with subtle gradient -->
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#1e2d3a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#162330;stop-opacity:1" />
        </linearGradient>
        
        <!-- Title gradient -->
        <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#aaccff;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <rect width="1200" height="628" fill="url(#bgGradient)"/>
      
      <!-- Main title - Bigger and with gradient -->
      <text x="100" y="110" font-size="64" fill="url(#titleGradient)" font-weight="bold">$PAGE Token Metrics</text>
      
      <!-- Key metrics section - Larger fonts -->
      <text x="100" y="200" font-size="48" fill="white">Average Price: <tspan font-weight="bold" fill="#4dabf7">$${avgPrice.toFixed(6)}</tspan></text>
      
      <text x="100" y="280" font-size="48" fill="white">Market Cap: <tspan font-weight="bold" fill="#4dabf7">$${(marketCap).toLocaleString()}</tspan></text>
      
      <text x="100" y="360" font-size="48" fill="white">Fully Diluted Value: <tspan font-weight="bold" fill="#4dabf7">$${(fdv).toLocaleString()}</tspan></text>
      
      <!-- Supply information - Still important but visually secondary -->
      <text x="100" y="440" font-size="36" fill="#dddddd">Circulating Supply: <tspan fill="#a5d8ff">${circulatingSupply.toLocaleString()} PAGE</tspan></text>
      
      <text x="100" y="500" font-size="36" fill="#dddddd">Total Supply: <tspan fill="#a5d8ff">${totalSupply.toLocaleString()} PAGE</tspan></text>
      
      <!-- PAGE token icon/badge -->
      <circle cx="1000" cy="120" r="70" fill="#2a3f55" stroke="#4dabf7" stroke-width="3"/>
      <text x="1000" y="140" font-size="50" text-anchor="middle" fill="white">PAGE</text>
      
      <!-- Footer with timestamp -->
      <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
      
      <!-- PageDAO branding -->
      <text x="1050" y="580" font-size="24" font-weight="bold" fill="#aaaaaa">PageDAO</text>
    </svg>
  `;
}

// Function to create chain-specific SVG with improved visuals
function createChainDetailSvg(chainName, price, tvl) {
  return `
    <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#1e2d3a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#162330;stop-opacity:1" />
        </linearGradient>
        
        <!-- Title gradient -->
        <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#aaccff;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <rect width="1200" height="628" fill="url(#bgGradient)"/>
      
      <!-- Title - Bigger and with subtle gradient -->
      <text x="100" y="120" font-size="64" font-weight="bold" fill="url(#titleGradient)">$PAGE on ${chainName}</text>
      
      <!-- Price - Larger and more prominent -->
      <text x="100" y="220" font-size="54" fill="white">Price: <tspan font-weight="bold" fill="#4dabf7">$${price.toFixed(6)}</tspan></text>
      
      <!-- TVL - Larger with better contrast -->
      <text x="100" y="320" font-size="54" fill="white">TVL: <tspan font-weight="bold" fill="#4dabf7">${tvl}</tspan></text>
      
      <!-- Chain-specific icon/badge -->
      <circle cx="1000" cy="120" r="70" fill="#2a3f55" stroke="#4dabf7" stroke-width="3"/>
      <text x="1000" y="140" font-size="50" text-anchor="middle" fill="white">${chainName.substring(0, 3).toUpperCase()}</text>
      
      <!-- Footer with timestamp -->
      <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
      
      <!-- PageDAO branding -->
      <text x="1050" y="580" font-size="24" font-weight="bold" fill="#aaaaaa">PageDAO</text>
    </svg>
  `;
}

// Error SVG with improved visuals
function createErrorSvg(errorMessage) {
  return `
    <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="errorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#5c1e1e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3c1212;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <rect width="1200" height="628" fill="url(#errorGradient)"/>
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
        // Generate error SVG for button press errors using the enhanced error SVG
        const svg = createErrorSvg(error.message);
        
        // Encode SVG to data URI
        const svgBase64 = Buffer.from(svg).toString('base64');
        imageUrl = `data:image/svg+xml;base64,${svgBase64}`;
      }
    }
    
    // Initial frame or error recovery - FIXED to maintain the three original buttons
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
    
    // Generate error SVG for catastrophic errors using the enhanced error SVG
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
