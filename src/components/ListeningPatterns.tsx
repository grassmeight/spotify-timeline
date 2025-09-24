import React from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

interface ListeningPatternsProps {
  patterns: {
    peak_hour: number;
    peak_day: string;
    hourly_distribution: Record<string, number>;
    daily_distribution: Record<string, number>;
    monthly_distribution: Record<string, number>;
  };
}

const ListeningPatterns: React.FC<ListeningPatternsProps> = ({ patterns }) => {
  // Provide safe defaults
  const safePatterns = {
    ...patterns,
    peak_hour: patterns.peak_hour || 12,
    peak_day: patterns.peak_day || 'Monday',
    hourly_distribution: patterns.hourly_distribution || {},
    daily_distribution: patterns.daily_distribution || {},
    monthly_distribution: patterns.monthly_distribution || {}
  };

  // Process hourly distribution data
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const hourData = hourLabels.map(hour => {
    const hourNum = parseInt(hour);
    return safePatterns.hourly_distribution[hourNum] || 0;
  });

  // Process daily distribution data
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayData = dayOrder.map(day => safePatterns.daily_distribution[day] || 0);

  // Process monthly distribution data
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthData = monthLabels.map((_, index) => {
    const monthNum = index + 1;
    return safePatterns.monthly_distribution[monthNum] || 0;
  });

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
    },
  };

  // Chart data
  const hourlyChartData = {
    labels: hourLabels,
    datasets: [
      {
        label: 'Tracks Played',
        data: hourData,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const dailyChartData = {
    labels: dayOrder,
    datasets: [
      {
        label: 'Tracks Played',
        data: dayData,
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  const monthlyChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Tracks Played',
        data: monthData,
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Your Listening Patterns</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Hourly Distribution</h3>
          <div className="h-80">
            <Bar data={hourlyChartData} options={chartOptions} />
          </div>
          <p className="mt-4 text-gray-300">
            You listen to music most frequently at {safePatterns.peak_hour}:00.
          </p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Daily Distribution</h3>
          <div className="h-80">
            <Bar data={dailyChartData} options={chartOptions} />
          </div>
          <p className="mt-4 text-gray-300">
            {safePatterns.peak_day} is your most active listening day.
          </p>
        </div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-6 shadow-lg mb-8">
        <h3 className="text-xl font-bold mb-4">Monthly Distribution</h3>
        <div className="h-80">
          <Bar data={monthlyChartData} options={chartOptions} />
        </div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Understanding Your Patterns</h3>
        <p className="text-gray-300 mb-4">
          Your listening patterns show when you're most active on Spotify. The hourly chart reveals your daily rhythm, 
          with peaks typically during commute times, work hours, or evening relaxation.
        </p>
        <p className="text-gray-300">
          The day-of-week distribution can indicate whether you listen more on weekdays or weekends, while the monthly view 
          might reveal seasonal patterns in your music consumption.
        </p>
      </div>
    </div>
  );
};

export default ListeningPatterns;