import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../services/spotifyAuthService';

const SpotifyCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [success, setSuccess] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const authError = urlParams.get('error');

      if (authError) {
        setError(`Authentication failed: ${authError}`);
        setLoading(false);
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code found');
        setLoading(false);
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      try {
        // Exchange code for access token
        await getAccessToken(code);
        
        // Mark as successful
        setSuccess(true);
        setLoading(false);
        
        // Redirect to home page after a short delay
        setTimeout(() => navigate('/'), 1500);
      } catch (err) {
        console.error('Error during token exchange:', err);
        if (err instanceof Error) {
          setError(`Failed to complete authentication: ${err.message}`);
        } else {
          setError('Failed to complete authentication');
        }
        setLoading(false);
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl p-8 shadow-lg max-w-md w-full">
        {error ? (
          <div className="text-center">
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-white p-4 rounded-lg mb-6">
              <p>{error}</p>
            </div>
            <p className="text-gray-400">Redirecting you back...</p>
          </div>
        ) : loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mb-4 mx-auto"></div>
            <h2 className="text-2xl font-bold mb-2">Completing Authentication</h2>
            <p className="text-gray-400">Please wait while we connect your Spotify account...</p>
          </div>
        ) : success ? (
          <div className="text-center">
            <div className="bg-green-500 bg-opacity-20 border border-green-500 text-white p-4 rounded-lg mb-6">
              <p>Authentication successful!</p>
            </div>
            <p className="text-gray-400">Redirecting you back to the app...</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 text-white p-4 rounded-lg mb-6">
              <p>Processing authentication...</p>
            </div>
            <p className="text-gray-400">Please wait...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifyCallback;