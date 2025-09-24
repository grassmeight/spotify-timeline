import React, { useState, useEffect } from 'react';
import { User, Plus, Trash2, Download, Upload, Settings, Music, Calendar, HardDrive } from 'lucide-react';
import { 
  getProfileSummaries, 
  createProfile, 
  deleteProfile, 
  getActiveProfileId, 
  setActiveProfile, 
  clearActiveProfile,
  exportProfile,
  importProfile,
  getStorageStats,
  updateProfile,
  ProfileSummary 
} from '../services/profileService';
import { analyzeStreamingData } from '../services/streamingDataAnalyzer';

interface ProfileSelectorProps {
  onProfileSelected: (profileId: string | null) => void;
  currentProfileId: string | null;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({ onProfileSelected, currentProfileId }) => {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showStorageStats, setShowStorageStats] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    try {
      const profileSummaries = getProfileSummaries();
      setProfiles(profileSummaries);
      
      // If no profiles exist and no current profile, show create form
      if (profileSummaries.length === 0 && !currentProfileId) {
        setShowCreateForm(true);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
      setError('Failed to load profiles');
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      setError('Profile name is required');
      return;
    }

    if (profiles.some(p => p.name.toLowerCase() === newProfileName.toLowerCase())) {
      setError('Profile name already exists');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const newProfile = createProfile(newProfileName);
      setActiveProfile(newProfile.id);
      onProfileSelected(newProfile.id);
      
      setNewProfileName('');
      setShowCreateForm(false);
      loadProfiles();
    } catch (error) {
      console.error('Error creating profile:', error);
      setError('Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfileWithSample = async () => {
    if (!newProfileName.trim()) {
      setError('Profile name is required');
      return;
    }

    if (profiles.some(p => p.name.toLowerCase() === newProfileName.toLowerCase())) {
      setError('Profile name already exists');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create the profile
      const newProfile = createProfile(newProfileName);
      setActiveProfile(newProfile.id);
      
      // Load and process sample data
      const sampleData = await import('../data/sampleStreamingData.json');
      const analyzedData = await analyzeStreamingData(sampleData.default);
      
      // Save sample data to the profile
      updateProfile(newProfile.id, { streamingData: analyzedData });
      
      onProfileSelected(newProfile.id);
      
      setNewProfileName('');
      setShowCreateForm(false);
      loadProfiles();
    } catch (error) {
      console.error('Error creating profile with sample data:', error);
      setError('Failed to create profile with sample data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = (profileId: string) => {
    setActiveProfile(profileId);
    onProfileSelected(profileId);
  };

  const handleDeleteProfile = async (profileId: string, profileName: string) => {
    if (!confirm(`Are you sure you want to delete "${profileName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      deleteProfile(profileId);
      
      // If we deleted the current profile, clear selection
      if (currentProfileId === profileId) {
        clearActiveProfile();
        onProfileSelected(null);
      }
      
      loadProfiles();
    } catch (error) {
      console.error('Error deleting profile:', error);
      setError('Failed to delete profile');
    } finally {
      setLoading(false);
    }
  };

  const handleExportProfile = (profileId: string, profileName: string) => {
    try {
      const profileData = exportProfile(profileId);
      const blob = new Blob([profileData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spotify_timeline_${profileName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting profile:', error);
      setError('Failed to export profile');
    }
  };

  const handleImportProfile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        setError(null);
        
        const profileData = e.target?.result as string;
        const importedProfile = importProfile(profileData);
        
        loadProfiles();
        setActiveProfile(importedProfile.id);
        onProfileSelected(importedProfile.id);
      } catch (error) {
        console.error('Error importing profile:', error);
        setError('Failed to import profile. Please check the file format.');
      } finally {
        setLoading(false);
      }
    };
    
    reader.readAsText(file);
    // Clear the input so the same file can be selected again
    event.target.value = '';
  };

  const storageStats = getStorageStats();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <User className="h-6 w-6 text-green-500 mr-3" />
          <h2 className="text-2xl font-bold">Profile Manager</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowStorageStats(!showStorageStats)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Storage Statistics"
          >
            <HardDrive className="h-5 w-5" />
          </button>
          <label className="cursor-pointer p-2 text-gray-400 hover:text-white transition-colors" title="Import Profile">
            <Upload className="h-5 w-5" />
            <input
              type="file"
              accept=".json"
              onChange={handleImportProfile}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Profile</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-200 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {showStorageStats && (
        <div className="bg-gray-700 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-2 flex items-center">
            <HardDrive className="h-4 w-4 mr-2" />
            Storage Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
            <div>Profiles: {storageStats.profileCount}</div>
            <div>Used Space: {storageStats.totalSizeMB} MB</div>
            <div>Available: {storageStats.availableSpaceMB} MB</div>
            <div>Total Limit: ~5 MB</div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="bg-gray-700 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-3">Create New Profile</h3>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="Enter profile name..."
              className="flex-1 bg-gray-600 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateProfile()}
              disabled={loading}
            />
            <button
              onClick={handleCreateProfile}
              disabled={loading || !newProfileName.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={handleCreateProfileWithSample}
              disabled={loading || !newProfileName.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors whitespace-nowrap"
              title="Create profile with sample data"
            >
              {loading ? 'Creating...' : 'Create + Sample'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewProfileName('');
                setError(null);
              }}
              className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No profiles yet</p>
          <p className="text-sm">Create your first profile to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`border rounded-lg p-4 transition-all ${
                currentProfileId === profile.id
                  ? 'border-green-500 bg-green-500 bg-opacity-10'
                  : 'border-gray-600 bg-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold text-lg">{profile.name}</h3>
                    {currentProfileId === profile.id && (
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-400 mt-2">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Created: {formatDate(profile.createdAt)}
                    </div>
                    <div className="flex items-center">
                      <Music className="h-4 w-4 mr-1" />
                      {profile.hasData ? `${profile.trackCount.toLocaleString()} tracks` : 'No data'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {currentProfileId !== profile.id && (
                    <button
                      onClick={() => handleSelectProfile(profile.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Select
                    </button>
                  )}
                  <button
                    onClick={() => handleExportProfile(profile.id, profile.name)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Export Profile"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProfile(profile.id, profile.name)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    title="Delete Profile"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {profiles.length > 0 && !currentProfileId && (
        <div className="mt-4 p-4 bg-yellow-500 bg-opacity-20 border border-yellow-500 rounded-lg">
          <p className="text-yellow-200 text-sm">
            <Settings className="h-4 w-4 inline mr-2" />
            Please select a profile to continue, or create a new one.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfileSelector;
