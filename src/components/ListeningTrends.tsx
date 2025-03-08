import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
);

interface ListeningTrendsProps {
  trends: {
    daily_stats: {
      dates: string[];
      hours_played: number[];
      tracks_played: number[];
      skip_rate: number[];
      offline_rate: number[];
      shuffle_rate: number[];
    };
    rolling_averages: {
      dates: string[];
      hours_played: number[];
      tracks_played: number[];
      skip_rate: number[];
      offline_rate: number[];
      shuffle_rate: number[];
    };
  };
}

const ListeningTrends: React.FC<ListeningTrendsProps> = ({ trends }) => {
  const [showRollingAverage, setShowRollingAverage] = useState(true);
  const [metric, setMetric] = useState<'hours_played' | 'tracks_played'>('hours_played');
  
  const data = showRollingAverage ? trends.rolling_averages : trends.daily_stats;
  
  // Format dates for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateStr;
    }
  };
  
  // Prepare chart data
  const chartData = {
    labels: data.dates.map(formatDate),
    datasets: [
      {
        label: metric === 'hours_played' ? 'Hours Played' : 'Tracks Played',
        data: data[metric],
        borderColor: metric === 'hours_played' ? 'rgba(75, 192, 192, 1)' : 'rgba(153, 102, 255, 1)',
        backgroundColor: metric === 'hours_played' ? 'rgba(75, 192, 192, 0.2)' : 'rgba(153, 102, 255, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: showRollingAverage ? 0 : 3,
        pointHoverRadius: 5,
      },
    ],
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        title: {
          display: true,
          text: metric === 'hours_played' ? 'Hours' : 'Tracks',
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Your Listening Trends Over Time</h2>
      
      <div className="bg-gray-700 rounded-lg p-6 shadow-lg mb-8">
        <div className="flex flex-wrap justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Listening Activity</h3>
          
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <div className="flex items-center space-x-2">
              <button
                className={`px-3 py-1 rounded-md ${metric === 'hours_played' ? 'bg-teal-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                onClick={() => setMetric('hours_played')}
              >
                Hours
              </button>
              <button
                className={`px-3 py-1 rounded-md ${metric === 'tracks_played' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                onClick={() => setMetric('tracks_played')}
              >
                Tracks
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-300">Smoothed</label>
              <div 
                className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer ${showRollingAverage ? 'bg-green-500' : 'bg-gray-600'}`}
                onClick={() => setShowRollingAverage(!showRollingAverage)}
              >
                <div 
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${showRollingAverage ? 'translate-x-6' : ''}`}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="h-96">
          <Line data={chartData} options={chartOptions} />
        </div>
        
        <p className="mt-4 text-gray-300">
          {showRollingAverage 
            ? 'Showing 7-day rolling average for smoother trends.' 
            : 'Showing daily data. Toggle "Smoothed" for 7-day rolling average.'}
        </p>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Understanding Your Trends</h3>
        <p className="text-gray-300 mb-4">
          This chart shows how your Spotify listening has changed over time. You can view either the total hours 
          you've spent listening or the number of tracks played each day.
        </p>
        <p className="text-gray-300 mb-4">
          The "Smoothed" toggle shows a 7-day rolling average, which helps identify longer-term trends by 
          reducing day-to-day variations.
        </p>
        <p className="text-gray-300">
          Look for patterns like increased listening during holidays, weekends, or specific life events. 
          Decreases might indicate busy periods or times when you were using other music services.
        </p>
      </div>
    </div>
  );
};

export default ListeningTrends;