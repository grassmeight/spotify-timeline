import { getTrackAnalysis, analyzeMultipleTracks } from './spotifyApiService';

export interface GenreData {
  artist: string;
  track: string;
  genres: string[];
}

// Cache to store genre data and avoid redundant API calls
const genreCache = new Map<string, string[]>();

/**
 * Create cache key for a track
 */
const createCacheKey = (artist: string, track: string): string => {
  return `${artist}:${track}`.toLowerCase();
};

/**
 * Get genres for a specific track
 */
export const getTrackGenres = async (trackName: string, artistName: string, uri?: string): Promise<string[]> => {
  const cacheKey = createCacheKey(artistName, trackName);
  
  // Check cache first
  if (genreCache.has(cacheKey)) {
    return genreCache.get(cacheKey) || [];
  }
  
  try {
    // Use Spotify API to get track analysis which includes genres
    const analysis = await getTrackAnalysis(artistName, trackName, uri);
    
    if (analysis && analysis.genres.length > 0) {
      // Cache the genres
      genreCache.set(cacheKey, analysis.genres);
      return analysis.genres;
    }
    
    // If no genres found, return an empty array
    return [];
  } catch (error) {
    console.error(`Error getting genres for ${trackName} by ${artistName}:`, error);
    return [];
  }
};

/**
 * Get genres for multiple tracks efficiently
 */
export const getGenresForTracks = async (tracks: Array<{ track: string, artist: string, uri?: string }>): Promise<Record<string, string[]>> => {
  const results: Record<string, string[]> = {};
  const tracksToFetch: Array<{ artist: string; track: string; uri?: string }> = [];
  
  // First, check cache for all tracks
  for (const { track, artist, uri } of tracks) {
    const cacheKey = createCacheKey(artist, track);
    
    if (genreCache.has(cacheKey)) {
      results[cacheKey] = genreCache.get(cacheKey) || [];
    } else {
      tracksToFetch.push({ artist, track, uri });
    }
  }
  
  // If we need to fetch any tracks, do it in batch
  if (tracksToFetch.length > 0) {
    const analysisResults = await analyzeMultipleTracks(tracksToFetch);
    
    // Process the results
    for (const { artist, track } of tracksToFetch) {
      const key = createCacheKey(artist, track);
      const analysis = analysisResults[key];
      
      if (analysis) {
        genreCache.set(key, analysis.genres);
        results[key] = analysis.genres;
      } else {
        results[key] = [];
      }
    }
  }
  
  return results;
};

/**
 * Get top genres from a collection of tracks
 * Returns genres sorted by frequency
 */
export const getTopGenres = (tracks: Array<{ artist: string, track: string, count: number, genres: string[] }>): { genre: string, count: number }[] => {
  // Count genre occurrences, weighted by play count
  const genreCounts: Record<string, number> = {};
  
  for (const track of tracks) {
    for (const genre of track.genres) {
      if (!genre) continue;
      genreCounts[genre] = (genreCounts[genre] || 0) + track.count;
    }
  }
  
  // Convert to array and sort by count
  const sortedGenres = Object.entries(genreCounts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
  
  return sortedGenres;
};

/**
 * Group tracks by genre
 */
export const groupTracksByGenre = (tracks: Array<{ artist: string, track: string, count: number, genres: string[] }>): Record<string, { genre: string, tracks: { artist: string, track: string, count: number }[] }> => {
  const genreMap: Record<string, { genre: string, tracks: { artist: string, track: string, count: number }[] }> = {};
  
  // First, add all tracks to their primary genre
  for (const track of tracks) {
    // Use the first genre as primary, or "Unknown" if none
    const primaryGenre = track.genres.length > 0 ? track.genres[0] : "Unknown";
    
    if (!genreMap[primaryGenre]) {
      genreMap[primaryGenre] = {
        genre: primaryGenre,
        tracks: []
      };
    }
    
    genreMap[primaryGenre].tracks.push({
      artist: track.artist,
      track: track.track,
      count: track.count
    });
  }
  
  // Sort tracks within each genre by play count
  for (const genre in genreMap) {
    genreMap[genre].tracks.sort((a, b) => b.count - a.count);
  }
  
  return genreMap;
};