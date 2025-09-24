import React, { useMemo } from 'react';
import { Calendar, Clock, TrendingUp, Activity } from 'lucide-react';

interface TimelineStatsProps {
  data: any[];
}

const TimelineStats: React.FC<TimelineStatsProps> = ({ data }) => {
  const timelineData = useMemo(() => {
    // Group data by date
    const dateGroups: Record<string, any[]> = {};
    
    data.forEach(track => {
      const date = new Date(track.ts).toISOString().split('T')[0];
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(track);
    });

    // Calculate daily stats
    const dailyStats = Object.entries(dateGroups)
      .map(([date, tracks]) => ({
        date,
        tracks: tracks.length,
        totalMinutes: tracks.reduce((sum, track) => sum + (track.ms_played || 0), 0) / (1000 * 60),
        uniqueArtists: new Set(tracks.map(t => t.master_metadata_album_artist_name).filter(Boolean)).size,
        uniqueTracks: new Set(tracks.map(t => t.master_metadata_track_name).filter(Boolean)).size
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return dailyStats;
  }, [data]);

  const monthlyData = useMemo(() => {
    const monthGroups: Record<string, any> = {};
    
    timelineData.forEach(day => {
      const month = day.date.substring(0, 7); // YYYY-MM
      if (!monthGroups[month]) {
        monthGroups[month] = {
          month,
          totalTracks: 0,
          totalMinutes: 0,
          uniqueArtists: new Set(),
          uniqueTracks: new Set(),
          days: 0
        };
      }
      
      monthGroups[month].totalTracks += day.tracks;
      monthGroups[month].totalMinutes += day.totalMinutes;
      monthGroups[month].days += 1;
      
      // For monthly unique artists/tracks, we'd need to re-process the raw data
      // This is a simplified version
    });

    return Object.values(monthGroups).sort((a: any, b: any) => a.month.localeCompare(b.month));
  }, [timelineData]);

  const stats = useMemo(() => {
    if (timelineData.length === 0) return null;

    const totalDays = timelineData.length;
    const avgTracksPerDay = timelineData.reduce((sum, day) => sum + day.tracks, 0) / totalDays;
    const avgMinutesPerDay = timelineData.reduce((sum, day) => sum + day.totalMinutes, 0) / totalDays;
    
    const maxDay = timelineData.reduce((max, day) => day.tracks > max.tracks ? day : max);
    const minDay = timelineData.reduce((min, day) => day.tracks < min.tracks ? day : min);

    return {
      totalDays,
      avgTracksPerDay,
      avgMinutesPerDay,
      maxDay,
      minDay
    };
  }, [timelineData]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else {
      return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}m`;
    }
  };

  if (!stats) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400">No timeline data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-green-500 mb-6">Timeline Analysis</h2>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-3">
            <Calendar className="h-6 w-6 text-green-400 mr-3" />
            <h3 className="text-lg font-semibold">Active Days</h3>
          </div>
          <p className="text-3xl font-bold text-green-400">{stats.totalDays}</p>
          <p className="text-sm text-gray-400">days with activity</p>
        </div>

        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-3">
            <Activity className="h-6 w-6 text-blue-400 mr-3" />
            <h3 className="text-lg font-semibold">Daily Average</h3>
          </div>
          <p className="text-3xl font-bold text-blue-400">{Math.round(stats.avgTracksPerDay)}</p>
          <p className="text-sm text-gray-400">tracks per day</p>
        </div>

        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-3">
            <Clock className="h-6 w-6 text-purple-400 mr-3" />
            <h3 className="text-lg font-semibold">Daily Time</h3>
          </div>
          <p className="text-3xl font-bold text-purple-400">{formatDuration(stats.avgMinutesPerDay)}</p>
          <p className="text-sm text-gray-400">average per day</p>
        </div>

        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-3">
            <TrendingUp className="h-6 w-6 text-yellow-400 mr-3" />
            <h3 className="text-lg font-semibold">Peak Day</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-400">{stats.maxDay.tracks}</p>
          <p className="text-sm text-gray-400">{new Date(stats.maxDay.date).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-700 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Activity className="h-5 w-5 text-blue-400 mr-2" />
          Recent Activity (Last 10 Days)
        </h3>
        <div className="space-y-2">
          {timelineData.slice(-10).reverse().map((day, index) => (
            <div key={day.date} className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
              <div className="flex items-center space-x-4">
                <span className="text-gray-300 font-medium">
                  {new Date(day.date).toLocaleDateString()}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <span className="text-green-400">{day.tracks} tracks</span>
                <span className="text-blue-400">{formatDuration(day.totalMinutes)}</span>
                <span className="text-purple-400">{day.uniqueArtists} artists</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-gray-700 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-green-400 mr-2" />
          Monthly Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {monthlyData.slice(-6).map((month: any) => (
            <div key={month.month} className="p-4 bg-gray-600 rounded-lg">
              <h4 className="font-semibold text-green-400 mb-2">
                {new Date(month.month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Tracks:</span>
                  <span className="text-white">{month.totalTracks.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Time:</span>
                  <span className="text-white">{formatDuration(month.totalMinutes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Active Days:</span>
                  <span className="text-white">{month.days}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Daily Avg:</span>
                  <span className="text-white">{Math.round(month.totalTracks / month.days)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Extremes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-green-400 mr-2" />
            Most Active Day
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Date:</span>
              <span className="font-medium">{new Date(stats.maxDay.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Tracks:</span>
              <span className="font-medium text-green-400">{stats.maxDay.tracks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Listening Time:</span>
              <span className="font-medium">{formatDuration(stats.maxDay.totalMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Unique Artists:</span>
              <span className="font-medium">{stats.maxDay.uniqueArtists}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Activity className="h-5 w-5 text-red-400 mr-2" />
            Least Active Day
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Date:</span>
              <span className="font-medium">{new Date(stats.minDay.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Tracks:</span>
              <span className="font-medium text-red-400">{stats.minDay.tracks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Listening Time:</span>
              <span className="font-medium">{formatDuration(stats.minDay.totalMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Unique Artists:</span>
              <span className="font-medium">{stats.minDay.uniqueArtists}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineStats;
