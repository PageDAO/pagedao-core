const { createCanvas, loadImage, registerFont } = require('canvas');
const { fetchPagePrices } = require('./utils/tokenServices');
const path = require('path');
const fs = require('fs');

// Try to load custom fonts if available
try {
  registerFont(path.join(__dirname, 'fonts', 'Montserrat-Bold.ttf'), { family: 'Montserrat', weight: 'bold' });
  registerFont(path.join(__dirname, 'fonts', 'Montserrat-Medium.ttf'), { family: 'Montserrat', weight: 'medium' });
  registerFont(path.join(__dirname, 'fonts', 'Montserrat-Regular.ttf'), { family: 'Montserrat' });
} catch (e) {
  console.log('Custom fonts not loaded, using system fonts');
}

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
    
    // Create a gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1c2637');
    gradient.addColorStop(1, '#0d1118');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add subtle grid pattern
    drawGridPattern(ctx, width, height);
    
    // Try to load and draw the PAGE logo
    try {
      const logoPath = path.join(__dirname, 'assets', 'page-logo.png');
      if (fs.existsSync(logoPath)) {
        const logo = await loadImage(logoPath);
        // Draw logo in top right
        const logoSize = 80;
        ctx.drawImage(logo, width - logoSize - 60, 40, logoSize, logoSize);
      }
    } catch (err) {
      console.log('Logo image not available');
    }
    
    // Add PAGE branding with better typography
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Montserrat, Arial, sans-serif';
    ctx.fillText('$PAGE Token Prices', 60, 80);
    
    // Add a subtle divider line
    ctx.strokeStyle = '#3a4d5c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 100);
    ctx.lineTo(width - 60, 100);
    ctx.stroke();
    
    // Determine which prices to show based on selected chain
    if (chain === 'all') {
      // Show all chains
      drawAllChainPrices(ctx, priceData, width);
    } else {
      // Show specific chain
      drawSingleChainPrice(ctx, chain, priceData[chain], width);
    }
    
    // Draw timestamp in a nicer format
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    ctx.fillStyle = '#8a9db0';
    ctx.font = '20px Montserrat, Arial, sans-serif';
    ctx.fillText(`Last Updated: ${timestamp}`, 60, height - 40);
    
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

// Draw a subtle grid pattern background
function drawGridPattern(ctx, width, height) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  
  const gridSize = 40;
  
  // Draw vertical lines
  for (let x = gridSize; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Draw horizontal lines
  for (let y = gridSize; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

// Helper function to draw a rounded rectangle
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

// Helper function to generate error image
function generateErrorImage() {
  const width = 1200;
  const height = 628;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Error background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#5c1e1e');
  gradient.addColorStop(1, '#3c0e0e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add subtle grid pattern
  drawGridPattern(ctx, width, height);
  
  // Error message
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px Montserrat, Arial, sans-serif';
  ctx.fillText('Error Fetching $PAGE Prices', 60, 80);
  
  // Add subtle divider
  ctx.strokeStyle = '#8a3232';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 100);
  ctx.lineTo(width - 60, 100);
  ctx.stroke();
  
  ctx.font = '32px Montserrat, Arial, sans-serif';
  ctx.fillText('Please try again later', 60, 180);
  
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
function drawAllChainPrices(ctx, priceData, width) {
  const chains = ['ethereum', 'optimism', 'base', 'osmosis'];
  const chainLabels = {
    ethereum: 'Ethereum',
    optimism: 'Optimism',
    base: 'Base',
    osmosis: 'Osmosis'
  };
  
  // Chain colors
  const chainColors = {
    ethereum: '#627eea',
    optimism: '#ff0420',
    base: '#0052ff',
    osmosis: '#6F73D2'
  };
  
  let y = 160;
  const spacing = 100;
  
  chains.forEach(chain => {
    const price = priceData[chain];
    
    // Draw price card background
    ctx.fillStyle = 'rgba(26, 40, 57, 0.7)';
    roundRect(ctx, 60, y - 40, width - 120, 80, 10);
    ctx.fill();
    
    // Draw chain color indicator
    ctx.fillStyle = chainColors[chain] || '#ffffff';
    roundRect(ctx, 60, y - 40, 10, 80, 5);
    ctx.fill();
    
    // Draw chain name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Montserrat, Arial, sans-serif';
    ctx.fillText(chainLabels[chain], 90, y - 5);
    
    // Draw price with $ sign
    ctx.fillStyle = '#00ff9d';  // Green color for price
    ctx.font = '32px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${price ? price.toFixed(6) : 'N/A'}`, width - 100, y + 10);
    
    // Reset text alignment
    ctx.textAlign = 'left';
    
    y += spacing;
  });
  
  // Calculate and display average price - ONLY using the chain prices
  const chainPrices = chains.map(chain => priceData[chain])
    .filter(price => typeof price === 'number' && !isNaN(price) && price !== null);
  
  if (chainPrices.length > 0) {
    const avgPrice = chainPrices.reduce((sum, price) => sum + price, 0) / chainPrices.length;
    
    // Draw average price card
    ctx.fillStyle = 'rgba(44, 62, 80, 0.8)';
    roundRect(ctx, 60, y - 40, width - 120, 80, 10);
    ctx.fill();
    
    // Draw average price label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Montserrat, Arial, sans-serif';
    ctx.fillText('Average Price', 90, y - 5);
    
    // Draw average price value
    ctx.fillStyle = '#00ff9d';
    ctx.font = 'bold 32px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${avgPrice.toFixed(6)}`, width - 100, y + 10);
    
    // Reset text alignment
    ctx.textAlign = 'left';
  }
}

// Helper function to draw a single chain price
function drawSingleChainPrice(ctx, chain, price, width) {
  const chainLabels = {
    ethereum: 'Ethereum',
    optimism: 'Optimism',
    base: 'Base',
    osmosis: 'Osmosis'
  };
  
  // Chain colors
  const chainColors = {
    ethereum: '#627eea',
    optimism: '#ff0420',
    base: '#0052ff',
    osmosis: '#6F73D2'
  };
  
  // Draw feature box
  ctx.fillStyle = 'rgba(26, 40, 57, 0.7)';
  roundRect(ctx, 60, 140, width - 120, 180, 15);
  ctx.fill();
  
  // Draw chain color indicator
  ctx.fillStyle = chainColors[chain] || '#ffffff';
  roundRect(ctx, 60, 140, 15, 180, 7);
  ctx.fill();
  
  // Chain name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px Montserrat, Arial, sans-serif';
  ctx.fillText(`${chainLabels[chain] || chain}`, 100, 190);
  
  // Large price
  ctx.fillStyle = '#00ff9d';
  ctx.font = 'bold 72px Montserrat, Arial, sans-serif';
  ctx.fillText(price ? `${price.toFixed(6)}` : 'Not available', 100, 270);
  
  // Add some context
  ctx.fillStyle = '#8a9db0';
  ctx.font = '24px Montserrat, Arial, sans-serif';
  ctx.fillText('Based on liquidity pool data', 100, 310);
}