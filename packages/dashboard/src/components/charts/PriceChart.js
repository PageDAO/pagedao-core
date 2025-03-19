import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import { fetchHistoricalData } from '../../services/tokenService';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

function PriceChart({ chain, period = '24h' }) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchHistoricalData(chain, period);
        
        // Format data for Chart.js
        let labels, datasets;
        
        if (chain === 'all') {
          labels = data.dataPoints.map(dp => new Date(dp.timestamp).toLocaleTimeString());
          datasets = [
            {
              label: 'Ethereum',
              data: data.dataPoints.map(dp => dp.ethereum),
              borderColor: '#6F7CBA',
              backgroundColor: 'rgba(111, 124, 186, 0.2)',
              tension: 0.4
            },
            {
              label: 'Optimism',
              data: data.dataPoints.map(dp => dp.optimism),
              borderColor: '#FF0420',
              backgroundColor: 'rgba(255, 4, 32, 0.2)',
              tension: 0.4
            },
            {
              label: 'Base',
              data: data.dataPoints.map(dp => dp.base),
              borderColor: '#0052FF',
              backgroundColor: 'rgba(0, 82, 255, 0.2)',
              tension: 0.4
            },
            {
              label: 'Osmosis',
              data: data.dataPoints.map(dp => dp.osmosis),
              borderColor: '#5E12A0',
              backgroundColor: 'rgba(94, 18, 160, 0.2)',
              tension: 0.4
            }
          ];
        } else {
          labels = data.dataPoints.map(dp => new Date(dp.timestamp).toLocaleTimeString());
          
          // Chain-specific colors
          const colors = {
            ethereum: '#6F7CBA',
            optimism: '#FF0420',
            base: '#0052FF',
            osmosis: '#5E12A0'
          };
          
          datasets = [
            {
              label: `${chain.charAt(0).toUpperCase() + chain.slice(1)} $PAGE Price`,
              data: data.dataPoints.map(dp => dp.price),
              borderColor: colors[chain] || '#4dabf7',
              backgroundColor: `rgba(${colors[chain] || '#4dabf7'}, 0.2)`,
              tension: 0.4
            }
          ];
        }
        
        setChartData({
          labels,
          datasets
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching chart data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [chain, period]);
  
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: chain === 'all' ? 'PAGE Prices Across Networks' : `PAGE Price on ${chain.charAt(0).toUpperCase() + chain.slice(1)}`
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return '$' + value.toFixed(6);
          }
        }
      }
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!chartData) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex justify-center items-center h-64">
        <p className="text-red-500">Error loading price data</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <Line data={chartData} options={options} />
      <div className="flex justify-center mt-4 space-x-2">
        <button 
          className={`px-3 py-1 rounded ${period === '24h' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          onClick={() => setPeriod('24h')}
        >
          24h
        </button>
        <button 
          className={`px-3 py-1 rounded ${period === '7d' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          onClick={() => setPeriod('7d')}
        >
          7d
        </button>
        <button 
          className={`px-3 py-1 rounded ${period === '30d' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          onClick={() => setPeriod('30d')}
        >
          30d
        </button>
      </div>
    </div>
  );
}

export default PriceChart;
