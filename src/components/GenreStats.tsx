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
import { analyzeStreamingHistory } from '../services/spotifyDataAnalyzer';
import { getGenresForTracks, getTopGenres } from '../services/genreService';
import { isAuthenticated } from '../services/spotifyAuthService';

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

const GenreStats: React.FC<GenreStatsProps> = ({ rawData }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [apiSource, setApiSource] = useState<string>('spotify');
  const [analyzedData, setAnalyzedData] = useState<any>(null);
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

  // Check if we're connected to Spotify
  const spotifyConnected = isAuthenticated();

  useEffect(() => {
    if (rawData && rawData.length > 0) {
      processData();
    }
  }, [rawData]);

  const processData = async () => {
    setIsLoading(true);
    setIsAnalyzing(true);
    setProgress(0);
    
    try {
      // Increment progress to show work has started
      setProgress(5);
      
      // Analyze the raw data using the new service
      const analysis = await analyzeStreamingHistory(rawData, spotifyConnected);
      
      // Increment progress after analysis
      setProgress(70);
      
      // Set the analyzed data
      setAnalyzedData(analysis);
      
      // Count API sources
      if (analysis.analyzedTracks) {
        const apiCounts = {
          spotify: 0,
          mock: 0,
          unknown: 0
        };
        
        analysis.analyzedTracks.forEach((track: any) => {
          if (track.genres && track.genres.length > 0) {
            // Estimate source based on genre presence
            if (track.audioFeatures) {
              apiCounts.spotify++;
            } else {
              apiCounts.mock++;
            }
          } else {
            apiCounts.unknown++;
          }
        });
        
        setApiInfo(apiCounts);
        
        // Set API source based on majority
        if (apiCounts.spotify > apiCounts.mock) {
          setApiSource('spotify');
        } else if (apiCounts.mock > 0) {
          setApiSource('mock');
        }
      }
      
      // Set default selected genre if none selected yet
      if (analysis.topGenres && analysis.topGenres.length > 0 && !selectedGenre) {
        setSelectedGenre(analysis.topGenres[0].genre);
      }
      
      // Complete progress
      setProgress(100);
    } catch (error) {
      console.error('Error processing data:', error);
      setProgress(100);
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
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

  // Get genre color
  const getGenreColor = (genreName: string) => {
    const index = analyzedData?.topGenres?.findIndex((g: any) => g.genre === genreName) || 0;
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

  // Prepare chart data
  const prepareChartData = () => {
    if (!analyzedData || !analyzedData.topGenres) {
      return {
        labels: [],
        datasets: [{ data: [], backgroundColor: [], borderColor: [] }]
      };
    }
    
    const topGenres = analyzedData.topGenres.slice(0, 10);
    
    return {
      labels: topGenres.map((genre: any) => genre.genre),
      datasets: [
        {
          data: topGenres.map((genre: any) => genre.count),
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
  };

  // Chart options for doughnut chart
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
            const totalPlays = analyzedData?.totalPlays || 0;
            const percentage = totalPlays > 0 ? ((value / totalPlays) * 100).toFixed(1) : "0.0";
            return `${context.label}: ${value} plays (${percentage}%)`;
          }
        }
      },
    },
  };

  // Chart options for bar chart
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
            const totalPlays = analyzedData?.totalPlays || 0;
            const percentage = totalPlays > 0 ? ((value / totalPlays) * 100).toFixed(1) : "0.0";
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

  if (isLoading && !analyzedData) {
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
              <Doughnut data={prepareChartData()} options={chartOptions} />
            ) : (
              <Bar 
                data={prepareChartData()} 
                options={barChartOptions} 
              />
            )}
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Genre Breakdown</h3>
          <div className="max-h-64 overflow-y-auto pr-2">
            {analyzedData?.topGenres?.slice(0, 10).map((genre: any, index: number) => (
              <button
                key={index}
                onClick={() => setSelectedGenre(genre.genre)}
                className={`w-full text-left ${selectedGenre === genre.genre ? 'bg-gray-600' : 'bg-gray-800'} hover:bg-gray-600 rounded-lg p-3 mb-2 transition-colors`}
              >
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${getGenreColor(genre.genre)} mr-3`}></div>
                  <span className="font-medium">{genre.genre}</span>
                  <span className="ml-auto text-gray-400">{genre.count} plays</span>
                  <span className="ml-2 text-gray-400 text-sm">
                    ({analyzedData.totalPlays > 0 ? ((genre.count / analyzedData.totalPlays) * 100).toFixed(1) : "0.0"}%)
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {selectedGenre && analyzedData?.tracksByGenre?.[selectedGenre] && (
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg mb-8">
          <h3 className="text-xl font-bold mb-4">
            Top Tracks in {selectedGenre}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analyzedData.tracksByGenre[selectedGenre].tracks.slice(0, 10).map((track: any, index: number) => (
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
            Your top genre is <span className="font-medium">{analyzedData?.topGenres?.[0]?.genre || 'Unknown'}</span> with {analyzedData?.topGenres?.[0]?.count || 0} plays
            ({analyzedData?.topGenres?.[0] && analyzedData?.totalPlays ? ((analyzedData.topGenres[0].count / analyzedData.totalPlays) * 100).toFixed(1) : 0}% of your listening).
          </p>
          <p className="text-gray-300">
            {analyzedData?.topGenres?.length > 5 ? (
              <>Your listening is spread across {analyzedData.topGenres.length} different genres, showing a diverse taste in music.</>
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