import React, { useState, useEffect } from 'react';
import { Music, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { isAuthenticated, logout, getAuthUrl, getCurrentUser, SpotifyUser } from '../services/spotifyAuthService';

interface SpotifyConnectButtonProps {
  onConnectionChange?: (connected: boolean) => void;
}

const SpotifyConnectButton: React.FC<SpotifyConnectButtonProps> = ({ onConnectionChange }) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = React.useCallback(async () => {
    try {
      if (isAuthenticated()) {
        setConnected(true);
        try {
          const userProfile = await getCurrentUser();
          setUser(userProfile);
        } catch (userError) {
          console.error('Error fetching user profile:', userError);
          // Still consider connected even if user fetch fails
          setUser(null);
        }
      } else {
        setConnected(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setConnected(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);


  const handleConnect = async () => {
    try {
      const authUrl = await getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to Spotify');
    }
  };

  const handleDisconnect = () => {
    logout();
    setConnected(false);
    setUser(null);
    if (onConnectionChange) onConnectionChange(false);
  };

  if (loading) {
    return (
      <button className="flex items-center space-x-2 bg-gray-700 text-white px-4 py-2 rounded-lg opacity-50 cursor-not-allowed">
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
        <span>Checking...</span>
      </button>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center">
        {user && (
          <div className="mr-3 hidden md:flex items-center">
            {user.images && user.images.length > 0 ? (
              <img 
                src={user.images[0].url} 
                alt={user.display_name} 
                className="w-8 h-8 rounded-full mr-2"
              />
            ) : (
              <div className="w-8 h-8 bg-green-500 rounded-full mr-2 flex items-center justify-center">
                <Music className="h-4 w-4 text-white" />
              </div>
            )}
            <span className="text-gray-300 text-sm">{user.display_name}</span>
          </div>
        )}
        <button
          onClick={handleDisconnect}
          className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          <span>Disconnect Spotify</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <button
        onClick={handleConnect}
        className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        <LogIn size={16} />
        <span>Connect Spotify</span>
      </button>
      {error && (
        <div className="ml-2 text-red-400 text-sm flex items-center">
          <AlertCircle size={14} className="mr-1" />
          <span>API Error</span>
        </div>
      )}
    </div>
  );
};

export default SpotifyConnectButton;