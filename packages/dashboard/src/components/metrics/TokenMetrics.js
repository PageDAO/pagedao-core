import React from 'react';

function TokenMetrics({ data, chain }) {
  if (!data) return null;
  
  // Format numbers
  const formatNumber = (num) => {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };
  
  // Format currency with 6 decimal places for PAGE price
  const formatCurrency = (num, decimals = 6) => {
    return '$' + num.toFixed(decimals);
  };
  
  // Format percentage
 // Format percentage
 const formatPercent = (num) => {
    return (num * 100).toFixed(2) + '%';
  };
  
  // Determine chain color
  const getChainColor = (chainName) => {
    const colors = {
      ethereum: '#6F7CBA',
      optimism: '#FF0420',
      base: '#0052FF',
      osmosis: '#5E12A0'
    };
    return colors[chainName] || '#4dabf7';
  };
  
  // Chain-specific price and TVL
  const chainPrice = data.prices[chain];
  const chainTVL = data.tvl[chain];
  const chainWeight = data.weights[chain];
  
  // Calculate price premium/discount compared to weighted average
  const priceDiff = ((chainPrice / data.prices.weighted) - 1) * 100;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
        {chain.charAt(0).toUpperCase() + chain.slice(1)} $PAGE Metrics
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Price</p>
            <p className="text-3xl font-bold" style={{ color: getChainColor(chain) }}>
              {formatCurrency(chainPrice)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {priceDiff >= 0 ? '↑' : '↓'} {Math.abs(priceDiff).toFixed(2)}% vs. weighted avg
            </p>
          </div>
          
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">TVL</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {formatCurrency(chainTVL, 2)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {formatPercent(chainWeight)} of total TVL
            </p>
          </div>
        </div>
        
        <div>
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Network Weight</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mt-2">
              <div 
                className="h-4 rounded-full" 
                style={{ 
                  width: `${chainWeight * 100}%`,
                  backgroundColor: getChainColor(chain)
                }} 
              ></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Based on proportional TVL
            </p>
          </div>
          
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Price Compare</p>
            <div className="flex items-center mt-2">
              <div 
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: getChainColor(chain) }}
              ></div>
              <p className="text-gray-800 dark:text-white">
                {formatCurrency(chainPrice)} ({chain})
              </p>
            </div>
            <div className="flex items-center mt-2">
              <div className="w-4 h-4 rounded-full mr-2 bg-gray-400"></div>
              <p className="text-gray-800 dark:text-white">
                {formatCurrency(data.prices.weighted)} (weighted avg)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TokenMetrics;