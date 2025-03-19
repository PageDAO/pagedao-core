// src/pages/NetworkComparison.jsx
import React, { useState, useEffect } from 'react';
import { fetchNetworkComparison } from '../services/api';
import PriceChart from '../components/charts/PriceChart';

function NetworkComparison() {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchNetworkComparison();
        setComparisonData(data);
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
  
  if (!comparisonData) return null;
  
  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Network Comparison</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Price Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Weighted Avg</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(comparisonData.weightedPrice)}
            </p>
          </div>
          
          {Object.entries(comparisonData.priceComparison).map(([network, data]) => {
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
                  {formatCurrency(data.price)}
                </p>
                <p className={`text-sm ${data.diffFromWeighted >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {data.diffFromWeighted >= 0 ? '+' : ''}{data.diffFromWeighted.toFixed(2)}% vs avg
                </p>
              </div>
            );
          })}
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
              {comparisonData.arbitrageOpportunities.length > 0 ? (
                comparisonData.arbitrageOpportunities.map((opportunity, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ 
                          backgroundColor: 
                            opportunity.from === 'ethereum' ? '#6F7CBA' :
                            opportunity.from === 'optimism' ? '#FF0420' :
                            opportunity.from === 'base' ? '#0052FF' :
                            opportunity.from === 'osmosis' ? '#5E12A0' : '#4dabf7'
                        }}></div>
                        <span className="font-medium text-gray-800 dark:text-white">
                          {opportunity.from.charAt(0).toUpperCase() + opportunity.from.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ 
                          backgroundColor: 
                            opportunity.to === 'ethereum' ? '#6F7CBA' :
                            opportunity.to === 'optimism' ? '#FF0420' :
                            opportunity.to === 'base' ? '#0052FF' :
                            opportunity.to === 'osmosis' ? '#5E12A0' : '#4dabf7'
                        }}></div>
                        <span className="font-medium text-gray-800 dark:text-white">
                          {opportunity.to.charAt(0).toUpperCase() + opportunity.to.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        +{opportunity.priceDifference.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-800 dark:text-white">
                        {formatCurrency(opportunity.potentialGain, 6)} per PAGE
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
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
              {Object.entries(comparisonData.priceComparison).map(([network, data]) => {
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
                      {formatCurrency(data.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white">
                      ${data.tvl.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white">
                      {(data.weight * 100).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        data.diffFromWeighted >= 0 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {data.diffFromWeighted >= 0 ? '+' : ''}{data.diffFromWeighted.toFixed(2)}%
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