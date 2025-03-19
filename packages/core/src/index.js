// Export the main functionality
const priceService = require('./services/priceService');
const tvlService = require('./services/tvlService');

module.exports = {
  // Price-related exports
  fetchPagePrices: priceService.fetchPagePrices,
  fetchEthPrice: priceService.fetchEthPrice,
  fetchOsmosisPrice: priceService.fetchOsmosisPrice,
  fetchEthereumPagePrice: priceService.fetchEthereumPagePrice,
  fetchOptimismPagePrice: priceService.fetchOptimismPagePrice,
  fetchBasePagePrice: priceService.fetchBasePagePrice,
  getPoolReserves: priceService.getPoolReserves,
  
  // TVL-related exports
  fetchAllTVL: tvlService.fetchAllTVL,
  calculateTVLWeights: tvlService.calculateTVLWeights,
  fetchOsmosisTVL: tvlService.fetchOsmosisTVL,
  fetchEthereumTVL: tvlService.fetchEthereumTVL,
  fetchOptimismTVL: tvlService.fetchOptimismTVL,
  fetchBaseTVL: tvlService.fetchBaseTVL
};
