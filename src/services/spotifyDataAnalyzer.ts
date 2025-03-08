import { getTrackAnalysis, analyzeMultipleTracks } from './spotifyApiService';
import { getGenresForTracks, getTopGenres, groupTracksByGenre } from './genreService';
import { extractSpotifyIdFromUri } from '../utils/spotifyUtils';

// Type definitions for Spotify streaming history
export interface SpotifyStreamingHistoryEntry {
  ts: string;                                  // Timestamp
  username: string;                            // Spotify username
  platform: string;                            // Platform used
  ms_played: number;                           // Milliseconds played
  conn_country: string;                        // Country code
  master_metadata_track_name: string;          // Track name
  master_metadata_album_artist_name: string;   // Artist name
  master_metadata_album_album_name: string;    // Album name
  spotify_track_uri: string;                   // Spotify track URI
  reason_start: string;                        // Reason track started
  reason_end: string;                          // Reason track ended
  shuffle: boolean | null;                     // Whether shuffle was enabled
  skipped: boolean | null;                     // Whether track was skipped
  offline: boolean | null;                     // Whether in offline mode
  offline_timestamp: number | null;            // Offline timestamp
  incognito_mode: boolean | null;              // Whether in incognito mode
}

export interface AnalyzedTrack {
  artist: string;
  track: string;
  count: number;
  totalMsPlayed: number;
  uri: string | null;
  genres: string[];
  audioFeatures?: any;
  likabilityScore: number;
}

/**
 * Parse streaming history data
 */
export const parseStreamingHistory = (jsonString: string): SpotifyStreamingHistoryEntry[] => {
  try {
    // Clean up the JSON - Spotify's export format can be inconsistent
    let cleanedJson = jsonString.trim();
    
    // Handle case where each JSON object starts with {"ts" but isn't properly formatted as an array
    if (cleanedJson.startsWith('{')) {
      cleanedJson = '[' + cleanedJson + ']';
      // Replace adjacent JSON objects to form a valid array
      cleanedJson = cleanedJson.replace(/}{/g, '},{');
    }
    
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error('Error parsing Spotify streaming history:', error);
    throw new Error('Invalid streaming history format');
  }
};

/**
 * Analyze Spotify streaming history to extract insights
 */
export const analyzeStreamingHistory = async (historyData: SpotifyStreamingHistoryEntry[], enhanceWithSpotify = true) => {
  // Track stats per artist/track
  const trackStats: Record<string, {
    artist: string;
    track: string;
    count: number;
    totalMsPlayed: number;
    uri: string | null;
  }> = {};
  
  // Process each history entry
  for (const entry of historyData) {
    const artist = entry.master_metadata_album_artist_name;
    const track = entry.master_metadata_track_name;
    
    if (!artist || !track) continue;
    
    const key = `${artist}:${track}`.toLowerCase();
    
    if (!trackStats[key]) {
      trackStats[key] = {
        artist,
        track,
        count: 0,
        totalMsPlayed: 0,
        uri: entry.spotify_track_uri || null
      };
    }
    
    trackStats[key].count++;
    trackStats[key].totalMsPlayed += entry.ms_played;
  }
  
  // Convert to array and sort by play count
  const sortedTracks = Object.values(trackStats)
    .sort((a, b) => b.count - a.count);
  
  // Limit to top tracks for analysis
  const topTracks = sortedTracks.slice(0, 100);
  
  // Calculate behavior stats
  const behaviorStats = calculateBehaviorStats(historyData);
  
  // Calculate platform stats
  const platformStats = calculatePlatformStats(historyData);
  
  // Calculate listening patterns
  const listeningPatterns = calculateListeningPatterns(historyData);
  
  // If enhancing with Spotify data
  if (enhanceWithSpotify) {
    // Prepare tracks for Spotify analysis
    const tracksForAnalysis = topTracks.map(track => ({
      artist: track.artist,
      track: track.track,
      uri: track.uri || undefined
    }));
    
    // Get track analysis from Spotify
    const analysisResults = await analyzeMultipleTracks(tracksForAnalysis);
    
    // Get genres for tracks
    const genreResults = await getGenresForTracks(tracksForAnalysis);
    
    // Combine results
    const analyzedTracks: AnalyzedTrack[] = topTracks.map(track => {
      const key = `${track.artist}:${track.track}`.toLowerCase();
      const analysis = analysisResults[key];
      const genres = genreResults[key] || [];
      
      return {
        artist: track.artist,
        track: track.track,
        count: track.count,
        totalMsPlayed: track.totalMsPlayed,
        uri: track.uri,
        genres,
        audioFeatures: analysis?.audioFeatures || null,
        likabilityScore: analysis?.likabilityScore || 0
      };
    });
    
    // Calculate top genres
    const topGenres = getTopGenres(analyzedTracks);
    
    // Group tracks by genre
    const tracksByGenre = groupTracksByGenre(analyzedTracks);
    
    return {
      analyzedTracks,
      totalTracks: Object.keys(trackStats).length,
      totalPlays: Object.values(trackStats).reduce((sum, track) => sum + track.count, 0),
      totalMsPlayed: Object.values(trackStats).reduce((sum, track) => sum + track.totalMsPlayed, 0),
      behaviorStats,
      platformStats,
      listeningPatterns,
      topGenres,
      tracksByGenre
    };
  }
  
  // If not enhancing with Spotify, return basic analysis
  return {
    tracks: sortedTracks,
    totalTracks: Object.keys(trackStats).length,
    totalPlays: Object.values(trackStats).reduce((sum, track) => sum + track.count, 0),
    totalMsPlayed: Object.values(trackStats).reduce((sum, track) => sum + track.totalMsPlayed, 0),
    behaviorStats,
    platformStats,
    listeningPatterns
  };
};

