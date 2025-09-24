import React, { useState, useRef } from 'react';
import { Music, Clock, User, Disc, BarChart2, Activity, Shuffle, Wifi, Calendar, Upload, List, Radio } from 'lucide-react';
import StatsOverview from './StatsOverview';
import TopContent from './TopContent';
import ListeningPatterns from './ListeningPatterns';
import ListeningTrends from './ListeningTrends';
import BehaviorStats from './BehaviorStats';
import FullContent from './FullContent';
import LiveDataStats from './LiveDataStats';
import { isAuthenticated } from '../services/spotifyAuthService';

interface DashboardProps {
  data: any;
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
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.endsWith('.json')) {
        onAddMoreData(file);
      }
    }
  };

  return (
    <div 
      className="bg-gray-800 rounded-xl shadow-xl overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-wrap border-b border-gray-700">
        {tabs.map((tab) => {
          const isDisabled = tab.requiresSpotify && !spotifyConnected;
          const isActive = activeTab === tab.id;
          
          return (
            <div
              key={tab.id}
              className="relative"
              onMouseEnter={() => isDisabled && setShowTooltip(tab.id)}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <button
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-700 text-green-500 border-b-2 border-green-500'
                    : isDisabled
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
              
              {/* Tooltip */}
              {showTooltip === tab.id && isDisabled && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50">
                  Please connect to Spotify to access this tab
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Add More Data button moved to App.tsx header */}
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept=".json" 
          onChange={handleFileInputChange}
        />
      </div>

      <div className="p-6">
        {activeTab === 'overview' && <StatsOverview data={data.stats} />}
        {activeTab === 'top-content' && <TopContent topContent={data.stats.top_content} />}
        {activeTab === 'full-content' && <FullContent rawData={data.rawData} />}
        {activeTab === 'patterns' && <ListeningPatterns patterns={data.stats.listening_patterns} />}
        {activeTab === 'trends' && <ListeningTrends trends={data.trends} />}
        {activeTab === 'behavior' && (
          <BehaviorStats 
            behaviorStats={data.stats.behavior_stats} 
            sessionStats={data.stats.session_stats}
            platformStats={data.stats.platform_stats}
          />
        )}
        {activeTab === 'live-data' && <LiveDataStats />}
      </div>
      
      {isDragging && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl border-2 border-dashed border-green-500 max-w-md w-full text-center">
            <div className="mx-auto mb-4 text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Drop to Add More Data</h3>
            <p className="text-gray-400">Release to add this file to your existing data</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;