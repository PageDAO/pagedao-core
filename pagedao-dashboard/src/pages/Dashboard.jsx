import React, { useState, useEffect } from 'react';
import { fetchTokenPrices } from '../services/api';
import PriceChart from '../components/charts/PriceChart';
import TVLChart from '../components/charts/TVLChart';

function Dashboard() {
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchTokenPrices();
        setTokenData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
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
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">$PAGE Token Dashboard</h1>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">Weighted Avg Price</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(tokenData.prices.weighted)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Based on TVL distribution</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total TVL</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            ${tokenData.tvl.total.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Across all networks</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">Market Cap</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            ${tokenData.marketCap.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Based on {tokenData.supply.circulating.toLocaleString()} circulating supply
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">FDV</p>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            ${tokenData.fdv.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Based on {tokenData.supply.total.toLocaleString()} total supply
          </p>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <PriceChart chain="all" />
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">TVL Distribution</h3>
          <TVLChart data={tokenData} />
          
          <div className="mt-6 grid grid-cols-2 gap-4">
            {Object.entries(tokenData.tvl).filter(([key]) => key !== 'total').map(([network, value]) => (
              <div key={network} className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-2" 
                  style={{ 
                    backgroundColor: 
                      network === 'ethereum' ? '#6F7CBA' :
                      network === 'optimism' ? '#FF0420' :
                      network === 'base' ? '#0052FF' :
                      network === 'osmosis' ? '#5E12A0' : '#4dabf7'
                  }}
                ></div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {network.charAt(0).toUpperCase() + network.slice(1)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ${value.toLocaleString()} ({(tokenData.weights[network] * 100).toFixed(2)}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Network Prices */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Network Prices</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Network</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">TVL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weight</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">vs. Weighted Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(tokenData.prices)
                .filter(([key]) => key !== 'weighted')
                .map(([network, price]) => {
                  const priceDiff = ((price / tokenData.prices.weighted) - 1) * 100;
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
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Supply Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Supply Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Circulating Supply</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {tokenData.supply.circulating.toLocaleString()} PAGE
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {((tokenData.supply.circulating / tokenData.supply.total) * 100).toFixed(2)}% of total
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Supply</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {tokenData.supply.total.toLocaleString()} PAGE
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Supply Distribution</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div 
                className="h-4 rounded-full bg-blue-500" 
                style={{ width: `${(tokenData.supply.circulating / tokenData.supply.total) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-600 dark:text-gray-300">Circulating</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">Non-circulating</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
