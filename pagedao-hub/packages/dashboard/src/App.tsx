// packages/dashboard/src/App.tsx
import React, { useEffect } from 'react';
import { useStore } from './state/store';
import { Card, Button } from './components/UI';
import { RefreshCw } from 'lucide-react'; // You'll need to install lucide-react
import { LineChart } from './components/Charts/LineChart';

const App: React.FC = () => {
  const {
    token: { 
      prices, 
      weightedPrice, 
      weightedPriceChange24h, 
      priceHistory,
      loading,
      error
    },
    ui: { selectedTimeframe },
    fetchTokenPrices,
    fetchPriceHistory,
    setSelectedTimeframe
  } = useStore();

  // Fetch data on component mount
  useEffect(() => {
    fetchTokenPrices();
    fetchPriceHistory(selectedTimeframe);
  }, [fetchTokenPrices, fetchPriceHistory, selectedTimeframe]);

  // Handle refresh
  const handleRefresh = () => {
    fetchTokenPrices();
    fetchPriceHistory(selectedTimeframe);
  };

  // Format price with specified decimal places
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  // Format percentage change
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // Prepare chart data
  const chartData = {
    labels: priceHistory.aggregated.map(point => 
      new Date(point.timestamp).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: selectedTimeframe === '24h' ? 'numeric' : undefined,
        minute: selectedTimeframe === '24h' ? 'numeric' : undefined
      })
    ),
    datasets: [
      {
        label: 'PAGE Price',
        data: priceHistory.aggregated.map(point => point.price),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }
    ]
  };

  // Simple loading state
  if (loading.prices && Object.keys(prices).length === 0) {
    return <div className="p-6">Loading price data...</div>;
  }

  // Simple error state
  if (error.prices && Object.keys(prices).length === 0) {
    return (
      <div className="p-6">
        <p className="text-red-500">Error loading price data: {error.prices}</p>
        <Button onClick={handleRefresh}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">$PAGE Token Price</h2>
          <Button variant="ghost" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <div className="mb-6">
          <div className="flex items-baseline">
            <span className="text-3xl font-bold mr-2">
              ${formatPrice(weightedPrice)}
            </span>
            
            <span className={`text-sm font-medium ${weightedPriceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatChange(weightedPriceChange24h)}
            </span>
          </div>
          
          <div className="text-xs text-gray-400 mt-1">
            Weighted average across chains
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-400">Price History</h3>
            
            <div className="flex space-x-2">
              {['24h', '7d', '30d', '90d', '1y'].map(timeframe => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe as any)}
                  className={`px-2 py-1 text-xs rounded ${
                    selectedTimeframe === timeframe 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[200px] relative">
            {loading.history && (
              <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10 rounded-lg">
                <div className="animate-pulse text-sm text-gray-400">Loading chart data...</div>
              </div>
            )}
            
            {priceHistory.aggregated.length > 0 ? (
              <LineChart data={chartData} />
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-gray-700 rounded-lg">
                <span className="text-sm text-gray-500">No price history data available</span>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Chain Breakdown</h3>
          
          <div className="space-y-3">
            {Object.keys(prices).map(chain => (
              <div 
                key={chain} 
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: ['#627EEA', '#FF0420', '#0052FF', '#750BBB'][
                      ['ethereum', 'optimism', 'base', 'osmosis'].indexOf(chain)
                    ] }}
                  ></div>
                  <span className="font-medium">{chain.charAt(0).toUpperCase() + chain.slice(1)}</span>
                </div>
                
                <div className="text-right">
                  <div className="font-medium">${formatPrice(prices[chain]?.price || 0)}</div>
                  {prices[chain]?.change24h !== undefined && (
                    <div className={`text-xs ${prices[chain].change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatChange(prices[chain].change24h)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-gray-500 mt-4 text-right">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default App;