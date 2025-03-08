import React, { useState, useEffect } from 'react';
import { User, Music, Disc, Search, X } from 'lucide-react';

interface FullContentProps {
  rawData: any[];
}

const FullContent: React.FC<FullContentProps> = ({ rawData }) => {
  const [activeTab, setActiveTab] = useState<'artists' | 'tracks' | 'albums'>('artists');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [sortedData, setSortedData] = useState<{
    artists: { name: string; count: number }[];
    tracks: { name: string; artist: string; count: number }[];
    albums: { name: string; artist: string; count: number }[];
  }>({
    artists: [],
    tracks: [],
    albums: []
  });

  const itemsPerPage = 50;

  useEffect(() => {
    if (rawData && rawData.length > 0) {
      processData();
    }
  }, [rawData]);

  const processData = () => {
    // Count artists
    const artistCounts: Record<string, number> = {};
    const trackCounts: Record<string, { count: number; artist: string }> = {};
    const albumCounts: Record<string, { count: number; artist: string }> = {};

    rawData.forEach(item => {
      // Process artists
      const artist = item.master_metadata_album_artist_name;
      if (artist) {
        artistCounts[artist] = (artistCounts[artist] || 0) + 1;
      }

      // Process tracks
      const track = item.master_metadata_track_name;
      if (track) {
        if (!trackCounts[track]) {
          trackCounts[track] = { count: 0, artist: artist || 'Unknown Artist' };
        }
        trackCounts[track].count += 1;
      }

      // Process albums
      const album = item.master_metadata_album_album_name;
      if (album) {
        if (!albumCounts[album]) {
          albumCounts[album] = { count: 0, artist: artist || 'Unknown Artist' };
        }
        albumCounts[album].count += 1;
      }
    });

    // Convert to arrays and sort
    const sortedArtists = Object.entries(artistCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const sortedTracks = Object.entries(trackCounts)
      .map(([name, data]) => ({ name, artist: data.artist, count: data.count }))
      .sort((a, b) => b.count - a.count);

    const sortedAlbums = Object.entries(albumCounts)
      .map(([name, data]) => ({ name, artist: data.artist, count: data.count }))
      .sort((a, b) => b.count - a.count);

    setSortedData({
      artists: sortedArtists,
      tracks: sortedTracks,
      albums: sortedAlbums
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const clearSearch = () => {
    setSearchTerm('');
    setPage(1);
  };

  const filteredData = () => {
    const term = searchTerm.toLowerCase();
    
    if (activeTab === 'artists') {
      return sortedData.artists.filter(item => 
        item.name.toLowerCase().includes(term)
      );
    } else if (activeTab === 'tracks') {
      return sortedData.tracks.filter(item => 
        item.name.toLowerCase().includes(term) || 
        item.artist.toLowerCase().includes(term)
      );
    } else {
      return sortedData.albums.filter(item => 
        item.name.toLowerCase().includes(term) || 
        item.artist.toLowerCase().includes(term)
      );
    }
  };

  const paginatedData = () => {
    const filtered = filteredData();
    const startIndex = (page - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = Math.ceil(filteredData().length / itemsPerPage);

  const renderPagination = () => {
    return (
      <div className="flex justify-between items-center mt-6">
        <div className="text-gray-400">
          Showing {Math.min(filteredData().length, 1 + (page - 1) * itemsPerPage)}-
          {Math.min(page * itemsPerPage, filteredData().length)} of {filteredData().length} items
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className={`px-3 py-1 rounded ${page === 1 ? 'bg-gray-700 text-gray-500' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
          >
            Previous
          </button>
          {totalPages > 0 && (
            <span className="px-3 py-1 bg-gray-700 rounded">
              Page {page} of {totalPages}
            </span>
          )}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className={`px-3 py-1 rounded ${page >= totalPages ? 'bg-gray-700 text-gray-500' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Full Content Explorer</h2>
      
      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={() => { setActiveTab('artists'); setPage(1); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            activeTab === 'artists' ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          <User size={18} />
          <span>Artists ({sortedData.artists.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('tracks'); setPage(1); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            activeTab === 'tracks' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          <Music size={18} />
          <span>Tracks ({sortedData.tracks.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('albums'); setPage(1); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            activeTab === 'albums' ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          <Disc size={18} />
          <span>Albums ({sortedData.albums.length})</span>
        </button>
        
        <div className="relative flex-grow max-w-md ml-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {searchTerm && (
            <button 
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X size={18} className="text-gray-400 hover:text-white" />
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-gray-700 rounded-lg overflow-hidden shadow-lg">
        {activeTab === 'artists' && (
          <div>
            <div className="grid grid-cols-12 bg-gray-800 text-gray-300 py-3 px-4 border-b border-gray-600">
              <div className="col-span-1 font-medium">#</div>
              <div className="col-span-8 font-medium">Artist</div>
              <div className="col-span-3 font-medium text-right">Play Count</div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {paginatedData().length > 0 ? (
                paginatedData().map((artist, index) => (
                  <div 
                    key={index} 
                    className="grid grid-cols-12 py-3 px-4 border-b border-gray-600 hover:bg-gray-600 transition-colors"
                  >
                    <div className="col-span-1 text-gray-400">
                      {(page - 1) * itemsPerPage + index + 1}
                    </div>
                    <div className="col-span-8 font-medium truncate">
                      {artist.name || 'Unknown Artist'}
                    </div>
                    <div className="col-span-3 text-right">
                      {artist.count.toLocaleString()} plays
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-400">
                  {searchTerm ? 'No artists match your search.' : 'No artist data available.'}
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'tracks' && (
          <div>
            <div className="grid grid-cols-12 bg-gray-800 text-gray-300 py-3 px-4 border-b border-gray-600">
              <div className="col-span-1 font-medium">#</div>
              <div className="col-span-5 font-medium">Track</div>
              <div className="col-span-3 font-medium">Artist</div>
              <div className="col-span-3 font-medium text-right">Play Count</div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {paginatedData().length > 0 ? (
                paginatedData().map((track, index) => (
                  <div 
                    key={index} 
                    className="grid grid-cols-12 py-3 px-4 border-b border-gray-600 hover:bg-gray-600 transition-colors"
                  >
                    <div className="col-span-1 text-gray-400">
                      {(page - 1) * itemsPerPage + index + 1}
                    </div>
                    <div className="col-span-5 font-medium truncate">
                      {track.name || 'Unknown Track'}
                    </div>
                    <div className="col-span-3 text-gray-300 truncate">
                      {track.artist || 'Unknown Artist'}
                    </div>
                    <div className="col-span-3 text-right">
                      {track.count.toLocaleString()} plays
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-400">
                  {searchTerm ? 'No tracks match your search.' : 'No track data available.'}
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'albums' && (
          <div>
            <div className="grid grid-cols-12 bg-gray-800 text-gray-300 py-3 px-4 border-b border-gray-600">
              <div className="col-span-1 font-medium">#</div>
              <div className="col-span-5 font-medium">Album</div>
              <div className="col-span-3 font-medium">Artist</div>
              <div className="col-span-3 font-medium text-right">Play Count</div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {paginatedData().length > 0 ? (
                paginatedData().map((album, index) => (
                  <div 
                    key={index} 
                    className="grid grid-cols-12 py-3 px-4 border-b border-gray-600 hover:bg-gray-600 transition-colors"
                  >
                    <div className="col-span-1 text-gray-400">
                      {(page - 1) * itemsPerPage + index + 1}
                    </div>
                    <div className="col-span-5 font-medium truncate">
                      {album.name || 'Unknown Album'}
                    </div>
                    <div className="col-span-3 text-gray-300 truncate">
                      {album.artist || 'Unknown Artist'}
                    </div>
                    <div className="col-span-3 text-right">
                      {album.count.toLocaleString()} plays
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-400">
                  {searchTerm ? 'No albums match your search.' : 'No album data available.'}
                </div>
              )}
            </div>
          </div>
        )}
        
        {renderPagination()}
      </div>
    </div>
  );
};

export default FullContent;