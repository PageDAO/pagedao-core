// Helper function to create overview SVG with improved visuals and PageDAO logo
function createOverviewSvg(avgPrice, marketCap, fdv, circulatingSupply, totalSupply) {
  // Use the base URL for accessing images
  const host = process.env.URL || 'https://pagetokenprices.netlify.app';
  
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
      
      <!-- PAGE logo - Using image -->
      <image x="900" y="40" width="200" height="200" href="${host}/pagedaologo.png" />
      
      <!-- Footer with timestamp -->
      <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
      
      <!-- PageDAO branding -->
      <text x="1050" y="580" font-size="24" font-weight="bold" fill="#aaaaaa">PageDAO</text>
    </svg>
  `;
}

// Function to create chain-specific SVG with improved visuals and chain logo
function createChainDetailSvg(chainName, price, tvl) {
  // Use the base URL for accessing images
  const host = process.env.URL || 'https://pagetokenprices.netlify.app';
  
  // Select the appropriate logo image based on chain name
  let logoPath = '/pagedaologo.png';
  if (chainName.toUpperCase() === 'ETHEREUM') {
    // Using Ethereum SVG since it's not in the image list
    const ethLogo = `
      <svg x="900" y="40" width="200" height="200" viewBox="0 0 784 1277" xmlns="http://www.w3.org/2000/svg">
        <path fill="#343434" d="m392.07 0-8.57 29.11v844.63l8.57 8.55 392.06-231.75z"/>
        <path fill="#8C8C8C" d="M392.07 0 0 650.54l392.07 231.75V472.33z"/>
        <path fill="#3C3C3B" d="m392.07 956.52-4.83 5.89v300.87l4.83 14.1 392.3-552.49z"/>
        <path fill="#8C8C8C" d="M392.07 1277.38V956.52l-392.07-231.75z"/>
        <path fill="#141414" d="m392.07 882.29 392.06-231.75-392.06-178.21z"/>
        <path fill="#393939" d="m0 650.54 392.07 231.75V472.33z"/>
      </svg>
    `;
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
        
        <!-- Ethereum logo - Using SVG -->
        ${ethLogo}
        
        <!-- Footer with timestamp -->
        <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
        
        <!-- PageDAO branding -->
        <text x="1050" y="580" font-size="24" font-weight="bold" fill="#aaaaaa">PageDAO</text>
      </svg>
    `;
  }
  else if (chainName.toUpperCase() === 'OPTIMISM') logoPath = '/optimismlogo.jpeg';
  else if (chainName.toUpperCase() === 'BASE') logoPath = '/base logo.jpeg';
  else if (chainName.toUpperCase() === 'OSMOSIS') logoPath = '/osmosis-osmo-logo.png';

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
      
      <!-- Chain-specific logo - Using image -->
      <image x="900" y="40" width="200" height="200" href="${host}${logoPath}" />
      
      <!-- Footer with timestamp -->
      <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
      
      <!-- PageDAO branding -->
      <text x="1050" y="580" font-size="24" font-weight="bold" fill="#aaaaaa">PageDAO</text>
    </svg>
  `;
}

// Error SVG with improved visuals
function createErrorSvg(errorMessage) {
  // Use the base URL for accessing images
  const host = process.env.URL || 'https://pagetokenprices.netlify.app';
  
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
      
      <!-- PAGE logo (small, using image with opacity) -->
      <image x="920" y="450" width="120" height="120" href="${host}/pagedaologo.png" opacity="0.5" />
      
      <!-- Footer -->
      <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
    </svg>
  `;
}