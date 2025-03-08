import React, { useState, useEffect } from 'react';
import { Doughnut, Radar, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';
import { Heart, Music, Zap, Mic2, Volume2, Headphones, Info, Database } from 'lucide-react';
import { analyzeStreamingHistory } from '../services/spotifyDataAnalyzer';
import { interpretAudioFeatures } from '../services/spotifyApiService';
import { isAuthenticated } from '../services/spotifyAuthService';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
  LinearScale,
  BarElement
);

interface LikabilityStatsProps {
  rawData: any[];
}

interface TrackLikabilityInfo {
  artist: string;
  track: string;
  count: number;
  likabilityScore: number;
  audioFeatures: any;
  genres: string[];
}

const LikabilityStats: React.FC<LikabilityStatsProps> = ({ rawData }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  const [selectedTrack, setSelectedTrack] = useState<TrackLikabilityInfo | null>(null);
  const [averageFeatures, setAverageFeatures] = useState<any>(null);
  const [likabilityDistribution, setLikabilityDistribution] = useState<{
    labels: string[];
    counts: number[];
  }>({
    labels: [],
    counts: []
  });
  const [apiInfo, setApiInfo] = useState<{
    spotify: number;
    mock: number;
    unknown: number;
  }>({
    spotify: 0,
    mock: 0,
    unknown: 0
  });

  // Check if connected to Spotify
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
      // Initial progress
      setProgress(5);
      
      // Analyze the streaming history
      const analysis = await analyzeStreamingHistory(rawData, spotifyConnected);
      
      // Progress update
      setProgress(70);
      
      // Store the analyzed data
      setAnalyzedData(analysis);
      
      // Extract track data for likability analysis
      if (analysis.analyzedTracks && analysis.analyzedTracks.length > 0) {
        // Calculate average audio features
        calculateAverageFeatures(analysis.analyzedTracks);
        
        // Calculate likability distribution
        calculateLikabilityDistribution(analysis.analyzedTracks);
        
        // Count API sources
        const apiCounts = {
          spotify: 0,
          mock: 0,
          unknown: 0
        };
        
        analysis.analyzedTracks.forEach((track: any) => {
          if (track.audioFeatures) {
            apiCounts.spotify++;
          } else if (track.likabilityScore > 0) {
            apiCounts.mock++;
          } else {
            apiCounts.unknown++;
          }
        });
        
        setApiInfo(apiCounts);
        
        // Set the default selected track to the one with highest likability
        if (analysis.analyzedTracks.length > 0) {
          const highestLikabilityTrack = [...analysis.analyzedTracks]
            .sort((a, b) => b.likabilityScore - a.likabilityScore)[0];
          
          setSelectedTrack(highestLikabilityTrack);
        }
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

  const calculateAverageFeatures = (tracks: TrackLikabilityInfo[]) => {
    if (!tracks || tracks.length === 0) return;
    
    const features = [
      'danceability', 'energy', 'speechiness', 
      'acousticness', 'instrumentalness', 'liveness', 'valence'
    ];
    
    const sums: Record<string, number> = {};
    features.forEach(feature => {
      sums[feature] = 0;
    });
    
    let validTracksCount = 0;
    
    tracks.forEach(track => {
      if (track.audioFeatures) {
        validTracksCount++;
        features.forEach(feature => {
          sums[feature] += track.audioFeatures[feature] || 0;
        });
      }
    });
    
    const averages: Record<string, number> = {};
    features.forEach(feature => {
      averages[feature] = validTracksCount > 0 ? 
        parseFloat((sums[feature] / validTracksCount).toFixed(3)) : 0;
    });
    
    setAverageFeatures(averages);
  };

  const calculateLikabilityDistribution = (tracks: TrackLikabilityInfo[]) => {
    if (!tracks || tracks.length === 0) return;
    
    // Create bins for likability scores
    const bins = [
      '0-10', '11-20', '21-30', '31-40', '41-50', 
      '51-60', '61-70', '71-80', '81-90', '91-100'
    ];
    
    const counts = Array(10).fill(0);
    
    tracks.forEach(track => {
      const score = track.likabilityScore;
      if (score >= 0 && score <= 100) {
        const binIndex = Math.min(Math.floor(score / 10), 9);
        counts[binIndex]++;
      }
    });
    
    setLikabilityDistribution({
      labels: bins,
      counts
    });
  };

  // Prepare radar chart data for audio features
  const prepareRadarData = (track: TrackLikabilityInfo) => {
    if (!track.audioFeatures || !averageFeatures) {
      return {
        labels: [],
        datasets: []
      };
    }
    
    return {
      labels: [
        'Danceability', 'Energy', 'Speechiness', 
        'Acousticness', 'Instrumentalness', 'Liveness', 'Valence'
      ],
      datasets: [
        {
          label: 'Selected Track',
          data: [
            track.audioFeatures.danceability || 0,
            track.audioFeatures.energy || 0,
            track.audioFeatures.speechiness || 0,
            track.audioFeatures.acousticness || 0,
            track.audioFeatures.instrumentalness || 0,
            track.audioFeatures.liveness || 0,
            track.audioFeatures.valence || 0
          ],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
        },
        {
          label: 'Your Average',
          data: averageFeatures ? [
            averageFeatures.danceability,
            averageFeatures.energy,
            averageFeatures.speechiness,
            averageFeatures.acousticness,
            averageFeatures.instrumentalness,
            averageFeatures.liveness,
            averageFeatures.valence
          ] : [],
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
        }
      ]
    };
  };

  // Radar chart options
  const radarOptions = {
    scales: {
      r: {
        angleLines: {
          color: 'rgba(255, 255, 255, 0.2)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)'
        },
        pointLabels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12
          }
        },
        ticks: {
          backdropColor: 'transparent',
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    }
  };

  // Likability distribution chart data
  const likabilityChartData = {
    labels: likabilityDistribution.labels,
    datasets: [
      {
        label: 'Number of Tracks',
        data: likabilityDistribution.counts,
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(255, 205, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(201, 203, 207, 0.7)',
          'rgba(255, 99, 255, 0.7)',
          'rgba(99, 255, 132, 0.7)',
          'rgba(99, 132, 255, 0.7)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(201, 203, 207, 1)',
          'rgba(255, 99, 255, 1)',
          'rgba(99, 255, 132, 1)',
          'rgba(99, 132, 255, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Bar chart options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    }
  };

  // Get likability score color
  const getLikabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  // Get likability score background
  const getLikabilityBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Get likability description
  const getLikabilityDescription = (score: number) => {
    if (score >= 80) return 'Highly Likable';
    if (score >= 60) return 'Very Likable';
    if (score >= 40) return 'Moderately Likable';
    if (score >= 20) return 'Somewhat Likable';
    return 'Less Likable';
  };

  // Get API source name
  const getApiSourceName = (source: string) => {
    switch (source) {
      case 'spotify':
        return 'Spotify API';
      case 'mock':
        return 'Generated Data';
      case 'unknown':
        return 'No Data';
      default:
        return source;
    }
  };

  if (isLoading && !analyzedData) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mb-4"></div>
        <p className="text-xl">Analyzing track likability...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Track Likability Analysis</h2>
      
      {isAnalyzing && (
        <div className="mb-6 bg-gray-700 rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-300">Analyzing track likability...</span>
            <span className="text-sm text-gray-300">{progress}%</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {!isAnalyzing && apiInfo.mock > 0 && (
        <div className="mb-6 bg-gray-700 rounded-lg p-4 flex items-center">
          <Database className="h-5 w-5 text-yellow-400 mr-2" />
          <div>
            <span className="text-sm text-gray-300">
              Data source: {apiInfo.spotify > 0 ? 'Mixed' : 'Generated Data'} 
              <span className="ml-2 text-yellow-400 text-xs">
                ({apiInfo.spotify} from Spotify API, {apiInfo.mock} generated)
              </span>
            </span>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Likability Distribution</h3>
          <div className="h-64">
            <Bar data={likabilityChartData} options={barOptions} />
          </div>
          <p className="mt-4 text-gray-300 text-sm">
            This chart shows the distribution of likability scores across your most played tracks.
            Higher scores indicate tracks that have features generally associated with popular and enjoyable music.
          </p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Top Tracks by Likability</h3>
          <div className="max-h-64 overflow-y-auto pr-2">
            {analyzedData?.analyzedTracks
              ?.sort((a: any, b: any) => b.likabilityScore - a.likabilityScore)
              .slice(0, 10)
              .map((track: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedTrack(track)}
                  className={`w-full text-left ${selectedTrack === track ? 'bg-gray-600' : 'bg-gray-800'} hover:bg-gray-600 rounded-lg p-3 mb-2 transition-colors`}
                >
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full ${getLikabilityBg(track.likabilityScore)} flex items-center justify-center mr-3 flex-shrink-0`}>
                      <Heart className="h-5 w-5 text-white" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-medium truncate">{track.track}</h4>
                      <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                    </div>
                    <div className="ml-auto pl-3">
                      <span className={`text-lg font-bold ${getLikabilityColor(track.likabilityScore)}`}>
                        {track.likabilityScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
      
      {selectedTrack && (
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg mb-8">
          <div className="flex flex-wrap justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold">{selectedTrack.track}</h3>
              <p className="text-gray-400">{selectedTrack.artist}</p>
              <div className="flex items-center mt-2">
                <div className={`px-3 py-1 rounded-full ${getLikabilityBg(selectedTrack.likabilityScore)} text-white font-medium flex items-center`}>
                  <Heart className="h-4 w-4 mr-1" />
                  <span>{selectedTrack.likabilityScore.toFixed(1)} - {getLikabilityDescription(selectedTrack.likabilityScore)}</span>
                </div>
                <span className="ml-3 text-gray-400 text-sm">{selectedTrack.count} plays</span>
              </div>
            </div>
            
            <div className="mt-4 lg:mt-0">
              <h4 className="font-medium mb-2">Genres</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTrack.genres && selectedTrack.genres.map((genre: string, index: number) => (
                  <span key={index} className="bg-gray-600 px-2 py-1 rounded-full text-sm">
                    {genre}
                  </span>
                ))}
                {(!selectedTrack.genres || selectedTrack.genres.length === 0) && (
                  <span className="bg-gray-600 px-2 py-1 rounded-full text-sm">Unknown Genre</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium mb-4">Audio Features</h4>
              <div className="h-64">
                {selectedTrack.audioFeatures && (
                  <Radar data={prepareRadarData(selectedTrack)} options={radarOptions} />
                )}
                {!selectedTrack.audioFeatures && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400">No audio feature data available</p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Feature Analysis</h4>
              {selectedTrack.audioFeatures ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="bg-pink-500 bg-opacity-20 p-2 rounded-lg mr-3">
                      <Music className="h-5 w-5 text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Danceability</span>
                        <span className="text-gray-400 text-sm">{(selectedTrack.audioFeatures.danceability * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-pink-500 h-2 rounded-full"
                          style={{ width: `${selectedTrack.audioFeatures.danceability * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {interpretAudioFeatures(selectedTrack.audioFeatures).danceability}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="bg-yellow-500 bg-opacity-20 p-2 rounded-lg mr-3">
                      <Zap className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Energy</span>
                        <span className="text-gray-400 text-sm">{(selectedTrack.audioFeatures.energy * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{ width: `${selectedTrack.audioFeatures.energy * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {interpretAudioFeatures(selectedTrack.audioFeatures).energy}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="bg-green-500 bg-opacity-20 p-2 rounded-lg mr-3">
                      <Heart className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Valence (Positivity)</span>
                        <span className="text-gray-400 text-sm">{(selectedTrack.audioFeatures.valence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${selectedTrack.audioFeatures.valence * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {interpretAudioFeatures(selectedTrack.audioFeatures).valence}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="bg-blue-500 bg-opacity-20 p-2 rounded-lg mr-3">
                      <Mic2 className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Acousticness</span>
                        <span className="text-gray-400 text-sm">{(selectedTrack.audioFeatures.acousticness * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${selectedTrack.audioFeatures.acousticness * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {interpretAudioFeatures(selectedTrack.audioFeatures).acousticness}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">No audio feature data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Info className="h-5 w-5 text-blue-400 mr-2" />
            <h3 className="text-xl font-bold">About Likability Analysis</h3>
          </div>
          <p className="text-gray-300 mb-4">
            The likability score is calculated based on audio features from Spotify's analysis and represents how likely a track is to be enjoyed by a general audience. 
            Factors include the track's positivity (valence), danceability, energy, and popularity.
          </p>
          <p className="text-gray-300">
            This analysis helps you understand what musical characteristics you tend to enjoy most, and which tracks in your listening history have features that are generally considered appealing.
          </p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Headphones className="h-5 w-5 text-purple-400 mr-2" />
            <h3 className="text-xl font-bold">Understanding Audio Features</h3>
          </div>
          <p className="text-gray-300 mb-4">
            <strong>Danceability:</strong> How suitable a track is for dancing based on tempo, rhythm stability, beat strength, and overall regularity.
          </p>
          <p className="text-gray-300 mb-4">
            <strong>Energy:</strong> A measure of intensity and activity. Energetic tracks feel fast, loud, and noisy.
          </p>
          <p className="text-gray-300 mb-4">
            <strong>Valence:</strong> The musical positiveness conveyed by a track. High valence sounds more positive (happy, cheerful), while low valence sounds more negative (sad, angry).
          </p>
          <p className="text-gray-300">
            <strong>Acousticness:</strong> A confidence measure of whether the track is acoustic (using acoustic instruments rather than electronic).
          </p>
        </div>
      </div>
    </div>
  );
};

export default LikabilityStats;