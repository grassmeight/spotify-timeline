import React from 'react';
import { Shuffle, Wifi, Clock, Smartphone, Laptop, Speaker, Music } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend
);

interface BehaviorStatsProps {
  behaviorStats: {
    skip_rate: number;
    offline_rate: number;
    shuffle_rate: number;
  };
  sessionStats: {
    average_session_minutes: number;
    average_tracks_per_session: number;
    total_sessions: number;
  };
  platformStats: Record<string, number>;
}

const BehaviorStats: React.FC<BehaviorStatsProps> = ({ 
  behaviorStats, 
  sessionStats,
  platformStats 
}) => {
  // Provide default values if data is missing
  const safeBehaviorStats = {
    ...behaviorStats,
    skip_rate: behaviorStats?.skip_rate ?? 0,
    offline_rate: behaviorStats?.offline_rate ?? 0,
    shuffle_rate: behaviorStats?.shuffle_rate ?? 0
  };
  
  const safeSessionStats = {
    ...sessionStats,
    average_session_minutes: sessionStats?.average_session_minutes ?? 0,
    average_tracks_per_session: sessionStats?.average_tracks_per_session ?? 0,
    total_sessions: sessionStats?.total_sessions ?? 0
  };
  
  const safePlatformStats = platformStats || {};
  // Process platform data
  const platforms = Object.entries(safePlatformStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const platformLabels = platforms.map(([name]) => name);
  const platformValues = platforms.map(([, value]) => value);
  const totalPlatformPlays = platformValues.reduce((sum, value) => sum + value, 0);
  
  // Platform chart data
  const platformChartData = {
    labels: platformLabels,
    datasets: [
      {
        data: platformValues,
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 20,
          font: {
            size: 12
          }
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            const percentage = ((value / totalPlatformPlays) * 100).toFixed(1);
            return `${context.label}: ${value} plays (${percentage}%)`;
          }
        }
      },
    },
  };

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    const lowerPlatform = platform.toLowerCase();
    if (lowerPlatform.includes('phone') || lowerPlatform.includes('mobile') || lowerPlatform.includes('android') || lowerPlatform.includes('ios')) {
      return <Smartphone className="h-6 w-6 text-pink-400" />;
    } else if (lowerPlatform.includes('desktop') || lowerPlatform.includes('windows') || lowerPlatform.includes('mac')) {
      return <Laptop className="h-6 w-6 text-blue-400" />;
    } else if (lowerPlatform.includes('speaker') || lowerPlatform.includes('sonos') || lowerPlatform.includes('echo')) {
      return <Speaker className="h-6 w-6 text-yellow-400" />;
    } else {
      return <Music className="h-6 w-6 text-purple-400" />;
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Your Listening Behavior</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg flex flex-col">
          <div className="flex items-center mb-4">
            <div className="bg-indigo-500 bg-opacity-20 p-3 rounded-lg mr-4">
              <Shuffle className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold">Shuffle Mode</h3>
              <p className="text-2xl font-bold">{safeBehaviorStats.shuffle_rate}%</p>
            </div>
          </div>
          <p className="text-gray-400 mt-auto">
            {safeBehaviorStats.shuffle_rate > 50 
              ? "You prefer to mix things up with shuffle mode." 
              : "You usually listen to albums and playlists in order."}
          </p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg flex flex-col">
          <div className="flex items-center mb-4">
            <div className="bg-blue-500 bg-opacity-20 p-3 rounded-lg mr-4">
              <Wifi className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold">Offline Listening</h3>
              <p className="text-2xl font-bold">{safeBehaviorStats.offline_rate}%</p>
            </div>
          </div>
          <p className="text-gray-400 mt-auto">
            {safeBehaviorStats.offline_rate > 20 
              ? "You frequently listen to downloaded content offline." 
              : "You mostly stream music while connected to the internet."}
          </p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg flex flex-col">
          <div className="flex items-center mb-4">
            <div className="bg-red-500 bg-opacity-20 p-3 rounded-lg mr-4">
              <Clock className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold">Skip Rate</h3>
              <p className="text-2xl font-bold">{safeBehaviorStats.skip_rate}%</p>
            </div>
          </div>
          <p className="text-gray-400 mt-auto">
            {safeBehaviorStats.skip_rate > 30 
              ? "You frequently skip tracks to find what you want to hear." 
              : "You tend to listen to tracks all the way through."}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-6">Listening Platforms</h3>
          <div className="h-64">
            <Doughnut data={platformChartData} options={chartOptions} />
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Platform Breakdown</h3>
          <ul className="space-y-4">
            {platforms.map(([platform, count], index) => (
              <li key={index} className="flex items-center">
                <div className="bg-gray-800 p-2 rounded-lg mr-3">
                  {getPlatformIcon(platform)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{platform}</span>
                    <span className="text-gray-400 text-sm">{count} plays</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${index === 0 ? 'bg-pink-500' : index === 1 ? 'bg-blue-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-teal-500' : 'bg-purple-500'}`}
                      style={{ width: `${(count / totalPlatformPlays) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Understanding Your Behavior</h3>
        <p className="text-gray-300 mb-4">
          Your listening behavior reveals how you interact with Spotify. A high skip rate ({safeBehaviorStats.skip_rate}%) 
          might indicate you're selective about what you listen to, while your shuffle usage ({safeBehaviorStats.shuffle_rate}%) 
          shows whether you prefer curated or randomized listening.
        </p>
        <p className="text-gray-300 mb-4">
          Offline listening ({safeBehaviorStats.offline_rate}%) indicates how often you listen without an internet connection, 
          which might correlate with commuting or travel.
        </p>
        <p className="text-gray-300">
          Your platform usage shows which devices you prefer for music. This can reveal interesting patterns about 
          when and where you listen to music most often.
        </p>
      </div>
    </div>
  );
};

export default BehaviorStats;