import React from 'react';
import { Music, Clock, User, Disc, Activity, Calendar } from 'lucide-react';

interface GeneralStatsProps {
  data: Array<{
    ts: string;
    ms_played: number;
    master_metadata_track_name: string;
    master_metadata_album_artist_name: string;
    master_metadata_album_album_name?: string;
  }>;
}

const GeneralStats: React.FC<GeneralStatsProps> = ({ data }) => {
  // Calculate basic statistics
  const totalTracks = data.length;
  const uniqueArtists = new Set(data.map(track => track.master_metadata_album_artist_name).filter(Boolean)).size;
  const uniqueAlbums = new Set(data.map(track => track.master_metadata_album_album_name).filter(Boolean)).size;
  const uniqueTracks = new Set(data.map(track => track.master_metadata_track_name).filter(Boolean)).size;
  
  const totalMinutes = data.reduce((sum, track) => sum + (track.ms_played || 0), 0) / (1000 * 60);
  const totalHours = totalMinutes / 60;
  
  const averageTrackLength = data.length > 0 ? totalMinutes / data.length : 0;
  
  // Get date range
  const dates = data.map(track => new Date(track.ts)).filter(date => !isNaN(date.getTime()));
  const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
  
  // Calculate listening patterns
  const hourCounts: Record<number, number> = {};
  data.forEach(track => {
    const hour = new Date(track.ts).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const peakHour = Object.entries(hourCounts).reduce((a, b) => 
    hourCounts[parseInt(a[0])] > hourCounts[parseInt(b[0])] ? a : b
  )?.[0];
  
  // Day of week analysis
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayCounts: Record<string, number> = {};
  data.forEach(track => {
    const day = dayNames[new Date(track.ts).getDay()];
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  
  const peakDay = Object.entries(dayCounts).reduce((a, b) => 
    dayCounts[a[0]] > dayCounts[b[0]] ? a : b
  )?.[0];

  // Top artists
  const artistCounts: Record<string, number> = {};
  data.forEach(track => {
    if (track.master_metadata_album_artist_name) {
      const artist = track.master_metadata_album_artist_name;
      artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    }
  });
  
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top tracks
  const trackCounts: Record<string, number> = {};
  data.forEach(track => {
    if (track.master_metadata_track_name && track.master_metadata_album_artist_name) {
      const trackKey = `${track.master_metadata_track_name} - ${track.master_metadata_album_artist_name}`;
      trackCounts[trackKey] = (trackCounts[trackKey] || 0) + 1;
    }
  });
  
  const topTracks = Object.entries(trackCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    } else if (minutes < 1440) {
      return `${Math.round(minutes / 60)} hrs`;
    } else {
      return `${Math.round(minutes / 1440)} days`;
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-green-500 mb-6">Overview Statistics</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-3">
            <Music className="h-6 w-6 text-green-400 mr-3" />
            <h3 className="text-lg font-semibold">Total Plays</h3>
          </div>
          <p className="text-3xl font-bold text-green-400">{totalTracks.toLocaleString()}</p>
          <p className="text-sm text-gray-400">streaming entries</p>
        </div>

        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-3">
            <Clock className="h-6 w-6 text-blue-400 mr-3" />
            <h3 className="text-lg font-semibold">Total Time</h3>
          </div>
          <p className="text-3xl font-bold text-blue-400">{formatDuration(totalMinutes)}</p>
          <p className="text-sm text-gray-400">{Math.round(totalHours).toLocaleString()} hours total</p>
        </div>

        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-3">
            <User className="h-6 w-6 text-purple-400 mr-3" />
            <h3 className="text-lg font-semibold">Unique Artists</h3>
          </div>
          <p className="text-3xl font-bold text-purple-400">{uniqueArtists.toLocaleString()}</p>
          <p className="text-sm text-gray-400">different artists</p>
        </div>

        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-3">
            <Disc className="h-6 w-6 text-yellow-400 mr-3" />
            <h3 className="text-lg font-semibold">Unique Tracks</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-400">{uniqueTracks.toLocaleString()}</p>
          <p className="text-sm text-gray-400">different tracks</p>
        </div>
      </div>

      {/* Listening Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Activity className="h-5 w-5 text-orange-400 mr-2" />
            Listening Patterns
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Peak Hour:</span>
              <span className="font-medium">{peakHour ? `${peakHour}:00` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Peak Day:</span>
              <span className="font-medium">{peakDay || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Avg Track Length:</span>
              <span className="font-medium">{formatDuration(averageTrackLength)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Unique Albums:</span>
              <span className="font-medium">{uniqueAlbums.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Calendar className="h-5 w-5 text-teal-400 mr-2" />
            Data Range
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">First Entry:</span>
              <span className="font-medium">{minDate ? minDate.toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Last Entry:</span>
              <span className="font-medium">{maxDate ? maxDate.toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Time Span:</span>
              <span className="font-medium">
                {minDate && maxDate 
                  ? `${Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))} days`
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Daily Average:</span>
              <span className="font-medium">
                {minDate && maxDate
                  ? `${Math.round(totalTracks / ((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)))} plays`
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <User className="h-5 w-5 text-red-400 mr-2" />
            Top Artists
          </h3>
          <div className="space-y-3">
            {topArtists.map(([artist, count], index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-green-400 font-bold w-6">{index + 1}.</span>
                  <span className="text-gray-300 truncate">{artist}</span>
                </div>
                <span className="text-gray-400 text-sm">{count} plays</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Music className="h-5 w-5 text-green-400 mr-2" />
            Top Tracks
          </h3>
          <div className="space-y-3">
            {topTracks.map(([track, count], index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-green-400 font-bold w-6">{index + 1}.</span>
                  <span className="text-gray-300 truncate">{track}</span>
                </div>
                <span className="text-gray-400 text-sm">{count} plays</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralStats;
