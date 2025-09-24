import React, { useState, useEffect, useRef } from 'react';
import { FileUp, Music, User, ChevronDown, Plus, Trash2, Settings, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import FileUploader from './components/FileUploader';
import SampleData from './data/sampleData';
import SpotifyConnectButton from './components/SpotifyConnectButton';
import { extractSpotifyIdFromUri } from './utils/spotifyUtils';
import { 
  getActiveProfileId, 
  getActiveProfile, 
  updateProfile, 
  setActiveProfile,
  createProfile,
  getProfileSummaries,
  deleteProfile,
  getStorageStats,
  ProfileSummary,
  StorageStats
} from './services/indexedDBProfileService';
import ProfileApiSettings from './components/ProfileApiSettings';

// Define interfaces for Spotify data
interface SpotifyStreamingEntry {
  ts: string;
  ms_played: number;
  master_metadata_track_name: string;
  master_metadata_album_artist_name: string;
  master_metadata_album_album_name?: string;
  spotify_track_uri?: string;
  platform?: string;
  shuffle?: boolean;
  skipped?: boolean;
  offline?: boolean;
  offline_timestamp?: string | null;
  incognito_mode?: boolean;
  reason_start?: string;
  reason_end?: string;
}

// Define the interface for our Spotify stats
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
  rawData: SpotifyStreamingEntry[]; // Add raw data to the interface
}

