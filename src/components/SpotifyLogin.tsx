import React, { useEffect, useState } from 'react';
import { Music, LogIn } from 'lucide-react';
import { getAuthUrl, isAuthenticated, logout, getAccessToken, getCurrentUser, SpotifyUser } from '../services/spotifyAuthService';

interface SpotifyLoginProps {
  onLoginSuccess: () => void;
}

const SpotifyLogin: React.FC<SpotifyLoginProps> = ({ onLoginSuccess }) => {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthentication = React.useCallback(async () => {
    try {
      setLoading(true);
      
      if (isAuthenticated()) {
        try {
          // Get actual user profile from Spotify
          const userProfile = await getCurrentUser();
          setUser(userProfile);
          onLoginSuccess();
        } catch (userError) {
          console.error('Error fetching user profile:', userError);
          // Still mark as authenticated but without user data
          setUser(null);
          onLoginSuccess();
        }
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      // Clear any invalid tokens
      logout();
    } finally {
      setLoading(false);
    }
  }, [onLoginSuccess]);

  const handleAuthCode = React.useCallback(async (code: string) => {
    try {
      setLoading(true);
      
      // Exchange code for access token
      await getAccessToken(code);
      console.log('Login process completed successfully');
      
      // Get user profile after successful token exchange
      try {
        const userProfile = await getCurrentUser();
        setUser(userProfile);
      } catch (userError) {
        console.error('Error fetching user profile:', userError);
        // Still continue with login even if user profile fails
        setUser(null);
      }
      
      onLoginSuccess();
    } catch (error) {
      console.error('Error handling auth code:', error);
      setError('Failed to complete authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onLoginSuccess]);

  useEffect(() => {
    // Check if we're returning from Spotify auth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (code) {
      // Remove code from URL to prevent issues on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      handleAuthCode(code);
    } else if (error) {
      setError('Authentication failed: ' + error);
      setLoading(false);
    } else {
      // Check if already authenticated
      checkAuthentication();
    }
  }, [checkAuthentication, handleAuthCode]);

  const handleLogin = async () => {
    // Redirect to Spotify authorization page with PKCE
    try {
      const authUrl = await getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating login:', error);
      setError('Failed to initiate Spotify login. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mb-4"></div>
        <p className="text-xl">Connecting to Spotify...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center mb-6">
          <div className="bg-green-500 p-3 rounded-full mr-4">
            <Music className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Connected to Spotify</h2>
            <p className="text-gray-400">Logged in as {user.display_name}</p>
          </div>
        </div>
        
        <div className="flex items-center mb-6">
          {user.images && user.images.length > 0 ? (
            <img 
              src={user.images[0].url} 
              alt={user.display_name} 
              className="w-16 h-16 rounded-full mr-4"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-700 rounded-full mr-4 flex items-center justify-center">
              <Music className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <div>
            <p className="text-gray-300">Account type: {user.product}</p>
            <p className="text-gray-300">Country: {user.country}</p>
          </div>
        </div>
        
        <div className="flex justify-between">
          <button
            onClick={onLoginSuccess}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Continue
          </button>
          
          <button
            onClick={handleLogout}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-8 shadow-lg max-w-md mx-auto">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-green-500 p-4 rounded-full mb-4">
          <Music className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Connect with Spotify</h2>
        <p className="text-gray-400 text-center">
          Connect your Spotify account to enhance your stats with genre information and audio features.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-white p-4 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-bold mb-2">Why connect?</h3>
          <ul className="text-gray-300 space-y-2">
            <li>• Get accurate genre information for your tracks</li>
            <li>• Access audio features like danceability and energy</li>
            <li>• Enhance your stats with Spotify's rich metadata</li>
          </ul>
        </div>
        
        <button
          onClick={handleLogin}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
        >
          <LogIn className="h-5 w-5 mr-2" />
          Connect with Spotify
        </button>
        
        <p className="text-gray-400 text-sm text-center">
          We only request read access to your Spotify data. You can disconnect at any time.
        </p>
      </div>
    </div>
  );
};

export default SpotifyLogin;