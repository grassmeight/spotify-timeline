import React, { useState, useRef } from 'react';
import { Music, BarChart2, Activity, Calendar, Upload, List, Radio, Shuffle } from 'lucide-react';
import StatsOverview from './StatsOverview';
import TopContent from './TopContent';
import ListeningPatterns from './ListeningPatterns';
import ListeningTrends from './ListeningTrends';
import BehaviorStats from './BehaviorStats';
import FullContent from './FullContent';
import LiveDataStats from './LiveDataStats';
import { isAuthenticated } from '../services/spotifyAuthService';

interface SpotifyStats {
  stats: {
    total_stats: {
      total_listening_hours: number;
      total_listening_minutes: number;
      total_tracks_played: number;
      unique_artists: number;
      unique_albums: number;
      unique_tracks: number;
      average_track_length_seconds: number;
    };
    listening_patterns: {
      peak_hour: number;
      peak_day: string;
      hourly_distribution: Record<string, number>;
      daily_distribution: Record<string, number>;
      monthly_distribution: Record<string, number>;
    };
    behavior_stats: {
      skip_rate: number;
      offline_rate: number;
      shuffle_rate: number;
    };
    session_stats: {
      average_session_minutes: number;
      average_tracks_per_session: number;
      total_sessions: number;
    };
    platform_stats: Record<string, number>;
    top_content: {
      top_artists: Record<string, number>;
      top_tracks: Record<string, number>;
      top_albums: Record<string, number>;
    };
  };
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
  rawData: unknown[];
}

interface DashboardProps {
  data: SpotifyStats;
  onAddMoreData: (file: File) => void;
  hasExistingData: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onAddMoreData, hasExistingData }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spotifyConnected = isAuthenticated();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={18} /> },
    { id: 'top-content', label: 'Top Content', icon: <Music size={18} /> },
    { id: 'full-content', label: 'Full Content', icon: <List size={18} /> },
    { id: 'patterns', label: 'Listening Patterns', icon: <Activity size={18} /> },
    { id: 'trends', label: 'Listening Trends', icon: <Calendar size={18} /> },
    { id: 'behavior', label: 'Behavior', icon: <Shuffle size={18} /> },
    { id: 'live-data', label: 'Live Data', icon: <Radio size={18} />, requiresSpotify: true },
  ];

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.json')) {
        onAddMoreData(file);
      } else {
        alert('Please drop a JSON file.');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.endsWith('.json')) {
        onAddMoreData(file);
      } else {
        alert('Please select a JSON file.');
      }
    }
  };

  const renderTabContent = () => {
    // Handle data structure compatibility
    const stats = data?.stats || data; // Support both old and new data structures
    
    switch (activeTab) {
      case 'overview':
        return <StatsOverview data={stats} />;
      case 'top-content':
        return <TopContent topContent={stats?.top_content || {}} />;
      case 'full-content':
        return <FullContent rawData={(data.rawData || []) as Array<{
          ts: string;
          ms_played: number;
          master_metadata_track_name: string;
          master_metadata_album_artist_name: string;
          master_metadata_album_album_name?: string;
          platform?: string;
          shuffle?: boolean;
          skipped?: boolean;
          offline?: boolean;
        }>} />;
      case 'patterns':
        return <ListeningPatterns patterns={stats?.listening_patterns || {}} />;
      case 'trends':
        return <ListeningTrends trends={data?.trends || {}} />;
      case 'behavior':
        return <BehaviorStats 
          behaviorStats={stats?.behavior_stats || {}} 
          sessionStats={stats?.session_stats || {}}
          platformStats={stats?.platform_stats || {}}
        />;
      case 'live-data':
        return <LiveDataStats />;
      default:
        return <StatsOverview data={stats} />;
    }
  };

  return (
    <div
      className="space-y-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Tab Navigation */}
      <div className="flex flex-wrap justify-center gap-2 bg-gray-800 p-4 rounded-lg">
        {tabs.map((tab) => {
          const isDisabled = tab.requiresSpotify && !spotifyConnected;
          
          return (
            <div key={tab.id} className="relative">
              <button
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                onMouseEnter={() => isDisabled && setShowTooltip(tab.id)}
                onMouseLeave={() => setShowTooltip(null)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  activeTab === tab.id && !isDisabled
                    ? 'bg-green-600 text-white shadow-lg'
                    : isDisabled
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
              
              {isDisabled && showTooltip === tab.id && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10 whitespace-nowrap">
                  Please connect to Spotify to access this tab
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add More Data Section */}
      {hasExistingData && (
        <div className="bg-gray-800 p-4 rounded-lg border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Upload className="h-5 w-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-gray-300">Add More Data</h3>
                <p className="text-sm text-gray-400">
                  Drag and drop another JSON file here or click to browse
                </p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl">
            <div className="flex flex-col items-center">
              <Upload className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Drop your JSON file here</h3>
              <p className="text-gray-400">It will be merged with your existing data</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Dashboard;