// Import the token configuration
const { PAGE_TOKEN_CONFIG } = require('./utils/tokenConfig');

exports.handler = async function(event) {
  const { amount, fid } = JSON.parse(event.body);
  
  // Get Base PAGE token config
  const basePageToken = PAGE_TOKEN_CONFIG.find(token => token.chainId === 8453);
  
  // Build Uniswap URL with pre-filled values
  const swapUrl = `https://app.uniswap.org/#/swap?exactField=input&exactAmount=${amount}&inputCurrency=ETH&outputCurrency=${basePageToken.address}&chain=base`;
  
  return {
    statusCode: 302,
    headers: {
      Location: swapUrl,
      'Cache-Control': 'no-cache'
    }
  };
}