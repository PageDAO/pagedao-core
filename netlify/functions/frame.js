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
  
  // Parse POST data if this is a button interaction
  if (isPost && event.body) {
    try {
      const body = JSON.parse(event.body);
      buttonPressed = body.untrustedData?.buttonIndex;
      console.log("Button pressed:", buttonPressed);
      
      // If user clicked "Show Prices" (initial screen button 1)
      if (buttonPressed === 1 && !event.queryStringParameters?.state) {
        // Fetch latest prices
        const priceData = await fetchPagePrices();
        console.log("Fetched prices:", priceData);
        
        const svg = `
          <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
            <rect width="1200" height="628" fill="#1e2d3a"/>
            <text x="100" y="100" font-size="48" fill="white" font-weight="bold">$PAGE Token Prices</text>
            <text x="100" y="180" font-size="36" fill="white">Ethereum: $${priceData.ethereum.toFixed(6)}</text>
            <text x="100" y="240" font-size="36" fill="white">Optimism: $${priceData.optimism.toFixed(6)}</text>
            <text x="100" y="300" font-size="36" fill="white">Base: $${priceData.base.toFixed(6)}</text>
            <text x="100" y="360" font-size="36" fill="white">Osmosis: $${priceData.osmosis.toFixed(6)}</text>
            <text x="100" y="440" font-size="40" fill="white" font-weight="bold">Average: $${
              ((priceData.ethereum + priceData.optimism + priceData.base + priceData.osmosis) / 4).toFixed(6)
            }</text>
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
            <meta property="fc:frame:button:1" content="Ethereum Details" />
            <meta property="fc:frame:button:2" content="Optimism Details" />
            <meta property="fc:frame:button:3" content="Base Details" />
            <meta property="fc:frame:button:4" content="Osmosis Details" />
            <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame?state=prices" />
            <title>PAGE Token Prices</title>
          </head>
          <body></body>
          </html>
          `
        };
      }
      
      // Handle chain selection after showing prices
      else if (buttonPressed >= 1 && buttonPressed <= 4 && event.queryStringParameters?.state === "prices") {
        // Fetch latest prices
        const priceData = await fetchPagePrices();
        
        let chain = "";
        let chainName = "";
        let dexUrl = "";
        let tokenConfig = null;
        let price = 0;
        
        switch(buttonPressed) {
          case 1:
            chain = "ethereum";
            chainName = "Ethereum";
            tokenConfig = PAGE_TOKEN_CONFIG.find(config => config.chainId === 1);
            dexUrl = tokenConfig ? tokenConfig.dexUrl : "https://app.uniswap.org/#/swap?outputCurrency=0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e&chain=ethereum";
            price = priceData.ethereum;
            break;
          case 2:
            chain = "optimism";
            chainName = "Optimism"; 
            tokenConfig = PAGE_TOKEN_CONFIG.find(config => config.chainId === 10);
            dexUrl = tokenConfig ? tokenConfig.dexUrl : "https://app.uniswap.org/#/swap?outputCurrency=0xe67E77c47a37795c0ea40A038F7ab3d76492e803&chain=optimism";
            price = priceData.optimism;
            break;
          case 3:
            chain = "base";
            chainName = "Base";
            tokenConfig = PAGE_TOKEN_CONFIG.find(config => config.chainId === 8453);
            dexUrl = tokenConfig ? tokenConfig.dexUrl : "https://app.uniswap.org/#/swap?outputCurrency=0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE&chain=base";
            price = priceData.base;
            break;
          case 4:
            chain = "osmosis";
            chainName = "Osmosis";
            dexUrl = "https://app.osmosis.zone/?from=USDC&to=PAGE";
            price = priceData.osmosis;
            break;
        }
        
        // Get TVL and token amount data
        let tvl = "N/A";
        let pageTokensInPool = "N/A";
        
        try {
          if (chain !== "osmosis") {
            // For EVM chains (Ethereum, Optimism, Base)
            if (tokenConfig) {
              console.log(`Getting pool data for ${chainName}...`);
              const reserves = await getPoolReserves(tokenConfig.lpAddress, tokenConfig, chain);
              console.log(`Reserves for ${chainName}:`, reserves);
              
              // Calculate TVL
              const pageValueInPool = reserves.tokenAAmount * price;
              const ethValue = reserves.tokenBAmount * priceData.ethPrice;
              tvl = `$${(pageValueInPool + ethValue).toLocaleString()}`;
              
              // Format PAGE tokens in pool
              pageTokensInPool = `${reserves.tokenAAmount.toLocaleString()} PAGE`;
              console.log(`TVL for ${chainName}: ${tvl}`);
              console.log(`PAGE in pool for ${chainName}: ${pageTokensInPool}`);
            }
          } else {
            // For Osmosis
            console.log(`Getting pool data for Osmosis...`);
            const osmosisData = await getOsmosisPoolData();
            console.log(`Osmosis data:`, osmosisData);
            
            tvl = `$${osmosisData.tvl.toLocaleString()}`;
            pageTokensInPool = `${osmosisData.pageAmount.toLocaleString()} PAGE`;
            console.log(`TVL for Osmosis: ${tvl}`);
            console.log(`PAGE in pool for Osmosis: ${pageTokensInPool}`);
          }
        } catch (error) {
          console.error(`Error getting pool data for ${chain}:`, error);
        }
        
        const svg = `
          <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
            <rect width="1200" height="628" fill="#1e2d3a"/>
            <text x="100" y="100" font-size="48" fill="white" font-weight="bold">$PAGE on ${chainName}</text>
            <text x="100" y="180" font-size="36" fill="white">Price: $${price.toFixed(6)}</text>
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
            <meta property="fc:frame:button:1" content="Back to Prices" />
            <meta property="fc:frame:button:2" content="Trade on ${chainName}" />
            <meta property="fc:frame:button:2:action" content="link" />
            <meta property="fc:frame:button:2:target" content="${dexUrl}" />
            <meta property="fc:frame:button:3" content="Home" />
            <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame?state=chain" />
            <title>PAGE Token on ${chainName}</title>
          </head>
          <body></body>
          </html>
          `
        };
      }
      
      // Handle "Back to Prices" button from chain details
      else if (buttonPressed === 1 && event.queryStringParameters?.state === "chain") {
        // Fetch latest prices again
        const priceData = await fetchPagePrices();
        
        const svg = `
          <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
            <rect width="1200" height="628" fill="#1e2d3a"/>
            <text x="100" y="100" font-size="48" fill="white" font-weight="bold">$PAGE Token Prices</text>
            <text x="100" y="180" font-size="36" fill="white">Ethereum: $${priceData.ethereum.toFixed(6)}</text>
            <text x="100" y="240" font-size="36" fill="white">Optimism: $${priceData.optimism.toFixed(6)}</text>
            <text x="100" y="300" font-size="36" fill="white">Base: $${priceData.base.toFixed(6)}</text>
            <text x="100" y="360" font-size="36" fill="white">Osmosis: $${priceData.osmosis.toFixed(6)}</text>
            <text x="100" y="440" font-size="40" fill="white" font-weight="bold">Average: $${
              ((priceData.ethereum + priceData.optimism + priceData.base + priceData.osmosis) / 4).toFixed(6)
            }</text>
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
            <meta property="fc:frame:button:1" content="Ethereum Details" />
            <meta property="fc:frame:button:2" content="Optimism Details" />
            <meta property="fc:frame:button:3" content="Base Details" />
            <meta property="fc:frame:button:4" content="Osmosis Details" />
            <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame?state=prices" />
            <title>PAGE Token Prices</title>
          </head>
          <body></body>
          </html>
          `
        };
      }
      
      // Handle "Home" button from chain details
      else if (buttonPressed === 3 && event.queryStringParameters?.state === "chain") {
        // Return to initial screen
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
      
    } catch (error) {
      console.error('Error processing button press:', error);
    }
  }
  
  // Initial frame - this is the home screen with just the "Show Prices" button
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
