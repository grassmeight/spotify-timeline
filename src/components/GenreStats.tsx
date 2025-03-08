import React, { useState, useEffect } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Music, RefreshCw, Info, Database } from 'lucide-react';
import { getTrackInfo } from '../services/spotifyService';
import { extractSpotifyIdFromUri } from '../utils/spotifyUtils';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface GenreStatsProps {
  rawData: any[];
}

interface TrackGenreInfo {
  artist: string;
  track: string;
  count: number;
  genres: string[];
  source: string;
  spotifyId?: string | null;
}

interface GenreTrackInfo {
  name: string;
  count: number;
  tracks: {
    artist: string;
    track: string;
    count: number;
  }[];
}

const GenreStats: React.FC<GenreStatsProps> = ({ rawData }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [apiSource, setApiSource] = useState<string>('spotify');
  const [trackGenres, setTrackGenres] = useState<TrackGenreInfo[]>([]);
  const [genreData, setGenreData] = useState<{
    genreCounts: Record<string, number>;
    genreTracks: Record<string, GenreTrackInfo>;
    topGenres: { name: string; count: number }[];
    totalPlays: number;
  }>({
    genreCounts: {},
    genreTracks: {},
    topGenres: [],
    totalPlays: 0
  });
  
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'doughnut' | 'bar'>('doughnut');
  const [apiInfo, setApiInfo] = useState<{
    spotify: number;
    mock: number;
    unknown: number;
  }>({
    spotify: 0,
    mock: 0,
    unknown: 0
  });

  useEffect(() => {
    if (rawData && rawData.length > 0) {
      processInitialData();
    }
  }, [rawData]);

  const processInitialData = async () => {
    setIsLoading(true);
    
    try {
      // Count plays by track and artist
      const trackArtistCounts: Record<string, { artist: string; track: string; count: number; spotifyId?: string | null }> = {};
      
      rawData.forEach(item => {
        const artist = item.master_metadata_album_artist_name;
        const track = item.master_metadata_track_name;
        
        if (artist && track) {
          const key = `${artist}:${track}`.toLowerCase();
          
          if (!trackArtistCounts[key]) {
            // Extract Spotify ID from URI if available
            let spotifyId = null;
            if (item.spotify_track_uri) {
              spotifyId = extractSpotifyIdFromUri(item.spotify_track_uri);
            }
            
            trackArtistCounts[key] = { 
              artist, 
              track, 
              count: 0,
              spotifyId
            };
          }
          
          trackArtistCounts[key].count += 1;
        }
      });
      
      // Convert to array and sort by play count
      const sortedTracks = Object.values(trackArtistCounts)
        .sort((a, b) => b.count - a.count);
      
      // Get top 100 tracks for genre analysis
      const topTracks = sortedTracks.slice(0, 100);
      
      // Initialize with "Unknown" genre
      const initialTrackGenres: TrackGenreInfo[] = topTracks.map(({ artist, track, count, spotifyId }) => ({
        artist,
        track,
        count,
        genres: ['Unknown'],
        source: 'unknown',
        spotifyId
      }));
      
      setTrackGenres(initialTrackGenres);
      processGenreData(initialTrackGenres);
      setIsLoading(false);
      
      // Start Spotify API-based genre analysis in the background
      analyzeGenresWithSpotify(topTracks);
    } catch (error) {
      console.error('Error processing initial data:', error);
      setIsLoading(false);
    }
  };

  const analyzeGenresWithSpotify = async (tracks: { artist: string; track: string; count: number; spotifyId?: string | null }[]) => {
    setIsAnalyzing(true);
    setProgress(0);
    
    try {
      // Process results
      const updatedTrackGenres: TrackGenreInfo[] = [];
      const apiCounts = { spotify: 0, mock: 0, unknown: 0 };
      const totalTracks = tracks.length;
      
      // Process tracks in smaller batches to show incremental progress
      const batchSize = 5;
      for (let i = 0; i < tracks.length; i += batchSize) {
        const batchTracks = tracks.slice(i, Math.min(i + batchSize, tracks.length));
        
        // Process each track in the batch
        for (let j = 0; j < batchTracks.length; j++) {
          const { artist, track, count, spotifyId } = batchTracks[j];
          
          try {
            // Get track info from Spotify API, prioritizing the Spotify ID if available
            const analysis = await getTrackInfo(artist, track, spotifyId);
            
            if (analysis && analysis.genres && analysis.genres.length > 0) {
              updatedTrackGenres.push({
                artist,
                track,
                count,
                genres: analysis.genres,
                source: analysis.source,
                spotifyId
              });
              
              // Count API sources
              apiCounts[analysis.source as keyof typeof apiCounts]++;
            } else {
              // Use "Unknown" if API failed to find genres
              updatedTrackGenres.push({
                artist,
                track,
                count,
                genres: ['Unknown'],
                source: 'unknown',
                spotifyId
              });
              
              apiCounts.unknown++;
            }
          } catch (error) {
            console.error(`Error analyzing track ${artist} - ${track}:`, error);
            
            // Use "Unknown" if API failed
            updatedTrackGenres.push({
              artist,
              track,
              count,
              genres: ['Unknown'],
              source: 'unknown',
              spotifyId
            });
            
            apiCounts.unknown++;
          }
        }
        
        // Update progress after each batch
        const processedCount = Math.min(i + batchSize, totalTracks);
        const progressPercent = Math.round((processedCount / totalTracks) * 100);
        setProgress(progressPercent);
        
        // Update UI with partial results
        if (updatedTrackGenres.length > 0 && updatedTrackGenres.length % (batchSize * 2) === 0) {
          setTrackGenres([...updatedTrackGenres]);
          processGenreData([...updatedTrackGenres]);
          setApiInfo({...apiCounts});
        }
        
        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Final update with all results
      setTrackGenres(updatedTrackGenres);
      processGenreData(updatedTrackGenres);
      setApiInfo(apiCounts);
      
      // Set the API source based on what was most used
      if (apiCounts.spotify > apiCounts.mock) {
        setApiSource('spotify');
      } else if (apiCounts.mock > 0) {
        setApiSource('mock');
      }
      
    } catch (error) {
      console.error('Error analyzing genres with Spotify API:', error);
    } finally {
      setIsAnalyzing(false);
      setProgress(100);
    }
  };

  const processGenreData = (trackGenreData: TrackGenreInfo[]) => {
    // Count plays by genre
    const genreCounts: Record<string, number> = {};
    const genreTracks: Record<string, GenreTrackInfo> = {};
    
    trackGenreData.forEach(({ artist, track, count, genres }) => {
      // Use the first genre as the primary genre
      const primaryGenre = genres[0] || 'Unknown';
      
      // Count plays by genre
      genreCounts[primaryGenre] = (genreCounts[primaryGenre] || 0) + count;
      
      // Group tracks by genre
      if (!genreTracks[primaryGenre]) {
        genreTracks[primaryGenre] = {
          name: primaryGenre,
          count: 0,
          tracks: []
        };
      }
      
      genreTracks[primaryGenre].count += count;
      genreTracks[primaryGenre].tracks.push({ artist, track, count });
    });
    
    // Sort tracks within each genre by play count
    Object.keys(genreTracks).forEach(genre => {
      genreTracks[genre].tracks.sort((a, b) => b.count - a.count);
    });
    
    // Get top genres
    const topGenres = Object.entries(genreCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    // Calculate total plays
    const totalPlays = Object.values(genreCounts).reduce((sum, count) => sum + count, 0);
    
    setGenreData({ genreCounts, genreTracks, topGenres, totalPlays });
    
    // Set the default selected genre to the top genre
    if (topGenres.length > 0 && !selectedGenre) {
      setSelectedGenre(topGenres[0].name);
    }
  };

  // Prepare chart data
  const chartData = {
    labels: genreData.topGenres.slice(0, 10).map(genre => genre.name),
    datasets: [
      {
        data: genreData.topGenres.slice(0, 10).map(genre => genre.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)',
          'rgba(83, 102, 255, 0.8)',
          'rgba(255, 99, 255, 0.8)',
          'rgba(99, 255, 132, 0.8)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
          'rgba(83, 102, 255, 1)',
          'rgba(255, 99, 255, 1)',
          'rgba(99, 255, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 20,
          font: {
            size: 12
          }
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            const percentage = ((value / genreData.totalPlays) * 100).toFixed(1);
            return `${context.label}: ${value} plays (${percentage}%)`;
          }
        }
      },
    },
  };

  // Bar chart options
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            const percentage = ((value / genreData.totalPlays) * 100).toFixed(1);
            return `${value} plays (${percentage}%)`;
          }
        }
      },
    },
    scales: {
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        }
      },
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        }
      }
    }
  };

  const getGenreColor = (genreName: string) => {
    const index = genreData.topGenres.findIndex(g => g.name === genreName);
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-yellow-500',
      'bg-teal-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-gray-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-green-500',
    ];
    
    return colors[index % colors.length];
  };

  // Get API source name
  const getApiSourceName = (source: string) => {
    switch (source) {
      case 'spotify':
        return 'Spotify API';
      case 'mock':
        return 'Generated Data';
      case 'unknown':
        return 'No Genre Data';
      default:
        return source;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mb-4"></div>
        <p className="text-xl">Loading genre data...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Genre Statistics</h2>
      
      <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('doughnut')}
            className={`px-3 py-1 rounded-md ${viewMode === 'doughnut' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
          >
            Doughnut Chart
          </button>
          <button
            onClick={() => setViewMode('bar')}
            className={`px-3 py-1 rounded-md ${viewMode === 'bar' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
          >
            Bar Chart
          </button>
        </div>
        
        {isAnalyzing ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-500"></div>
            <span className="text-sm text-gray-300">Analyzing genres... {progress}%</span>
          </div>
        ) : (
          <div className="text-sm text-gray-300 flex items-center">
            <Database className="h-4 w-4 mr-1" />
            <span>Data source: {getApiSourceName(apiSource)}</span>
            {apiInfo.mock > 0 && (
              <span className="ml-2 text-yellow-400 text-xs">
                ({apiInfo.spotify} from API, {apiInfo.mock} generated)
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Top Genres</h3>
          <div className="h-64">
            {viewMode === 'doughnut' ? (
              <Doughnut data={chartData} options={chartOptions} />
            ) : (
              <Bar 
                data={{
                  labels: chartData.labels,
                  datasets: [{
                    label: 'Plays',
                    data: chartData.datasets[0].data,
                    backgroundColor: chartData.datasets[0].backgroundColor,
                    borderColor: chartData.datasets[0].borderColor,
                    borderWidth: 1
                  }]
                }} 
                options={barChartOptions} 
              />
            )}
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Genre Breakdown</h3>
          <div className="max-h-64 overflow-y-auto pr-2">
            {genreData.topGenres.slice(0, 10).map((genre, index) => (
              <button
                key={index}
                onClick={() => setSelectedGenre(genre.name)}
                className={`w-full text-left ${selectedGenre === genre.name ? 'bg-gray-600' : 'bg-gray-800'} hover:bg-gray-600 rounded-lg p-3 mb-2 transition-colors`}
              >
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${getGenreColor(genre.name)} mr-3`}></div>
                  <span className="font-medium">{genre.name}</span>
                  <span className="ml-auto text-gray-400">{genre.count} plays</span>
                  <span className="ml-2 text-gray-400 text-sm">
                    ({((genre.count / genreData.totalPlays) * 100).toFixed(1)}%)
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {selectedGenre && genreData.genreTracks[selectedGenre] && (
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg mb-8">
          <h3 className="text-xl font-bold mb-4">
            Top Tracks in {selectedGenre}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {genreData.genreTracks[selectedGenre].tracks.slice(0, 10).map((track, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <Music className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-medium truncate">{track.track}</p>
                    <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                  </div>
                  <span className="ml-auto text-gray-400">{track.count} plays</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Info className="h-5 w-5 text-blue-400 mr-2" />
            <h3 className="text-xl font-bold">About Genre Analysis</h3>
          </div>
          <p className="text-gray-300 mb-4">
            Genre analysis helps you understand your musical preferences across different styles and categories.
            This data is derived from your listening history and enhanced with genre information from the Spotify API.
          </p>
          <p className="text-gray-300">
            The charts show your most listened genres by play count. Select a genre to see the top tracks within that category.
          </p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Genre Distribution</h3>
          <p className="text-gray-300 mb-4">
            Your top genre is <span className="font-medium">{genreData.topGenres[0]?.name || 'Unknown'}</span> with {genreData.topGenres[0]?.count || 0} plays
            ({genreData.topGenres[0] ? ((genreData.topGenres[0].count / genreData.totalPlays) * 100).toFixed(1) : 0}% of your listening).
          </p>
          <p className="text-gray-300">
            {genreData.topGenres.length > 5 ? (
              <>Your listening is spread across {genreData.topGenres.length} different genres, showing a diverse taste in music.</>
            ) : (
              <>Your listening is concentrated in a few key genres, showing focused musical preferences.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GenreStats;