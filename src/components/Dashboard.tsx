import React, { useState, useRef } from 'react';
import { Music, Clock, User, Disc, BarChart2, Activity, Shuffle, Wifi, Calendar, Upload, List } from 'lucide-react';
import StatsOverview from './StatsOverview';
import TopContent from './TopContent';
import ListeningPatterns from './ListeningPatterns';
import ListeningTrends from './ListeningTrends';
import BehaviorStats from './BehaviorStats';
import FullContent from './FullContent';

interface DashboardProps {
  data: any;
  onAddMoreData: (file: File) => void;
  hasExistingData: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onAddMoreData, hasExistingData }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={18} /> },
    { id: 'top-content', label: 'Top Content', icon: <Music size={18} /> },
    { id: 'full-content', label: 'Full Content', icon: <List size={18} /> },
    { id: 'patterns', label: 'Listening Patterns', icon: <Activity size={18} /> },
    { id: 'trends', label: 'Listening Trends', icon: <Calendar size={18} /> },
    { id: 'behavior', label: 'Behavior', icon: <Shuffle size={18} /> },
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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-700 text-green-500 border-b-2 border-green-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
        
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