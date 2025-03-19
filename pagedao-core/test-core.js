// test-core.js
const core = require('./dist/index');

async function testCore() {
  try {
    console.log('Testing @pagedao/core library...');
    
    console.log('Fetching PAGE token prices...');
    const prices = await core.fetchPagePrices();
    console.log('Prices:', prices);
    
    console.log('Fetching TVL data...');
    const tvlData = await core.fetchAllTVL(prices);
    console.log('TVL Data:', tvlData);
    
    console.log('Calculating TVL weights...');
    const weights = core.calculateTVLWeights(tvlData);
    console.log('TVL Weights:', weights);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testCore();
