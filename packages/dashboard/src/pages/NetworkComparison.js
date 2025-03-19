import React, { useState, useEffect } from 'react';
import { fetchPagePrices } from '../services/tokenService';
import PriceChart from '../components/charts/PriceChart';

function NetworkComparison() {
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchPagePrices();
        setTokenData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching comparison data:', err);
        setError(err.message || 'Failed to fetch data');
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Format currency with 6 decimal places for PAGE price
  const formatCurrency = (num, decimals = 6) => {
    return '$' + num.toFixed(decimals);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }
  
  if (!tokenData) return null;
  
  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Network Comparison</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Price Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Weighted Avg</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(tokenData.prices.weighted)}
            </p>
          </div>
          
          {Object.entries(tokenData.prices)
            .filter(([key]) => key !== 'weighted')
            .map(([network, price]) => {
              const priceDiff = ((price / tokenData.prices.weighted) - 1) * 100;
              return (
                <div 
                  key={network}
                  className="p-4 border rounded-lg border-gray-200 dark:border-gray-700"
                >
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {network.charAt(0).toUpperCase() + network.slice(1)}
                  </p>
                  <p className="text-2xl font-bold" style={{ 
                    color: 
                      network === 'ethereum' ? '#6F7CBA' :
                      network === 'optimism' ? '#FF0420' :
                      network === 'base' ? '#0052FF' :
                      network === 'osmosis' ? '#5E12A0' : '#4dabf7'
                  }}>
                    {formatCurrency(price)}
                  </p>
                  <p className={`text-sm ${priceDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(2)}% vs avg
                  </p>
                </div>
              );
            })
          }
        </div>
      </div>
      
      <div className="mb-8">
        <PriceChart chain="all" />
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Arbitrage Opportunities</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price Difference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Potential Gain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(tokenData.prices)
                .filter(([key]) => key !== 'weighted')
                .flatMap(([network1, price1]) => 
                  Object.entries(tokenData.prices)
                    .filter(([key]) => key !== 'weighted' && key !== network1)
                    .map(([network2, price2]) => {
                      const priceDiff = ((price2 / price1) - 1) * 100;
                      // Only show opportunities with >0.5% difference
                      if (priceDiff <= 0.5) return null;
                      
                      return (
                        <tr key={`${network1}-${network2}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full mr-2" style={{ 
                                backgroundColor: 
                                  network1 === 'ethereum' ? '#6F7CBA' :
                                  network1 === 'optimism' ? '#FF0420' :
                                  network1 === 'base' ? '#0052FF' :
                                  network1 === 'osmosis' ? '#5E12A0' : '#4dabf7'
                              }}></div>
                              <span className="font-medium text-gray-800 dark:text-white">
                                {network1.charAt(0).toUpperCase() + network1.slice(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ 
                                backgroundColor: 
                                  network2 === 'ethereum' ? '#6F7CBA' :
                                  network2 === 'optimism' ? '#FF0420' :
                                  network2 === 'base' ? '#0052FF' :
                                  network2 === 'osmosis' ? '#5E12A0' : '#4dabf7'
                              }}></div>
                              <span className="font-medium text-gray-800 dark:text-white">
                                {network2.charAt(0).toUpperCase() + network2.slice(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              +{priceDiff.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-800 dark:text-white">
                              {formatCurrency(price1 * (priceDiff / 100), 6)} per PAGE
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )
                .filter(Boolean) // Filter out null entries
                .sort((a, b) => {
                  // Extract price difference percentage from the text content
                  const getPercentage = (element) => {
                    const text = element.props.children.props.children;
                    return parseFloat(text.replace('+', '').replace('%', ''));
                  };
                  
                  const diffA = getPercentage(a.props.children[2]);
                  const diffB = getPercentage(b.props.children[2]);
                  
                  return diffB - diffA; // Sort in descending order
                })
              }
              
              {/* If no arbitrage opportunities are found */}
              {Object.entries(tokenData.prices)
                .filter(([key]) => key !== 'weighted')
                .flatMap(([network1, price1]) => 
                  Object.entries(tokenData.prices)
                    .filter(([key]) => key !== 'weighted' && key !== network1)
                    .map(([network2, price2]) => {
                      const priceDiff = ((price2 / price1) - 1) * 100;
                      return priceDiff > 0.5;
                    })
                )
                .filter(Boolean).length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No significant arbitrage opportunities found at this time (0.5% difference)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Network Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Network</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">TVL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weight</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vs. Weighted Avg</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pool Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(tokenData.prices)
                .filter(([key]) => key !== 'weighted')
                .map(([network, price]) => {
                  const priceDiff = ((price / tokenData.prices.weighted) - 1) * 100;
                  
                  const poolTypes = {
                    ethereum: 'Uniswap V2',
                    optimism: 'Uniswap V2',
                    base: 'Uniswap V3',
                    osmosis: 'Osmosis Pool'
                  };
                  
                  return (
                    <tr key={network}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ 
                            backgroundColor: 
                              network === 'ethereum' ? '#6F7CBA' :
                              network === 'optimism' ? '#FF0420' :
                              network === 'base' ? '#0052FF' :
                              network === 'osmosis' ? '#5E12A0' : '#4dabf7'
                          }}></div>
                          <span className="font-medium text-gray-800 dark:text-white">
                            {network.charAt(0).toUpperCase() + network.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white">
                        {formatCurrency(price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white">
                        ${tokenData.tvl[network].toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white">
                        {(tokenData.weights[network] * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          priceDiff >= 0 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white">
                        {poolTypes[network]}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default NetworkComparison;
