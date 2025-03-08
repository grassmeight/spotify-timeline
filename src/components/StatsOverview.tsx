import React from 'react';
import { Clock, Music, User, Disc, Calendar } from 'lucide-react';

interface StatsOverviewProps {
  data: {
    total_stats: {
      total_listening_hours: number;
      total_listening_minutes: number;
      total_tracks_played: number;
      unique_artists: number;
      unique_albums: number;
      unique_tracks: number;
      average_track_length_seconds: number;
    };
    session_stats: {
      average_session_minutes: number;
      average_tracks_per_session: number;
      total_sessions: number;
    };
  };
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ data }) => {
  const { total_stats, session_stats } = data;
  
  const statCards = [
    {
      title: 'Listening Time',
      value: `${total_stats.total_listening_hours.toLocaleString()} hours`,
      icon: <Clock className="h-8 w-8 text-purple-400" />,
      color: 'bg-purple-500',
      detail: `${Math.round(total_stats.total_listening_minutes).toLocaleString()} minutes total`
    },
    {
      title: 'Tracks Played',
      value: total_stats.total_tracks_played.toLocaleString(),
      icon: <Music className="h-8 w-8 text-blue-400" />,
      color: 'bg-blue-500',
      detail: `${total_stats.unique_tracks.toLocaleString()} unique tracks`
    },
    {
      title: 'Artists',
      value: total_stats.unique_artists.toLocaleString(),
      icon: <User className="h-8 w-8 text-green-400" />,
      color: 'bg-green-500',
      detail: 'Unique artists'
    },
    {
      title: 'Albums',
      value: total_stats.unique_albums.toLocaleString(),
      icon: <Disc className="h-8 w-8 text-red-400" />,
      color: 'bg-red-500',
      detail: 'Unique albums'
    },
    {
      title: 'Listening Sessions',
      value: session_stats.total_sessions.toLocaleString(),
      icon: <Calendar className="h-8 w-8 text-yellow-400" />,
      color: 'bg-yellow-500',
      detail: `Avg. ${session_stats.average_session_minutes.toFixed(1)} minutes per session`
    },
    {
      title: 'Average Track Length',
      value: `${total_stats.average_track_length_seconds.toFixed(0)} seconds`,
      icon: <Clock className="h-8 w-8 text-indigo-400" />,
      color: 'bg-indigo-500',
      detail: `${(total_stats.average_track_length_seconds / 60).toFixed(1)} minutes per track`
    }
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Your Spotify Listening Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-gray-700 rounded-lg overflow-hidden shadow-lg">
            <div className={`h-2 ${card.color}`}></div>
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-gray-400 font-medium mb-1">{card.title}</h3>
                  <p className="text-3xl font-bold">{card.value}</p>
                  <p className="text-gray-400 text-sm mt-1">{card.detail}</p>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">{card.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 bg-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">What These Numbers Mean</h3>
        <p className="text-gray-300 mb-4">
          This overview shows your total Spotify listening activity. You've spent {total_stats.total_listening_hours.toLocaleString()} hours 
          listening to music, which is equivalent to {Math.round(total_stats.total_listening_hours / 24)} days of non-stop music!
        </p>
        <p className="text-gray-300">
          Your listening habits are diverse, with {total_stats.unique_artists.toLocaleString()} different artists and {total_stats.unique_albums.toLocaleString()} albums.
          On average, your listening sessions last about {session_stats.average_session_minutes.toFixed(1)} minutes, during which you typically 
          listen to {session_stats.average_tracks_per_session.toFixed(1)} tracks.
        </p>
      </div>
    </div>
  );
};

export default StatsOverview;