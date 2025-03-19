// src/pages/TokenDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchTokenPrices } from '../services/api';
import PriceChart from '../components/charts/PriceChart';
import TokenMetrics from '../components/metrics/TokenMetrics';

function TokenDetails() {
  const { chain } = useParams();
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
        console.error('Error fetching token details:', err);
        setError(err.message || 'Failed to fetch data');
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, [chain]);
  
  // Get chain configuration
  const getChainConfig = () => {
    const configs = {
      ethereum: {
        name: 'Ethereum',
        color: '#6F7CBA',
        icon: '/images/ethereum-logo.svg',
        dexUrl: 'https://app.uniswap.org/#/swap?outputCurrency=0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e',
        explorer: 'https://etherscan.io/token/0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e',
        address: '0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e',
        lpAddress: '0x9a25d21e204f10177738edb0c3345bd88478aaa2'
      },
      optimism: {
        name: 'Optimism',
        color: '#FF0420',
        icon: '/images/optimism-logo.svg',
        dexUrl: 'https://app.uniswap.org/#/swap?outputCurrency=0xe67E77c47a37795c0ea40A038F7ab3d76492e803&chain=optimism',
        explorer: 'https://optimistic.etherscan.io/token/0xe67E77c47a37795c0ea40A038F7ab3d76492e803',
        address: '0xe67E77c47a37795c0ea40A038F7ab3d76492e803',
        lpAddress: '0x5421DA31D54640b58355d8D16D78af84D34D2405'
      },
      // src/pages/TokenDetails.jsx (continued)
      base: {
        name: 'Base',
        color: '#0052FF',
        icon: '/images/base-logo.svg',
        dexUrl: 'https://app.uniswap.org/positions/v3/base/2376403',
        explorer: 'https://basescan.org/token/0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE',
        address: '0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE',
        lpAddress: '0xb05113fbB5f2551Dc6f10EF3C4EfFB9C03C0E3E9'
      },
      osmosis: {
        name: 'Osmosis',
        color: '#5E12A0',
        icon: '/images/osmosis-logo.svg',
        dexUrl: 'https://app.osmosis.zone/pools/1344',
        explorer: 'https://www.mintscan.io/osmosis/assets/ibc/23A62409E4AD8133116C249B1FA38EED30E500A115D7B153109462CD82C1CD99',
        denom: 'ibc/23A62409E4AD8133116C249B1FA38EED30E500A115D7B153109462CD82C1CD99',
        poolId: '1344'
      }
    };
    
    return configs[chain] || {};
  };
  
  const chainConfig = getChainConfig();
  
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
      <div className="mb-6">
        <Link to="/" className="text-blue-500 hover:text-blue-700 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Dashboard
        </Link>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
              style={{ backgroundColor: chainConfig.color }}
            >
              <span className="text-white text-xl font-bold">
                {chainConfig.name.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                $PAGE on {chainConfig.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {chainConfig.address || chainConfig.denom}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <a 
              href={chainConfig.dexUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Trade
            </a>
            <a 
              href={chainConfig.explorer} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Explorer
            </a>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <TokenMetrics data={tokenData} chain={chain} />
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Contract Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Token Address</p>
              <p className="text-gray-800 dark:text-white font-mono text-sm break-all">
                {chainConfig.address || chainConfig.denom}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pool Address</p>
              <p className="text-gray-800 dark:text-white font-mono text-sm break-all">
                {chainConfig.lpAddress || chainConfig.poolId}
              </p>
            </div>
            
            {chain === 'osmosis' && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pool ID</p>
                <p className="text-gray-800 dark:text-white font-mono text-sm">
                  {chainConfig.poolId}
                </p>
              </div>
            )}
            
            {chain === 'base' && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pool Type</p>
                <p className="text-gray-800 dark:text-white font-mono text-sm">
                  Uniswap V3
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <PriceChart chain={chain} />
      </div>
    </div>
  );
}

export default TokenDetails;