function App() {
  const [data, setData] = useState<SpotifyStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<SpotifyStreamingEntry[]>([]);
  const [isAppending, setIsAppending] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile management state
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadProfiles = async () => {
    const allProfiles = await getProfileSummaries();
    setProfiles(allProfiles);
    // Also update storage stats
    const stats = await getStorageStats();
    setStorageStats(stats);
  };

  const processSpotifyData = React.useCallback((jsonData: SpotifyStreamingEntry[]) => {
    try {
      // Basic validation to check if this is Spotify data
      if (!Array.isArray(jsonData)) {
        throw new Error("Invalid data format. Expected an array of streaming history entries.");
      }
      
      if (jsonData.length === 0) {
        throw new Error("The file contains no streaming history data.");
      }
      
      // Check for required fields in the first item
      const firstItem = jsonData[0];
      const requiredFields = ['ts', 'ms_played', 'master_metadata_track_name', 'master_metadata_album_artist_name'];
      
      for (const field of requiredFields) {
        if (!(field in firstItem)) {
          throw new Error(`Missing required field: ${field}. This doesn't appear to be a valid Spotify data file.`);
        }
      }
      
      // Process the data (simplified version of what the Python script would do)
      // In a real app, this would be more comprehensive
      const processedData = analyzeSpotifyData(jsonData);
      return processedData;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Failed to process Spotify data: ${err.message}`);
      } else {
        throw new Error("Failed to process Spotify data: Unknown error");
      }
    }
  }, []);

  const loadProfileData = React.useCallback(async (profileId: string) => {
    // Set the active profile first
    setActiveProfile(profileId);
    const activeProfile = await getActiveProfile();
    if (activeProfile?.streamingData) {
      // Check if data is already processed (has stats property) or raw JSON
      if (Array.isArray(activeProfile.streamingData)) {
        // Raw JSON data - process it
        const processedData = processSpotifyData(activeProfile.streamingData);
        setData(processedData);
        setRawData(activeProfile.streamingData);
      } else if (activeProfile.streamingData && typeof activeProfile.streamingData === 'object' && 'stats' in activeProfile.streamingData) {
        // Already processed data - use directly
        setData(activeProfile.streamingData as SpotifyStats);
        setRawData((activeProfile.streamingData as SpotifyStats).rawData || []);
      }
    } else {
      // Load sample data for first-time users to showcase features
      const sampleDataWithRaw = {
        ...SampleData,
        rawData: [] as SpotifyStreamingEntry[] // Add empty raw data for sample data
      };
      setData(sampleDataWithRaw as SpotifyStats);
      updateProfile(profileId, { streamingData: sampleDataWithRaw });
    }
  }, [processSpotifyData]);

  // Profile management with multi-profile support
  useEffect(() => {
    const initializeProfiles = async () => {
      await loadProfiles();
      
      // Create or load default profile in the background
      let profileId = getActiveProfileId();
      if (!profileId) {
        const defaultProfile = await createProfile('Personal Account');
        setActiveProfile(defaultProfile.id);
        profileId = defaultProfile.id;
        setCurrentProfileId(profileId);
      } else {
        setCurrentProfileId(profileId);
      }
      
      await loadProfileData(profileId);
    };
    
    initializeProfiles();
  }, [loadProfileData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
        setShowCreateProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const analyzeSpotifyData = (jsonData: SpotifyStreamingEntry[]) => {
    // This is a simplified version of the Python analysis
    // In a real app, this would be much more comprehensive
    
    // Convert timestamps to Date objects and extract Spotify IDs
    const data = jsonData.map(item => {
      // Extract Spotify ID from URI if available
      let spotifyId = null;
      if (item.spotify_track_uri) {
        spotifyId = extractSpotifyIdFromUri(item.spotify_track_uri);
      }
      
      return {
        ...item,
        timestamp: new Date(item.ts),
        skipped: item.skipped || false,
        offline: item.offline || false,
        shuffle: item.shuffle || false,
        spotify_id: spotifyId
      };
    });
    
    // Calculate basic stats
    const totalMs = data.reduce((sum, item) => sum + (item.ms_played || 0), 0);
    const totalHours = totalMs / (1000 * 60 * 60);
    const totalMinutes = totalMs / (1000 * 60);
    
    // Count unique artists, albums, tracks
    const uniqueArtists = new Set(data.map(item => item.master_metadata_album_artist_name).filter(Boolean)).size;
    const uniqueAlbums = new Set(data.map(item => item.master_metadata_album_album_name).filter(Boolean)).size;
    const uniqueTracks = new Set(data.map(item => item.master_metadata_track_name).filter(Boolean)).size;
    
    // Calculate average track length
    const avgTrackLength = totalMs / data.length / 1000;
    
    // Count skips, offline plays, shuffle plays
    const skipCount = data.filter(item => item.skipped).length;
    const offlineCount = data.filter(item => item.offline).length;
    const shuffleCount = data.filter(item => item.shuffle).length;
    
    const skipRate = (skipCount / data.length) * 100;
    const offlineRate = (offlineCount / data.length) * 100;
    const shuffleRate = (shuffleCount / data.length) * 100;
    
    // Get hourly distribution
    const hourlyDistribution: Record<string, number> = {};
    data.forEach(item => {
      const hour = item.timestamp.getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });
    
    // Get daily distribution
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyDistribution: Record<string, number> = {};
    data.forEach(item => {
      const day = days[item.timestamp.getDay()];
      dailyDistribution[day] = (dailyDistribution[day] || 0) + 1;
    });
    
    // Get monthly distribution
    const monthlyDistribution: Record<string, number> = {};
    data.forEach(item => {
      const month = item.timestamp.getMonth() + 1; // 1-12
      monthlyDistribution[month] = (monthlyDistribution[month] || 0) + 1;
    });
    
    // Find peak hour and day
    let peakHour = 0;
    let maxHourCount = 0;
    Object.entries(hourlyDistribution).forEach(([hour, count]) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = parseInt(hour);
      }
    });
    
    let peakDay = 'Monday';
    let maxDayCount = 0;
    Object.entries(dailyDistribution).forEach(([day, count]) => {
      if (count > maxDayCount) {
        maxDayCount = count;
        peakDay = day;
      }
    });
    
    // Get platform stats
    const platformStats: Record<string, number> = {};
    data.forEach(item => {
      if (item.platform) {
        // Simplify platform names
        let platform = item.platform;
        if (platform.includes('Android')) platform = 'Android Phone';
        else if (platform.includes('iOS') || platform.includes('iPhone')) platform = 'iOS Phone';
        else if (platform.includes('Windows')) platform = 'Windows Desktop';
        else if (platform.includes('Mac')) platform = 'Mac Desktop';
        else if (platform.includes('Web')) platform = 'Web Player';
        
        platformStats[platform] = (platformStats[platform] || 0) + 1;
      }
    });
    
    // Get top artists, tracks, albums
    const artistCounts: Record<string, number> = {};
    const trackCounts: Record<string, number> = {};
    const albumCounts: Record<string, number> = {};
    
    data.forEach(item => {
      if (item.master_metadata_album_artist_name) {
        artistCounts[item.master_metadata_album_artist_name] = 
          (artistCounts[item.master_metadata_album_artist_name] || 0) + 1;
      }
      
      if (item.master_metadata_track_name) {
        trackCounts[item.master_metadata_track_name] = 
          (trackCounts[item.master_metadata_track_name] || 0) + 1;
      }
      
      if (item.master_metadata_album_album_name) {
        albumCounts[item.master_metadata_album_album_name] = 
          (albumCounts[item.master_metadata_album_album_name] || 0) + 1;
      }
    });
    
    // Sort and get top 10
    const topArtists: Record<string, number> = {};
    Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([name, count]) => {
        topArtists[name] = count;
      });
    
    const topTracks: Record<string, number> = {};
    Object.entries(trackCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([name, count]) => {
        topTracks[name] = count;
      });
    
    const topAlbums: Record<string, number> = {};
    Object.entries(albumCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([name, count]) => {
        topAlbums[name] = count;
      });
    
    // Generate daily trends (simplified)
    const dateMap = new Map();
    data.forEach(item => {
      const dateStr = item.timestamp.toISOString().split('T')[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          ms_played: 0,
          tracks: 0,
          skipped: 0,
          offline: 0,
          shuffle: 0
        });
      }
      
      const dateStats = dateMap.get(dateStr);
      dateStats.ms_played += item.ms_played;
      dateStats.tracks += 1;
      dateStats.skipped += item.skipped ? 1 : 0;
      dateStats.offline += item.offline ? 1 : 0;
      dateStats.shuffle += item.shuffle ? 1 : 0;
    });
    
    // Convert to arrays for charting
    const dates: string[] = [];
    const hoursPlayed: number[] = [];
    const tracksPlayed: number[] = [];
    const skipRates: number[] = [];
    const offlineRates: number[] = [];
    const shuffleRates: number[] = [];
    
    // Sort dates
    Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([date, stats]) => {
        dates.push(date);
        hoursPlayed.push(Number((stats.ms_played / (1000 * 60 * 60)).toFixed(2)));
        tracksPlayed.push(stats.tracks);
        skipRates.push(Number(((stats.skipped / stats.tracks) * 100).toFixed(2)));
        offlineRates.push(Number(((stats.offline / stats.tracks) * 100).toFixed(2)));
        shuffleRates.push(Number(((stats.shuffle / stats.tracks) * 100).toFixed(2)));
      });
    
    // Calculate 7-day rolling averages (simplified)
    const rollingHours: number[] = [];
    const rollingTracks: number[] = [];
    const rollingSkipRates: number[] = [];
    const rollingOfflineRates: number[] = [];
    const rollingShuffleRates: number[] = [];
    
    for (let i = 0; i < dates.length; i++) {
      const window = 7;
      const start = Math.max(0, i - window + 1);
      const end = i + 1;
      
      const windowHours = hoursPlayed.slice(start, end);
      const windowTracks = tracksPlayed.slice(start, end);
      const windowSkipRates = skipRates.slice(start, end);
      const windowOfflineRates = offlineRates.slice(start, end);
      const windowShuffleRates = shuffleRates.slice(start, end);
      
      const avgHours = windowHours.reduce((sum, val) => sum + val, 0) / windowHours.length;
      const avgTracks = windowTracks.reduce((sum, val) => sum + val, 0) / windowTracks.length;
      const avgSkipRate = windowSkipRates.reduce((sum, val) => sum + val, 0) / windowSkipRates.length;
      const avgOfflineRate = windowOfflineRates.reduce((sum, val) => sum + val, 0) / windowOfflineRates.length;
      const avgShuffleRate = windowShuffleRates.reduce((sum, val) => sum + val, 0) / windowShuffleRates.length;
      
      rollingHours.push(Number(avgHours.toFixed(2)));
      rollingTracks.push(Math.round(avgTracks));
      rollingSkipRates.push(Number(avgSkipRate.toFixed(2)));
      rollingOfflineRates.push(Number(avgOfflineRate.toFixed(2)));
      rollingShuffleRates.push(Number(avgShuffleRate.toFixed(2)));
    }
    
    // Construct the final data structure
    return {
      stats: {
        total_stats: {
          total_listening_hours: Number(totalHours.toFixed(2)),
          total_listening_minutes: Number(totalMinutes.toFixed(2)),
          total_tracks_played: data.length,
          unique_artists: uniqueArtists,
          unique_albums: uniqueAlbums,
          unique_tracks: uniqueTracks,
          average_track_length_seconds: Number(avgTrackLength.toFixed(2))
        },
        listening_patterns: {
          peak_hour: peakHour,
          peak_day: peakDay,
          hourly_distribution: hourlyDistribution,
          daily_distribution: dailyDistribution,
          monthly_distribution: monthlyDistribution
        },
        behavior_stats: {
          skip_rate: Number(skipRate.toFixed(2)),
          offline_rate: Number(offlineRate.toFixed(2)),
          shuffle_rate: Number(shuffleRate.toFixed(2))
        },
        session_stats: {
          average_session_minutes: 30, // Simplified
          average_tracks_per_session: 8, // Simplified
          total_sessions: Math.ceil(data.length / 8) // Simplified
        },
        platform_stats: platformStats,
        top_content: {
          top_artists: topArtists,
          top_tracks: topTracks,
          top_albums: topAlbums
        }
      },
      trends: {
        daily_stats: {
          dates,
          hours_played: hoursPlayed,
          tracks_played: tracksPlayed,
          skip_rate: skipRates,
          offline_rate: offlineRates,
          shuffle_rate: shuffleRates
        },
        rolling_averages: {
          dates,
          hours_played: rollingHours,
          tracks_played: rollingTracks,
          skip_rate: rollingSkipRates,
          offline_rate: rollingOfflineRates,
          shuffle_rate: rollingShuffleRates
        }
      },
      rawData: jsonData // Include the raw data in the result
    };
  };

  // Function to remove duplicates from an array of Spotify streaming history entries
  const removeDuplicates = (data: SpotifyStreamingEntry[]): SpotifyStreamingEntry[] => {
    // Create a Set to track unique entries based on timestamp + track + ms_played
    const seen = new Set();
    return data.filter(item => {
      // Create a unique key for each entry
      const key = `${item.ts}-${item.master_metadata_track_name}-${item.ms_played}`;
      if (seen.has(key)) {
        return false; // Skip this duplicate
      }
      seen.add(key);
      return true;
    });
  };

  const handleFileSelect = async (file: File | null, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      setIsAppending(append);
      
      if (!file) {
        // Load sample data if no file is provided
        setTimeout(async () => {
          const sampleDataWithRaw = {
            ...SampleData,
            rawData: [] // Add empty raw data for sample data
          };
          setData(sampleDataWithRaw);
          setRawData([]); // Reset raw data since we're using sample data
          
          // Save sample data to current profile
          if (currentProfileId) {
            await updateProfile(currentProfileId, { streamingData: sampleDataWithRaw });
            await loadProfiles(); // Refresh profile summaries
          }
          
          setLoading(false);
        }, 1500);
        return;
      }
      
      // Check file type
      if (!file.name.endsWith('.json')) {
        setError('Please upload a JSON file.');
        setLoading(false);
        return;
      }
      
      // Read the file
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const jsonData = JSON.parse(content);
          
          // Process the data
          let combinedData: SpotifyStreamingEntry[] = [];
          
          if (append && rawData.length > 0) {
            // Combine with existing data
            combinedData = [...rawData, ...jsonData];
            
            // Remove duplicates
            combinedData = removeDuplicates(combinedData);
            
            // Update raw data store
            setRawData(combinedData);
            
            // Process the combined data
            const processedData = processSpotifyData(combinedData);
            setData(processedData);
          } else {
            // Process new data only
            setRawData(jsonData);
            const processedData = processSpotifyData(jsonData);
            setData(processedData);
          }
          
          // Save processed data to current profile
          if (currentProfileId) {
            try {
              const dataToSave = append ? processSpotifyData(combinedData) : processSpotifyData(jsonData);
              await updateProfile(currentProfileId, { streamingData: dataToSave });
              await loadProfiles(); // Refresh profile summaries
            } catch (storageError) {
              if (storageError instanceof Error) {
                setError(storageError.message);
              } else {
                setError('Failed to save data');
              }
              console.error('Storage error:', storageError);
              return; // Don't continue processing if save failed
            }
          }
        } catch (err) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('An error occurred while processing the file.');
          }
          console.error(err);
        } finally {
          setLoading(false);
          setIsAppending(false);
        }
      };
      
      reader.onerror = () => {
        setError('Failed to read the file.');
        setLoading(false);
        setIsAppending(false);
      };
      
      reader.readAsText(file);
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while processing the file.');
      }
      setLoading(false);
      setIsAppending(false);
      console.error(err);
    }
  };

  const handleReset = async () => {
    setData(null);
    setError(null);
    setRawData([]);
    // Clear current profile data
    if (currentProfileId) {
      await updateProfile(currentProfileId, { streamingData: null });
      await loadProfiles(); // Refresh profile summaries
    }
  };

  const handleSwitchProfile = async (profileId: string) => {
    setActiveProfile(profileId);
    setCurrentProfileId(profileId);
    setShowProfileDropdown(false);
    await loadProfileData(profileId);
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    
    const newProfile = await createProfile(newProfileName.trim());
    setActiveProfile(newProfile.id);
    setCurrentProfileId(newProfile.id);
    setNewProfileName('');
    setShowCreateProfile(false);
    setShowProfileDropdown(false);
    await loadProfiles();
    await loadProfileData(newProfile.id);
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (profiles.length <= 1) {
      alert("You can't delete the last profile. Create another profile first.");
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this profile and all its data?')) {
      await deleteProfile(profileId);
      await loadProfiles();
      
      // If deleted profile was active, switch to another one
      if (currentProfileId === profileId) {
        const remaining = await getProfileSummaries();
        if (remaining.length > 0) {
          await handleSwitchProfile(remaining[0].id);
        }
      }
    }
  };

  const getCurrentProfile = () => {
    return profiles.find(p => p.id === currentProfileId);
  };

  const handleAddMoreDataClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.endsWith('.json')) {
        handleFileSelect(file, true);
      } else {
        setError('Please upload a JSON file.');
      }
    }
  };

  const handleApiDataUpdated = async () => {
    // Reload profile data after API sync
    if (currentProfileId) {
      await loadProfileData(currentProfileId);
      await loadProfiles(); // Update profile summary stats
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <header className="bg-black bg-opacity-40 p-6 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Music className="h-8 w-8 text-green-500" />
            <h1 className="text-2xl font-bold">Spotify Stats Explorer</h1>
            
            {/* Profile Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="font-medium">{getCurrentProfile()?.name || 'Select Profile'}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showProfileDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-600 z-50">
                  <div className="p-2">
                    {profiles.map((profile) => (
                      <div key={profile.id} className="flex items-center justify-between p-2 hover:bg-gray-700 rounded-md">
                        <button
                          onClick={() => handleSwitchProfile(profile.id)}
                          className={`flex-1 text-left ${profile.id === currentProfileId ? 'text-green-400 font-medium' : 'text-gray-300'}`}
                        >
                          <div className="font-medium">{profile.name}</div>
                          <div className="text-xs text-gray-400">
                            {(profile.totalTracks || 0).toLocaleString()} tracks
                          </div>
                        </button>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setCurrentProfileId(profile.id);
                              setShowApiSettings(true);
                              setShowProfileDropdown(false);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                            title="API Settings"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          {profiles.length > 1 && (
                            <button
                              onClick={() => handleDeleteProfile(profile.id)}
                              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              title="Delete Profile"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t border-gray-600 mt-2 pt-2">
                      {/* Storage Usage Indicator */}
                      {storageStats && (
                        <div className="mb-3 p-2 bg-gray-900 rounded-md">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Storage Used</span>
                            <span>{storageStats.usagePercent}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                storageStats.usagePercent > 90 ? 'bg-red-500' : 
                                storageStats.usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(storageStats.usagePercent, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {storageStats.totalSizeMB}MB used • {storageStats.limitGB}
                          </div>
                        </div>
                      )}
                      
                      {showCreateProfile ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                            placeholder="Profile name..."
                            className="w-full bg-gray-700 text-white p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateProfile()}
                            autoFocus
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={handleCreateProfile}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Create
                            </button>
                            <button
                              onClick={() => { setShowCreateProfile(false); setNewProfileName(''); }}
                              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCreateProfile(true)}
                          className="w-full flex items-center space-x-2 p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Create New Profile</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {data && (
              <div className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                Data Saved ✓
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <SpotifyConnectButton />
            {data && (
              <button
                onClick={() => {
                  const confirmed = window.confirm(`Clear all data from "${getCurrentProfile()?.name}" profile and start fresh?`);
                  if (confirmed) {
                    handleReset();
                  }
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                title="Clear current profile data"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear Data</span>
              </button>
            )}
            {data && (
              <>
                {rawData.length > 0 && (
                  <>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept=".json" 
                      onChange={handleFileInputChange}
                    />
                    <button
                      onClick={handleAddMoreDataClick}
                      className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full transition-colors"
                    >
                      <FileUp size={16} />
                      <span>Add More Data</span>
                    </button>
                  </>
                )}
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full transition-colors"
                >
                  <span>Back to Upload</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-white p-4 rounded-lg mb-6">
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p className="text-xl">
              {isAppending ? "Merging and analyzing Spotify data..." : "Analyzing Spotify data..."}
            </p>
          </div>
        ) : data ? (
          <Dashboard 
            data={data} 
            onAddMoreData={(file) => handleFileSelect(file, true)}
            hasExistingData={rawData.length > 0}
          />
        ) : (
          <FileUploader 
            onFileSelect={handleFileSelect} 
          />
        )}
      </main>

      <footer className="bg-black bg-opacity-40 p-4 mt-12">
        <div className="container mx-auto text-center text-gray-400">
          <p>Spotify Stats Explorer &copy; 2025. Not affiliated with Spotify.</p>
        </div>
      </footer>

      {/* API Settings Modal */}
      {showApiSettings && currentProfileId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                API Settings - {getCurrentProfile()?.name}
              </h2>
              <button
                onClick={() => setShowApiSettings(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <ProfileApiSettings
                profileId={currentProfileId}
                onDataUpdated={handleApiDataUpdated}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;