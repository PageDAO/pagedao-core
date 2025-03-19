import React, { useState, useEffect } from 'react';
import { fetchPagePrices } from '../services/tokenService';
import TVLDistribution from '../components/metrics/TVLDistribution';

function TVLAnalytics() {
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
        console.error('Error fetching TVL data:', err);
        setError(err.message || 'Failed to fetch data');
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, []);
  
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
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">TVL Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total TVL</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            ${tokenData.tvl.total.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Across all networks</p>
        </div>
        
        {Object.entries(tokenData.tvl)
          .filter(([key]) => key !== 'total')
          .map(([network, tvl]) => (
            <div 
              key={network}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{network.charAt(0).toUpperCase() + network.slice(1)} TVL</p>
              <p className="text-3xl font-bold" style={{ 
                color: 
                  network === 'ethereum' ? '#6F7CBA' :
                  network === 'optimism' ? '#FF0420' :
                  network === 'base' ? '#0052FF' :
                  network === 'osmosis' ? '#5E12A0' : '#4dabf7'
              }}>
                ${tvl.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {(tokenData.weights[network] * 100).toFixed(2)}% of total
              </p>
            </div>
          ))
        }
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <TVLDistribution data={tokenData} />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">TVL Breakdown</h3>
          <div className="space-y-6">
            {Object.entries(tokenData.tvl)
              .filter(([key]) => key !== 'total')
              .map(([network, tvl]) => (
                <div key={network}>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{network.charAt(0).toUpperCase() + network.slice(1)}</span>
                    <span className="text-gray-700 dark:text-gray-300">${tvl.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="h-2.5 rounded-full" 
                      style={{ 
                        width: `${(tvl / tokenData.tvl.total * 100)}%`,
                        backgroundColor: 
                          network === 'ethereum' ? '#6F7CBA' :
                          network === 'optimism' ? '#FF0420' :
                          network === 'base' ? '#0052FF' :
                          network === 'osmosis' ? '#5E12A0' : '#4dabf7'
                      }}
                    ></div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">TVL Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Network</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">TVL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weight</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pool Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pool Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(tokenData.tvl)
                .filter(([key]) => key !== 'total')
                .map(([network, tvl]) => {
                  const poolConfigs = {
                    ethereum: { type: 'Uniswap V2', address: '0x9a25d21e204f10177738edb0c3345bd88478aaa2' },
                    optimism: { type: 'Uniswap V2', address: '0x5421DA31D54640b58355d8D16D78af84D34D2405' },
                    base: { type: 'Uniswap V3', address: '0xb05113fbB5f2551Dc6f10EF3C4EfFB9C03C0E3E9' },
                    osmosis: { type: 'Osmosis Pool', address: 'Pool 1344' }
                  };
                  
                  const poolConfig = poolConfigs[network] || { type: 'Unknown', address: 'Unknown' };
                  
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
                        ${tvl.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white">
                        {(tokenData.weights[network] * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white">
                        {poolConfig.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 font-mono text-xs">
                        {poolConfig.address}
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

export default TVLAnalytics;
