// packages/dashboard/src/components/Charts/LineChart.tsx
import React from 'react';

interface LineChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension?: number;
    }>;
  };
}

export const LineChart: React.FC<LineChartProps> = ({ data }) => {
  // This is a simplified placeholder
  // In a real implementation, you would use a charting library
  return (
    <div className="line-chart-placeholder">
      <div className="chart-container" style={{position: 'relative', height: '100%'}}>
        <div style={{textAlign: 'center', padding: '2rem 0'}}>
          <p>Chart would display {data.datasets[0]?.data.length || 0} data points from {data.labels[0]} to {data.labels[data.labels.length - 1] || 'N/A'}</p>
          <p>Dataset: {data.datasets[0]?.label || 'No data'}</p>
        </div>
      </div>
    </div>
  );
};

export default LineChart;