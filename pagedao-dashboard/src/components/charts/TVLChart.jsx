// src/components/charts/TVLChart.jsx
import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

function TVLChart({ data }) {
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
    <div className="h-full">
      <Pie data={chartData} options={options} />
    </div>
  );
}

export default TVLChart;
