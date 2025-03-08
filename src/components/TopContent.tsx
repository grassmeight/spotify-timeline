import React from 'react';
import { User, Music, Disc } from 'lucide-react';

interface TopContentProps {
  topContent: {
    top_artists: Record<string, number>;
    top_tracks: Record<string, number>;
    top_albums: Record<string, number>;
  };
}

const TopContent: React.FC<TopContentProps> = ({ topContent }) => {
  const { top_artists, top_tracks, top_albums } = topContent;

  // Convert record objects to arrays for easier rendering
  const artistsArray = Object.entries(top_artists).map(([name, count]) => ({ name, count }));
  const tracksArray = Object.entries(top_tracks).map(([name, count]) => ({ name, count }));
  const albumsArray = Object.entries(top_albums).map(([name, count]) => ({ name, count }));

  // Find the maximum count for each category to calculate percentages
  const maxArtistCount = Math.max(...artistsArray.map(item => item.count));
  const maxTrackCount = Math.max(...tracksArray.map(item => item.count));
  const maxAlbumCount = Math.max(...albumsArray.map(item => item.count));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Your Top Content</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Artists */}
        <div className="bg-gray-700 rounded-lg overflow-hidden shadow-lg">
          <div className="bg-purple-600 px-6 py-4 flex items-center">
            <User className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-bold">Top Artists</h3>
          </div>
          <div className="p-6">
            <ul className="space-y-4">
              {artistsArray.slice(0, 10).map((artist, index) => (
                <li key={index} className="relative">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium truncate pr-2">{artist.name || 'Unknown Artist'}</span>
                    <span className="text-gray-400 text-sm">{artist.count} plays</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{ width: `${(artist.count / maxArtistCount) * 100}%` }}
                    ></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Top Tracks */}
        <div className="bg-gray-700 rounded-lg overflow-hidden shadow-lg">
          <div className="bg-blue-600 px-6 py-4 flex items-center">
            <Music className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-bold">Top Tracks</h3>
          </div>
          <div className="p-6">
            <ul className="space-y-4">
              {tracksArray.slice(0, 10).map((track, index) => (
                <li key={index} className="relative">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium truncate pr-2">{track.name || 'Unknown Track'}</span>
                    <span className="text-gray-400 text-sm">{track.count} plays</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(track.count / maxTrackCount) * 100}%` }}
                    ></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Top Albums */}
        <div className="bg-gray-700 rounded-lg overflow-hidden shadow-lg">
          <div className="bg-green-600 px-6 py-4 flex items-center">
            <Disc className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-bold">Top Albums</h3>
          </div>
          <div className="p-6">
            <ul className="space-y-4">
              {albumsArray.slice(0, 10).map((album, index) => (
                <li key={index} className="relative">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium truncate pr-2">{album.name || 'Unknown Album'}</span>
                    <span className="text-gray-400 text-sm">{album.count} plays</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(album.count / maxAlbumCount) * 100}%` }}
                    ></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">About Your Top Content</h3>
        <p className="text-gray-300">
          Your top artists, tracks, and albums reflect your most frequent listening choices on Spotify. 
          The bars represent the relative frequency of plays, with longer bars indicating more plays.
          This data can reveal your music preferences and listening habits over time.
        </p>
      </div>
    </div>
  );
};

export default TopContent;