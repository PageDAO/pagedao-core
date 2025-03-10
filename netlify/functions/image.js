const { createCanvas, registerFont } = require('canvas');
const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  try {
    // Get the selected chain from query parameters
    const { chain = 'all', error } = event.queryStringParameters || {};
    
    // If error parameter is present, return error image
    if (error === 'true') {
      return generateErrorImage();
    }
    
    // Fetch latest prices directly from the service
    const priceData = await fetchPagePrices();
    
    // Create canvas with proper aspect ratio for Farcaster (1.91:1)
    const width = 1200;
    const height = 628; // Approximately 1.91:1 ratio
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#1e2d3a'; // Dark blue background
    ctx.fillRect(0, 0, width, height);
    
    // Add PAGE branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('$PAGE Token Prices', 60, 80);
    
    // Draw timestamp
    const timestamp = new Date().toLocaleString();
    ctx.font = '24px Arial';
    ctx.fillText(`Last Updated: ${timestamp}`, 60, height - 40);
    
    // Determine which prices to show based on selected chain
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
    return generateErrorImage();
  }
};

// Helper function to generate error image
function generateErrorImage() {
  const width = 1200;
  const height = 628;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Error background
  ctx.fillStyle = '#5c1e1e'; // Dark red background
  ctx.fillRect(0, 0, width, height);
  
  // Error message
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.fillText('Error Fetching $PAGE Prices', 60, 80);
  
  ctx.font = '32px Arial';
  ctx.fillText('Please try again later', 60, 150);
  
  // Convert to PNG
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

// Helper function to draw all chain prices
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
    // Format price to 4 decimal places and add $ sign
    ctx.fillText(`${chainLabels[chain]}: $${price ? price.toFixed(6) : 'Not available'}`, 60, y);
    y += spacing;
  });
  
  // Calculate and display average price
  const validPrices = Object.values(priceData).filter(p => typeof p === 'number' && !isNaN(p) && p !== null);
  if (validPrices.length > 0) {
    const avgPrice = validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length;
    ctx.font = 'bold 40px Arial';
    ctx.fillText(`Average Price: $${avgPrice.toFixed(6)}`, 60, y + 20);
  }
}

// Helper function to draw a single chain price
function drawSingleChainPrice(ctx, chain, price) {
  const chainLabels = {
    ethereum: 'Ethereum',
    optimism: 'Optimism',
    base: 'Base',
    osmosis: 'Osmosis'
  };
  
  // Large chain name
  ctx.font = 'bold 56px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${chainLabels[chain] || chain} $PAGE Price`, 60, 160);
  
  // Large price
  ctx.font = 'bold 96px Arial';
  // Format price with $ sign and 6 decimal places
  ctx.fillText(price ? `$${price.toFixed(6)}` : 'Not available', 60, 280);
  
  // Add some context
  ctx.font = '32px Arial';
  ctx.fillText('Based on liquidity pool data', 60, 350);
}
