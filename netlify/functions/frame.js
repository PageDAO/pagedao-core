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

// More detailed accurate logo SVGs for various chains and PageDAO
const LOGOS = {
  // PageDAO logo (book with yellow elements and bookmark)
  PAGE: `
    <svg x="900" y="40" width="200" height="200" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Book/page body -->
      <path d="M15,10 L75,5 C80,5 85,10 85,15 L85,85 C85,90 80,95 75,95 L15,90 C10,90 5,85 5,80 L5,20 C5,15 10,10 15,10 Z" 
          fill="white" stroke="#000000" stroke-width="2"/>
      
      <!-- Page fold top-right corner -->
      <path d="M75,5 L85,15 L75,15 L75,5 Z" fill="#f0f0f0" stroke="#000000" stroke-width="1.5"/>
      
      <!-- Yellow circles (PAGE logo elements) -->
      <circle cx="45" cy="28" r="15" fill="#F9CC46"/>
      <rect x="30" y="42" width="30" height="6" fill="#F9CC46"/>
      <rect x="30" y="53" width="30" height="6" fill="#F9CC46"/>
      
      <!-- Bookmark -->
      <path d="M45,95 L45,120 L55,110 L65,120 L65,95" fill="#F9CC46" stroke="#000000" stroke-width="1.5"/>
      
      <!-- Spine detail -->
      <path d="M15,10 C12,10 10,12 8,15 L8,85 C10,88 12,90 15,90" fill="none" stroke="#000000" stroke-width="1"/>
    </svg>
  `,
  
  // Ethereum logo (accurate)
  ETHEREUM: `
    <svg x="900" y="40" width="200" height="200" viewBox="0 0 784 1277" xmlns="http://www.w3.org/2000/svg">
      <path fill="#343434" d="m392.07 0-8.57 29.11v844.63l8.57 8.55 392.06-231.75z"/>
      <path fill="#8C8C8C" d="M392.07 0 0 650.54l392.07 231.75V472.33z"/>
      <path fill="#3C3C3B" d="m392.07 956.52-4.83 5.89v300.87l4.83 14.1 392.3-552.49z"/>
      <path fill="#8C8C8C" d="M392.07 1277.38V956.52l-392.07-231.75z"/>
      <path fill="#141414" d="m392.07 882.29 392.06-231.75-392.06-178.21z"/>
      <path fill="#393939" d="m0 650.54 392.07 231.75V472.33z"/>
    </svg>
  `,
  
  // Optimism logo (accurate with OP on red background)
  OPTIMISM: `
    <svg x="900" y="40" width="200" height="200" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#FF0420"/>
      <path d="M30,40 C30,30 38,25 48,25 C58,25 66,30 66,40 C66,50 58,55 48,55 C38,55 30,50 30,40 Z M50,40 C50,35 46,33 42,33 C38,33 34,35 34,40 C34,45 38,47 42,47 C46,47 50,45 50,40 Z" fill="white"/>
      <path d="M55,25 L65,25 L65,55 L55,55 Z" fill="white"/>
    </svg>
  `,
  
  // Base logo
  BASE: `
    <svg x="900" y="40" width="200" height="200" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <circle cx="512" cy="512" r="512" fill="#0052FF"/>
      <path fill="white" d="M512 192c-176.4 0-320 143.6-320 320s143.6 320 320 320 320-143.6 320-320-143.6-320-320-320zm182.4 370.2C694.4 683.8 614.9 768 512 768c-102.9 0-182.4-84.2-182.4-205.8C329.6 440.6 409.1 356 512 356c102.9 0 182.4 84.6 182.4 206.2z"/>
    </svg>
  `,
  
  // Osmosis logo (accurate potion flask)
  OSMOSIS: `
    <svg x="900" y="40" width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradient for flask liquid -->
        <linearGradient id="osmosis-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2D248A;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#7B2AB3;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#E93D82;stop-opacity:1" />
        </linearGradient>
        
        <!-- Gradient for flask glass -->
        <linearGradient id="flask-glass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#9467D0;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#6C38A3;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Flask outline -->
      <circle cx="100" cy="100" r="85" stroke="#5E2D9A" stroke-width="8" fill="url(#flask-glass)" />
      
      <!-- Liquid inside flask -->
      <path d="M30,100 C30,120 40,150 100,150 C160,150 170,120 170,100 C170,80 160,50 100,50 C40,50 30,80 30,100 Z" 
          fill="url(#osmosis-gradient)" />
      
      <!-- Flask cap -->
      <path d="M125,15 C125,5 75,5 75,15 C75,25 85,40 85,40 L115,40 C115,40 125,25 125,15 Z" 
          fill="url(#flask-glass)" stroke="#5E2D9A" stroke-width="5" />
      
      <!-- Highlights/bubbles -->
      <circle cx="140" cy="60" r="15" fill="white" opacity="0.4" />
      <circle cx="160" cy="90" r="8" fill="white" opacity="0.3" />
      
      <!-- Small bubbles in liquid -->
      <circle cx="60" cy="130" r="5" fill="white" opacity="0.3" />
      <circle cx="85" cy="140" r="3" fill="white" opacity="0.25" />
      <circle cx="110" cy="135" r="4" fill="white" opacity="0.3" />
      <circle cx="130" cy="125" r="6" fill="white" opacity="0.25" />
      <circle cx="70" cy="115" r="4" fill="white" opacity="0.2" />
    </svg>
  `
};

