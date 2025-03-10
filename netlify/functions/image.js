const axios = require('axios');
const { fetchPagePrices } = require('./utils/tokenServices');

exports.handler = async function(event) {
  try {
    // Get the selected chain from query parameters
    const { chain = 'all' } = event.queryStringParameters || {};
    
    // Fetch latest prices
    const priceData = await fetchPagePrices();
    
    // Create text lines for the image
    let textLines = [];
    if (chain === 'all') {
      textLines = [
        `Ethereum: ${priceData.ethereum.toFixed(6)}`,
        `Optimism: ${priceData.optimism.toFixed(6)}`,
        `Base: ${priceData.base.toFixed(6)}`,
        `Osmosis: ${priceData.osmosis.toFixed(6)}`
      ];
    } else {
      textLines = [`${chain.charAt(0).toUpperCase() + chain.slice(1)}: ${priceData[chain].toFixed(6)}`];
    }
    
    // Create a simple HTML image with the text
    const html = `
      <html>
        <head>
          <style>
            body {
              background-color: #1e2d3a;
              color: white;
              font-family: Arial, sans-serif;
              padding: 40px;
              width: 1200px;
              height: 628px;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            h1 {
              font-size: 48px;
              margin-bottom: 40px;
            }
            p {
              font-size: 36px;
              margin: 10px 0;
            }
            .timestamp {
              position: absolute;
              bottom: 20px;
              font-size: 18px;
              color: #aaa;
            }
          </style>
        </head>
        <body>
          <h1>$PAGE Token Prices</h1>
          ${textLines.map(line => `<p>${line}</p>`).join('')}
          <div class="timestamp">Last updated: ${new Date().toLocaleString()}</div>
        </body>
      </html>
    `;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      },
      body: html
    };
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      },
      body: `
        <html>
          <head>
            <style>
              body {
                background-color: #5c1e1e;
                color: white;
                font-family: Arial, sans-serif;
                padding: 40px;
                width: 1200px;
                height: 628px;
                display: flex;
                flex-direction: column;
                justify-content: center;
              }
              h1 {
                font-size: 48px;
                margin-bottom: 20px;
              }
              p {
                font-size: 24px;
              }
            </style>
          </head>
          <body>
            <h1>Error Fetching $PAGE Prices</h1>
            <p>Please try again later</p>
          </body>
        </html>
      `
    };
  }
};