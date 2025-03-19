import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

function TVLDistribution({ data }) {
  if (!data) return null;
  
  // Chain colors
  const chainColors = {
    ethereum: '#6F7CBA',
    optimism: '#FF0420',
    base: '#0052FF',
    osmosis: '#5E12A0'
  };
  
  // Format chart data
  const chartData = {
    labels: ['Ethereum', 'Optimism', 'Base', 'Osmosis'],
    datasets: [
      {
        data: [
          data.tvl.ethereum,
          data.tvl.optimism,
          data.tvl.base,
          data.tvl.osmosis
        ],
        backgroundColor: [
          chainColors.ethereum,
          chainColors.optimism,
          chainColors.base,
          chainColors.osmosis
        ],
        borderColor: [
          '#ffffff',
          '#ffffff',
          '#ffffff',
          '#ffffff'
        ],
        borderWidth: 2,
      },
    ],
  };
  
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'TVL Distribution Across Networks'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(2) + '%';
            return `${label}: $${value.toLocaleString()} (${percentage})`;
          }
        }
      }
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">TVL Distribution</h3>
      <div className="h-64">
        <Pie data={chartData} options={options} />
      </div>
      
      <div className="mt-6 grid grid-cols-2 gap-4">
        {Object.entries(data.tvl).filter(([key]) => key !== 'total').map(([network, value]) => (
          <div key={network} className="flex items-center">
            <div 
              className="w-4 h-4 rounded-full mr-2" 
              style={{ backgroundColor: chainColors[network] }}
            ></div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {network.charAt(0).toUpperCase() + network.slice(1)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ${value.toLocaleString()} ({(data.weights[network] * 100).toFixed(2)}%)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TVLDistribution;
