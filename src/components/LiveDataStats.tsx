import React, { useState, useEffect } from 'react';
import { Music, Clock, User, Disc, BarChart2, Activity, TrendingUp, PlayCircle, Calendar } from 'lucide-react';
import { getCurrentUser, getRecentlyPlayed, getTopTracks, getTopArtists, SpotifyUser, isAuthenticated } from '../services/spotifyAuthService';

const LiveDataStats: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<SpotifyUser | null>(null);
  const [recentTracks, setRecentTracks] = useState<Array<{ track: { name: string; artists: Array<{ name: string }> }; played_at: string }>>([]);
  const [topTracks, setTopTracks] = useState<Array<{ name: string; artists: Array<{ name: string }> }>>([]);
  const [topArtists, setTopArtists] = useState<Array<{ name: string; genres?: string[] }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const fetchLiveData = async () => {
      const authenticated = isAuthenticated();
      setIsConnected(authenticated);

      if (!authenticated) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching live Spotify data...');

        // Fetch user profile
        const user = await getCurrentUser();
        setCurrentUser(user);

        // Fetch recently played tracks
        const recent = await getRecentlyPlayed(10);
        setRecentTracks(recent.items || []);

        // Fetch top tracks (short term)
        const topT = await getTopTracks('short_term', 5);
        setTopTracks(topT.items || []);

        // Fetch top artists (short term)
        const topA = await getTopArtists('short_term', 5);
        setTopArtists(topA.items || []);

        console.log('Live data fetched successfully');
        setError(null);
      } catch (err) {
        console.error('Error fetching live data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch live data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveData();
  }, []);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="mb-6">
          <Music className="h-24 w-24 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-400 mb-2">Connect to Spotify</h2>
          <p className="text-gray-500 max-w-md">
            Connect your Spotify account to view your current listening activity, 
            recently played tracks, and real-time music insights.
          </p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-lg">
          <h3 className="font-semibold text-white mb-3">What you'll see here:</h3>
          <div className="space-y-2 text-gray-300">
            <div className="flex items-center">
              <PlayCircle className="h-4 w-4 mr-2 text-green-500" />
              <span>Currently playing track</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-green-500" />
              <span>Recently played tracks (last 50)</span>
            </div>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
              <span>Your current top tracks & artists</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-green-500" />
              <span>Short & long-term listening trends</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mb-4"></div>
        <p className="text-xl mb-2">Fetching your live Spotify data...</p>
        <p className="text-sm">This might take a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <Activity className="h-16 w-16 text-red-400 mb-4" />
        <p className="text-xl mb-2 text-red-400">Error Loading Live Data</p>
        <p className="text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-green-500">Your Live Spotify Activity</h2>
        {currentUser && (
          <div className="flex items-center space-x-3 text-gray-300">
            <User className="h-5 w-5" />
            <span>Welcome, {currentUser.display_name}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Profile */}
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-3">
            <User className="h-6 w-6 text-green-400 mr-3" />
            <h3 className="text-xl font-semibold">Profile</h3>
          </div>
          {currentUser ? (
            <>
              <p className="text-gray-300">Display Name: {currentUser.display_name}</p>
              <p className="text-gray-300">Country: {currentUser.country}</p>
              <p className="text-gray-300">Product: {currentUser.product}</p>
              <p className="text-gray-300">Followers: {currentUser.followers?.total || 0}</p>
            </>
          ) : (
            <p className="text-gray-300">Loading profile...</p>
          )}
        </div>

        {/* Recent Activity Summary */}
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-3">
            <Clock className="h-6 w-6 text-blue-400 mr-3" />
            <h3 className="text-xl font-semibold">Recent Activity</h3>
          </div>
          <p className="text-gray-300">Recent tracks: {recentTracks.length}</p>
          <p className="text-gray-300">Last played: {recentTracks[0] ? new Date(recentTracks[0].played_at).toLocaleString() : 'N/A'}</p>
        </div>

        {/* Top This Month */}
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-3">
            <BarChart2 className="h-6 w-6 text-purple-400 mr-3" />
            <h3 className="text-xl font-semibold">Top This Month</h3>
          </div>
          <p className="text-gray-300">Top Track: {topTracks[0]?.name || 'N/A'}</p>
          <p className="text-gray-300">Top Artist: {topArtists[0]?.name || 'N/A'}</p>
        </div>
      </div>

      {/* Recently Played Tracks List */}
      <div className="bg-gray-700 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Activity className="h-5 w-5 text-yellow-400 mr-2" /> Recently Played Tracks
        </h3>
        <ul className="space-y-3 text-gray-300">
          {recentTracks.length > 0 ? (
            recentTracks.map((item, index) => (
              <li key={index} className="flex items-center space-x-3 p-2 rounded bg-gray-600">
                <Music className="h-4 w-4 text-green-400" />
                <div className="flex-1">
                  <p className="font-medium">{item.track.name}</p>
                  <p className="text-sm text-gray-400">{item.track.artists.map((a) => a.name).join(', ')}</p>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(item.played_at).toLocaleTimeString()}
                </div>
              </li>
            ))
          ) : (
            <li>No recent tracks found</li>
          )}
        </ul>
      </div>

      {/* Top Artists & Tracks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <User className="h-5 w-5 text-red-400 mr-2" /> Top Artists (Recent)
          </h3>
          <ul className="space-y-2 text-gray-300">
            {topArtists.length > 0 ? (
              topArtists.map((artist, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className="text-green-400 font-bold">{index + 1}.</span>
                  <span>{artist.name}</span>
                  <span className="text-xs text-gray-400">({artist.genres?.slice(0, 2).join(', ') || 'No genres'})</span>
                </li>
              ))
            ) : (
              <li>No top artists data available</li>
            )}
          </ul>
        </div>
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Disc className="h-5 w-5 text-teal-400 mr-2" /> Top Tracks (Recent)
          </h3>
          <ul className="space-y-2 text-gray-300">
            {topTracks.length > 0 ? (
              topTracks.map((track, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className="text-green-400 font-bold">{index + 1}.</span>
                  <div>
                    <p className="font-medium">{track.name}</p>
                    <p className="text-xs text-gray-400">{track.artists.map((a) => a.name).join(', ')}</p>
                  </div>
                </li>
              ))
            ) : (
              <li>No top tracks data available</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LiveDataStats;