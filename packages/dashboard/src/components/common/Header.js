import React, { useState, useEffect } from 'react';
import { fetchPagePrices } from '../../services/tokenService';

function Header() {
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const data = await fetchPagePrices();
        setPrices(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching prices:', error);
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md py-4 px-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="PageDAO" className="h-8 w-8" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">PageDAO Hub</h1>
        </div>
        
        {loading ? (
          <div className="animate-pulse flex space-x-4">
            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ) : prices ? (
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              $PAGE Price: <span className="font-semibold text-green-600 dark:text-green-400">${prices.prices.weighted.toFixed(6)}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              ETH: <span className="font-semibold">${prices.ethPrice.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              TVL: <span className="font-semibold">${prices.tvl.total.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-red-500">Error loading prices</div>
        )}
      </div>
    </header>
  );
}

export default Header;