// Helper function to create overview SVG with improved visuals and PageDAO logo
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
      
      <!-- PAGE logo -->
      ${LOGOS.PAGE}
      
      <!-- Footer with timestamp -->
      <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
      
      <!-- PageDAO branding -->
      <text x="1050" y="580" font-size="24" font-weight="bold" fill="#aaaaaa">PageDAO</text>
    </svg>
  `;
}

// Function to create chain-specific SVG with improved visuals and chain logo
function createChainDetailSvg(chainName, price, tvl) {
  // Select the appropriate logo based on chain name
  let logo = LOGOS.PAGE;
  if (chainName.toUpperCase() === 'ETHEREUM') logo = LOGOS.ETHEREUM;
  else if (chainName.toUpperCase() === 'OPTIMISM') logo = LOGOS.OPTIMISM;
  else if (chainName.toUpperCase() === 'BASE') logo = LOGOS.BASE;
  else if (chainName.toUpperCase() === 'OSMOSIS') logo = LOGOS.OSMOSIS;

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
      
      <!-- Chain-specific logo -->
      ${logo}
      
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
      
      <!-- Modified PAGE logo for error state (book with red elements) -->
      <svg x="920" y="450" width="120" height="120" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <!-- Book/page body -->
        <path d="M15,10 L75,5 C80,5 85,10 85,15 L85,85 C85,90 80,95 75,95 L15,90 C10,90 5,85 5,80 L5,20 C5,15 10,10 15,10 Z" 
            fill="#3c1212" stroke="#ff6b6b" stroke-width="2"/>
        
        <!-- Page fold top-right corner -->
        <path d="M75,5 L85,15 L75,15 L75,5 Z" fill="#4a1818" stroke="#ff6b6b" stroke-width="1.5"/>
        
        <!-- Red elements (PAGE logo elements) -->
        <circle cx="45" cy="28" r="15" fill="#ff6b6b"/>
        <rect x="30" y="42" width="30" height="6" fill="#ff6b6b"/>
        <rect x="30" y="53" width="30" height="6" fill="#ff6b6b"/>
        
        <!-- Bookmark -->
        <path d="M45,95 L45,120 L55,110 L65,120 L65,95" fill="#ff6b6b" stroke="#ff6b6b" stroke-width="1.5"/>
      </svg>
      
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
