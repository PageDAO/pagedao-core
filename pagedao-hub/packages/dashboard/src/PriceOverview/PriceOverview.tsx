// pagedao-hub/packages/dashboard/src/components/PriceOverview/PriceOverview.tsx
import React, { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import { CHAIN_CONFIG, APP_CONFIG } from '../../config';
import { ChainId } from '@pagedao/core';
import { calculateWeightedPrice } from '@pagedao/core/pricing/calculateWeighted';
import { LineChart } from '../Charts/LineChart';
import { Skeleton } from '../UI/Skeleton';
import { Badge } from '../UI/Badge';
import { Card } from '../UI/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../UI/Tabs';
import { Button } from '../UI/Button';
import { RefreshCw, Info, AlertTriangle } from 'lucide-react';
import './PriceOverview.css';

const timeframeOptions = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
];

const PriceOverview: React.FC = () => {
  // Access state and actions from the store
  const {
    token: { 
      prices, 
      weightedPrice, 
      weightedPriceChange24h, 
      priceHistory,
      loading,
      error
    },
    liquidity: { tvlByChain },
    ui: { selectedChains, selectedTimeframe },
    fetchTokenPrices,
    fetchPriceHistory,
    setSelectedTimeframe
  } = useStore();

  // Local state for refresh animation
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch prices on component mount and set up refresh interval
  useEffect(() => {
    // Initial data fetch
    fetchData();
    
    // Set up refresh interval
    const intervalId = setInterval(() => {
      fetchData();
    }, APP_CONFIG.refreshInterval);
    
    return () => clearInterval(intervalId);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch price history when timeframe changes
  useEffect(() => {
    fetchPriceHistory(selectedTimeframe);
  }, [fetchPriceHistory, selectedTimeframe]);

  // Fetch all price data
  const fetchData = async () => {
    try {
      await Promise.all([
        fetchTokenPrices(),
        fetchPriceHistory(selectedTimeframe)
      ]);
    } catch (error) {
      console.error('Error fetching price data:', error);
    }
  };

  // Handle manual refresh with animation
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Filter chains based on user selection
  const filteredChains = Object.keys(prices)
    .filter(chain => selectedChains.includes(chain as ChainId))
    .sort() as ChainId[];

  // Calculate custom weighted price if needed
  const recalculateWeightedPrice = () => {
    if (Object.keys(prices).length === 0 || Object.keys(tvlByChain).length === 0) {
      return weightedPrice;
    }
    
    // Extract prices and liquidity values
    const priceValues: Record<ChainId, number> = {};
    filteredChains.forEach(chain => {
      priceValues[chain] = prices[chain]?.price || 0;
    });
    
    // Use core library function to calculate weighted price
    return calculateWeightedPrice(priceValues, tvlByChain, {
      excludeChains: selectedChains.length === Object.keys(CHAIN_CONFIG).length 
        ? [] 
        : Object.keys(CHAIN_CONFIG).filter(chain => !selectedChains.includes(chain as ChainId)) as ChainId[]
    });
  };

  // Format price with specified decimal places
  const formatPrice = (price: number, decimals = 6) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals
    }).format(price);
  };

  // Format percentage change
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // Determine color based on price change
  const getChangeColorClass = (change: number) => {
    return change >= 0 ? 'text-green-500' : 'text-red-500';
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

  // Render loading skeleton
  if (loading.prices && Object.keys(prices).length === 0) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">$PAGE Token Price</h2>
          <Button variant="ghost" size="icon" disabled>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-1/4" />
          </div>
          
          <Skeleton className="h-[200px] w-full" />
          
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      </Card>
    );
  }

  // Render error state
  if (error.prices && Object.keys(prices).length === 0) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">$PAGE Token Price</h2>
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-500">Error loading price data</h3>
            <p className="text-sm text-gray-400 mt-1">{error.prices}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3" 
              onClick={handleRefresh}
            >
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Calculate display price (either weighted or filtered)
  const displayPrice = selectedChains.length === Object.keys(CHAIN_CONFIG).length
    ? weightedPrice
    : recalculateWeightedPrice();

  return (
    <Card className="p-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">$PAGE Token Price</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRefresh} 
          disabled={loading.prices}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing || loading.prices ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {/* Main price display */}
      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-3xl font-bold mr-2">
            ${formatPrice(displayPrice)}
          </span>
          
          <span className={`text-sm font-medium ${getChangeColorClass(weightedPriceChange24h)}`}>
            {formatChange(weightedPriceChange24h)}
          </span>
          
          {selectedChains.length !== Object.keys(CHAIN_CONFIG).length && (
            <Badge variant="outline" className="ml-2">
              Filtered
            </Badge>
          )}
        </div>
        
        <div className="flex items-center text-xs text-gray-400 mt-1">
          <span>Weighted average across selected chains</span>
          <Info className="h-3 w-3 ml-1 cursor-help" title="Price weighted by liquidity in each chain" />
        </div>
      </div>
      
      {/* Price chart with timeframe selector */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-400">Price History</h3>
          
          <TabsList>
            {timeframeOptions.map(option => (
              <TabsTrigger
                key={option.value}
                value={option.value}
                onClick={() => setSelectedTimeframe(option.value as any)}
                className={selectedTimeframe === option.value ? 'bg-primary text-white' : ''}
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
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
      
      {/* Individual chain prices */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Chain Breakdown</h3>
        
        <div className="space-y-3">
          {filteredChains.map(chain => (
            <div 
              key={chain} 
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: CHAIN_CONFIG[chain].color }}
                ></div>
                <span className="font-medium">{CHAIN_CONFIG[chain].name}</span>
                
                {loading.prices && !prices[chain] && (
                  <span className="ml-2 text-xs text-gray-500 animate-pulse">Loading...</span>
                )}
              </div>
              
              <div className="text-right">
                <div className="font-medium">${formatPrice(prices[chain]?.price || 0)}</div>
                {prices[chain]?.change24h !== undefined && (
                  <div className={`text-xs ${getChangeColorClass(prices[chain].change24h)}`}>
                    {formatChange(prices[chain].change24h)}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {filteredChains.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              No chains selected. Please select at least one chain to view prices.
            </div>
          )}
        </div>
        
        {/* Last updated timestamp */}
        <div className="text-xs text-gray-500 mt-4 text-right">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>
    </Card>
  );
};

export default PriceOverview;