/**
 * Calculate behavior statistics
 */
const calculateBehaviorStats = (historyData: SpotifyStreamingHistoryEntry[]) => {
  let skipCount = 0;
  let offlineCount = 0;
  let shuffleCount = 0;
  let totalEntries = 0;
  
  // Count behaviors
  for (const entry of historyData) {
    totalEntries++;
    if (entry.skipped === true) skipCount++;
    if (entry.offline === true) offlineCount++;
    if (entry.shuffle === true) shuffleCount++;
  }
  
  // Calculate rates
  const skipRate = totalEntries > 0 ? Math.round((skipCount / totalEntries) * 100) : 0;
  const offlineRate = totalEntries > 0 ? Math.round((offlineCount / totalEntries) * 100) : 0;
  const shuffleRate = totalEntries > 0 ? Math.round((shuffleCount / totalEntries) * 100) : 0;
  
  return {
    skip_rate: skipRate,
    offline_rate: offlineRate,
    shuffle_rate: shuffleRate
  };
};

/**
 * Calculate platform statistics
 */
const calculatePlatformStats = (historyData: SpotifyStreamingHistoryEntry[]) => {
  const platforms: Record<string, number> = {};
  
  // Count plays by platform
  for (const entry of historyData) {
    if (!entry.platform) continue;
    
    // Normalize platform names
    let platform = entry.platform;
    
    // For mobile platforms
    if (platform.includes('Android') || platform.includes('iOS') || platform.includes('iPhone')) {
      platform = 'Mobile';
    }
    // For desktop platforms
    else if (platform.includes('Windows') || platform.includes('Mac') || platform.includes('OSX') || platform.includes('Linux')) {
      platform = 'Desktop';
    }
    // For web players
    else if (platform.includes('Web')) {
      platform = 'Web Player';
    }
    // For smart speakers
    else if (platform.includes('Echo') || platform.includes('Alexa') || platform.includes('Sonos') || platform.includes('HomePod')) {
      platform = 'Smart Speaker';
    }
    
    platforms[platform] = (platforms[platform] || 0) + 1;
  }
  
  return platforms;
};

/**
 * Calculate listening patterns
 */
const calculateListeningPatterns = (historyData: SpotifyStreamingHistoryEntry[]) => {
  // Initialize counters
  const hourlyDistribution: Record<string, number> = {};
  const dailyDistribution: Record<string, number> = {};
  const monthlyDistribution: Record<string, number> = {};
  
  // Count plays by hour, day, and month
  for (const entry of historyData) {
    if (!entry.ts) continue;
    
    try {
      const date = new Date(entry.ts);
      
      // Count by hour (0-23)
      const hour = date.getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      
      // Count by day of week (0-6, starting with Sunday)
      const dayOfWeek = date.getDay();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[dayOfWeek];
      dailyDistribution[dayName] = (dailyDistribution[dayName] || 0) + 1;
      
      // Count by month (1-12)
      const month = date.getMonth() + 1; // JavaScript months are 0-indexed
      monthlyDistribution[month] = (monthlyDistribution[month] || 0) + 1;
    } catch (error) {
      console.error('Error parsing date:', error);
    }
  }
  
  // Find peak hour
  let peakHour = 0;
  let peakHourCount = 0;
  for (const [hour, count] of Object.entries(hourlyDistribution)) {
    if (count > peakHourCount) {
      peakHourCount = count;
      peakHour = parseInt(hour);
    }
  }
  
  // Find peak day
  let peakDay = 'Monday';
  let peakDayCount = 0;
  for (const [day, count] of Object.entries(dailyDistribution)) {
    if (count > peakDayCount) {
      peakDayCount = count;
      peakDay = day;
    }
  }
  
  return {
    peak_hour: peakHour,
    peak_day: peakDay,
    hourly_distribution: hourlyDistribution,
    daily_distribution: dailyDistribution,
    monthly_distribution: monthlyDistribution
  };
};