import React, { useState, useEffect } from 'react';
import { Key, RefreshCw, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { testSpotifyCredentials, getAllRecentTracks, convertRecentTracksToStreamingData, getUserOAuthUrl, getUserAccessToken } from '../services/userSpotifyApiService';
import { updateProfile, getProfile } from '../services/indexedDBProfileService';

interface ProfileApiSettingsProps {
  profileId: string;
  onDataUpdated: () => void;
}

const ProfileApiSettings: React.FC<ProfileApiSettingsProps> = ({ profileId, onDataUpdated }) => {
  const [credentials, setCredentials] = useState({ clientId: '', clientSecret: '' });
  const [isEnabled, setIsEnabled] = useState(false);
  const [isTestingCredentials, setIsTestingCredentials] = useState(false);
  const [credentialsValid, setCredentialsValid] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authStep, setAuthStep] = useState(1); // 1: Credentials, 2: Authorization, 3: Ready

  const loadCredentials = React.useCallback(async () => {
    try {
      const profile = await getProfile(profileId);
      if (profile?.spotifyApiCredentials) {
        setCredentials({
          clientId: profile.spotifyApiCredentials.clientId,
          clientSecret: profile.spotifyApiCredentials.clientSecret
        });
        setIsEnabled(profile.spotifyApiCredentials.enabled);
        setLastSync(profile.spotifyApiCredentials.lastSync || null);
        setIsAuthorized(!!profile.spotifyApiCredentials.accessToken);
        if (profile.spotifyApiCredentials.accessToken) {
          setAuthStep(3);
        } else if (profile.spotifyApiCredentials.clientId && profile.spotifyApiCredentials.clientSecret) {
          setAuthStep(2);
        }
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  }, [profileId]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const handleTestCredentials = async () => {
    if (!credentials.clientId.trim() || !credentials.clientSecret.trim()) {
      setError('Please enter both Client ID and Client Secret');
      return;
    }

    setIsTestingCredentials(true);
    setError(null);
    setCredentialsValid(null);

    try {
      const isValid = await testSpotifyCredentials(credentials);
      setCredentialsValid(isValid);
      if (!isValid) {
        setError('Invalid credentials. Please check your Client ID and Client Secret.');
      }
    } catch (error) {
      console.error('Error testing credentials:', error);
      setCredentialsValid(false);
      setError(error instanceof Error ? error.message : 'Failed to test credentials');
    } finally {
      setIsTestingCredentials(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!credentialsValid) {
      setError('Please test your credentials first');
      return;
    }

    try {
      await updateProfile(profileId, {
        spotifyApiCredentials: {
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          enabled: isEnabled,
          lastSync: lastSync || undefined
        }
      });
      setSuccess('Credentials saved successfully! Next step: Authorize your app.');
      setAuthStep(2);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving credentials:', error);
      setError('Failed to save credentials');
    }
  };

  const handleAuthorizeApp = () => {
    // For Electron apps, use localhost callback
    const redirectUri = 'http://localhost:8888/callback';
    const authUrl = getUserOAuthUrl(credentials, redirectUri);
    
    // Save state for when they return
    localStorage.setItem('pending_auth_profile', profileId);
    localStorage.setItem('pending_auth_credentials', JSON.stringify(credentials));
    
    window.open(authUrl, 'spotify_auth', 'width=400,height=500');
  };

  const handleAuthReturn = React.useCallback(async (code: string) => {
    try {
      const savedProfileId = localStorage.getItem('pending_auth_profile');
      const savedCredentials = localStorage.getItem('pending_auth_credentials');
      
      if (savedProfileId === profileId && savedCredentials) {
        const creds = JSON.parse(savedCredentials);
        const redirectUri = 'http://localhost:8888/callback';
        
        const tokenData = await getUserAccessToken(creds, code, redirectUri);
        
        await updateProfile(profileId, {
          spotifyApiCredentials: {
            ...creds,
            enabled: true,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            tokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour
          }
        });
        
        setIsAuthorized(true);
        setAuthStep(3);
        setSuccess('Authorization successful! You can now sync data.');
        
        // Clean up
        localStorage.removeItem('pending_auth_profile');
        localStorage.removeItem('pending_auth_credentials');
        
        // Clear URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('Authorization failed. Please try again.');
    }
  }, [profileId]);

  // Check for returning auth code (simplified - in real app you'd handle this properly)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state === 'user_api_auth') {
      handleAuthReturn(code);
    }
  }, [handleAuthReturn]);

  const handleSyncRecentData = async () => {
    if (!isAuthorized) {
      setError('Please authorize your app first');
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      // Get stored access token
      const profile = await getProfile(profileId);
      const accessToken = profile?.spotifyApiCredentials?.accessToken;
      
      if (!accessToken) {
        setError('No access token found. Please re-authorize your app.');
        return;
      }

      // Fetch recent tracks from Spotify API
      const recentTracks = await getAllRecentTracks(accessToken, 1000);
      
      if (recentTracks.length === 0) {
        setError('No recent tracks found. Make sure you have been listening to music on Spotify recently.');
        return;
      }

      // Convert to our streaming data format
      const newStreamingData = convertRecentTracksToStreamingData(recentTracks);

      // Get existing profile data
      const existingProfile = await getProfile(profileId);
      let combinedData = newStreamingData;

      if (existingProfile?.streamingData) {
        // Merge with existing data, avoiding duplicates
        const existingData = Array.isArray(existingProfile.streamingData) 
          ? existingProfile.streamingData 
          : (existingProfile.streamingData as { rawData?: unknown[] })?.rawData || [];

        // Create a set of existing timestamps to avoid duplicates
        const existingTimestamps = new Set(existingData.map((item: { ts: string }) => item.ts));
        
        // Filter out tracks that already exist
        const uniqueNewData = newStreamingData.filter(item => !existingTimestamps.has(item.ts));
        
        // Combine data (new data first, then existing)
        combinedData = [...uniqueNewData, ...existingData];
      }

      // Update profile with combined data
      await updateProfile(profileId, {
        streamingData: combinedData,
        spotifyApiCredentials: {
          clientId: existingProfile?.spotifyApiCredentials?.clientId || '',
          clientSecret: existingProfile?.spotifyApiCredentials?.clientSecret || '',
          enabled: existingProfile?.spotifyApiCredentials?.enabled || false,
          lastSync: new Date().toISOString(),
          accessToken: existingProfile?.spotifyApiCredentials?.accessToken,
          refreshToken: existingProfile?.spotifyApiCredentials?.refreshToken,
          tokenExpiry: existingProfile?.spotifyApiCredentials?.tokenExpiry
        }
      });

      setLastSync(new Date().toISOString());
      setSuccess(`Successfully synced ${newStreamingData.length} tracks from your recent Spotify activity!`);
      
      // Notify parent component to refresh data
      onDataUpdated();

    } catch (error) {
      console.error('Error syncing recent data:', error);
      setError(error instanceof Error ? error.message : 'Failed to sync recent data');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-gray-700 rounded-lg p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Key className="h-6 w-6 text-green-400" />
        <h3 className="text-xl font-bold">Spotify API Integration</h3>
      </div>

      <div className="bg-blue-500 bg-opacity-20 border border-blue-500 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-2">How to get your Spotify API credentials:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-200">
              <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center">Spotify Developer Dashboard <ExternalLink className="h-3 w-3 ml-1" /></a></li>
              <li>Create a new app (or use an existing one)</li>
              <li>Add "http://localhost:8888/callback" to Redirect URIs in your app settings</li>
              <li>Copy your Client ID and Client Secret</li>
            </ol>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 p-4 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500 bg-opacity-20 border border-green-500 text-green-300 p-4 rounded-lg">
          {success}
        </div>
      )}

        <div className="space-y-6">
        {/* Step 1: API Credentials */}
        <div className={`space-y-4 ${authStep > 1 ? 'opacity-75' : ''}`}>
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
              authStep > 1 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
            }`}>
              {authStep > 1 ? '✓' : '1'}
            </div>
            <h4 className="font-medium text-white">API Credentials</h4>
          </div>
          
          <div className="ml-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={credentials.clientId}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                placeholder="Your Spotify Client ID"
                disabled={authStep > 1}
                className="w-full bg-gray-600 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Client Secret
              </label>
              <input
                type="password"
                value={credentials.clientSecret}
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                placeholder="Your Spotify Client Secret"
                disabled={authStep > 1}
                className="w-full bg-gray-600 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              />
            </div>

            {authStep === 1 && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleTestCredentials}
                  disabled={isTestingCredentials || !credentials.clientId.trim() || !credentials.clientSecret.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isTestingCredentials ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : credentialsValid === true ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : credentialsValid === false ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Key className="h-4 w-4" />
                  )}
                  <span>
                    {isTestingCredentials ? 'Testing...' : 
                     credentialsValid === true ? 'Valid' :
                     credentialsValid === false ? 'Invalid' : 'Test Credentials'}
                  </span>
                </button>

                <button
                  onClick={handleSaveCredentials}
                  disabled={!credentialsValid}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Save & Continue
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Authorization */}
        {authStep >= 2 && (
          <div className={`space-y-4 ${authStep > 2 ? 'opacity-75' : ''}`}>
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                authStep > 2 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
              }`}>
                {authStep > 2 ? '✓' : '2'}
              </div>
              <h4 className="font-medium text-white">Authorize Your App</h4>
            </div>
            
            <div className="ml-8">
              <p className="text-sm text-gray-400 mb-4">
                You need to authorize your Spotify app to access your listening data.
              </p>
              
              {authStep === 2 && (
                <button
                  onClick={handleAuthorizeApp}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Authorize App</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Sync Data */}
        {authStep >= 3 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-green-500 text-white">
                ✓
              </div>
              <h4 className="font-medium text-white">Sync Recent Data</h4>
            </div>
            
            <div className="ml-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-400">
                    Fetch your recent Spotify listening activity and merge it with existing data
                  </p>
                  {lastSync && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last sync: {new Date(lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSyncRecentData}
                  disabled={!isAuthorized || isSyncing}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>{isSyncing ? 'Syncing...' : 'Sync Recent Data'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileApiSettings;
