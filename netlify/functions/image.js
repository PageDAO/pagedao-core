const { createCanvas } = require('canvas');
const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  try {
    // Get the selected chain from query parameters
    const { chain = 'all', error } = event.queryStringParameters || {};
    
    // Fetch latest prices directly from the service
    const priceData = await fetchPagePrices();
    
    // Create canvas with proper aspect ratio for Farcaster (1.91:1)
    const width = 1200;
    const height = 628;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Fill background - use a simple solid color
    ctx.fillStyle = '#1e2d3a';
    ctx.fillRect(0, 0, width, height);
    
    // Simple header text with system font
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('$PAGE Token Prices', 60, 80);
    
    // Draw timestamp
    const timestamp = new Date().toLocaleString();
    ctx.font = '24px Arial';
    ctx.fillText(`Last Updated: ${timestamp}`, 60, height - 40);
    
    // Determine which prices to show
    if (chain === 'all') {
      // Show all chains
      drawAllChainPrices(ctx, priceData);
    } else {
      // Show specific chain
      drawSingleChainPrice(ctx, chain, priceData[chain]);
    }
    
    // Convert to PNG
    const buffer = canvas.toBuffer('image/png');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error generating image:', error);
    
    // Create a simple error image
    const width = 1200;
    const height = 628;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#5c1e1e';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('Error Fetching $PAGE Prices', 60, 80);
    
    const buffer = canvas.toBuffer('image/png');
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  }
};

// Helper function to draw all chain prices - simplified version
function drawAllChainPrices(ctx, priceData) {
  const chains = ['ethereum', 'optimism', 'base', 'osmosis'];
  const chainLabels = {
    ethereum: 'Ethereum',
    optimism: 'Optimism',
    base: 'Base',
    osmosis: 'Osmosis'
  };
  
  let y = 160;
  const spacing = 80;
  
  chains.forEach(chain => {
    const price = priceData[chain];
    ctx.font = '36px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${chainLabels[chain]}: ${price ? price.toFixed(6) : 'Not available'}`, 60, y);
    y += spacing;
  });
  
  // Calculate average price
  const chainPrices = chains.map(chain => priceData[chain])
    .filter(price => typeof price === 'number' && !isNaN(price) && price !== null);
  
  if (chainPrices.length > 0) {
    const avgPrice = chainPrices.reduce((sum, price) => sum + price, 0) / chainPrices.length;
    ctx.font = 'bold 40px Arial';
    ctx.fillText(`Average Price: ${avgPrice.toFixed(6)}`, 60, y + 20);
  }
}

// Helper function to draw a single chain price - simplified version
function drawSingleChainPrice(ctx, chain, price) {
  const chainLabels = {
    ethereum: 'Ethereum',
    optimism: 'Optimism',
    base: 'Base',
    osmosis: 'Osmosis'
  };
  
  // Chain name
  ctx.font = 'bold 56px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${chainLabels[chain] || chain} $PAGE Price`, 60, 160);
  
  // Price
  ctx.font = 'bold 96px Arial';
  ctx.fillText(price ? `${price.toFixed(6)}` : 'Not available', 60, 280);
  
  // Context
  ctx.font = '32px Arial';
  ctx.fillText('Based on liquidity pool data', 60, 350);
}