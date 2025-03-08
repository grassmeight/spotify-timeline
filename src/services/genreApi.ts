import axios from 'axios';

// Interface for genre data
export interface GenreData {
  artist: string;
  track: string;
  genres: string[];
  source: string;
}

// Cache to store genre data and avoid redundant API calls
const genreCache: Record<string, GenreData> = {};

// Helper function to create a cache key
const createCacheKey = (artist: string, track: string): string => {
  return `${artist}:${track}`.toLowerCase();
};

// Helper function to check if a track is in the cache
const isInCache = (artist: string, track: string): boolean => {
  const key = createCacheKey(artist, track);
  return !!genreCache[key];
};

// Helper function to get genre data from cache
const getFromCache = (artist: string, track: string): GenreData | null => {
  const key = createCacheKey(artist, track);
  return genreCache[key] || null;
};

// Helper function to add genre data to cache
const addToCache = (data: GenreData): void => {
  const key = createCacheKey(data.artist, data.track);
  genreCache[key] = data;
};

// Safe error logging that avoids circular references
const safeLogError = (message: string, error: unknown): void => {
  if (error instanceof Error) {
    console.error(`${message}: ${error.message}`);
  } else {
    console.error(`${message}: Unknown error`);
  }
};

// Mock API responses for demo purposes
// This avoids CORS and rate limiting issues in the demo environment
const mockGenreData = (artist: string, track: string, source: string): GenreData => {
  // Create a deterministic but varied set of genres based on artist and track names
  const seed = (artist + track).toLowerCase();
  let genres: string[] = [];
  
  // Simulate API delay for more realistic progress indication
  // This is a mock function, so we can add artificial delays
  
  // Assign genres based on patterns in the artist/track name
  if (seed.includes('rock') || seed.includes('metal') || seed.includes('band')) {
    genres = ['rock', 'alternative rock', 'hard rock'];
  } else if (seed.includes('pop') || seed.includes('love') || seed.includes('girl')) {
    genres = ['pop', 'dance pop', 'electropop'];
  } else if (seed.includes('rap') || seed.includes('hip') || seed.includes('beat')) {
    genres = ['hip-hop', 'rap', 'trap'];
  } else if (seed.includes('country') || seed.includes('heart') || seed.includes('road')) {
    genres = ['country', 'americana', 'folk'];
  } else if (seed.includes('electro') || seed.includes('dance') || seed.includes('dj')) {
    genres = ['electronic', 'edm', 'house'];
  } else if (seed.includes('jazz') || seed.includes('blues') || seed.includes('soul')) {
    genres = ['jazz', 'soul', 'blues'];
  } else if (seed.includes('classical') || seed.includes('piano') || seed.includes('symphony')) {
    genres = ['classical', 'instrumental', 'orchestral'];
  } else {
    // Use characters from the artist and track names to create pseudo-random genres
    const genrePool = [
      'pop', 'rock', 'hip-hop', 'electronic', 'indie', 'alternative', 
      'r&b', 'dance', 'folk', 'ambient', 'jazz', 'metal', 'punk'
    ];
    
    // Select genres based on character codes in the seed
    const charSum = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const primaryGenreIndex = charSum % genrePool.length;
    let secondaryGenreIndex = (charSum + 7) % genrePool.length;
    
    // Ensure we don't pick the same genre twice
    if (secondaryGenreIndex === primaryGenreIndex) {
      secondaryGenreIndex = (secondaryGenreIndex + 1) % genrePool.length;
    }
    
    genres = [genrePool[primaryGenreIndex], genrePool[secondaryGenreIndex]];
    
    // Add a more specific subgenre based on artist name
    const artistChar = artist.charAt(0).toLowerCase();
    if (artistChar >= 'a' && artistChar <= 'm') {
      genres.push(`${genres[0]} fusion`);
    } else {
      genres.push(`alternative ${genres[0]}`);
    }
  }
  
  return {
    artist,
    track,
    genres,
    source
  };
};

// Simulate API delay for more realistic progress indication
const simulateApiDelay = async (): Promise<void> => {
  const delay = Math.floor(Math.random() * 300) + 100; // 100-400ms delay
  return new Promise(resolve => setTimeout(resolve, delay));
};

// MusicBrainz API (using mock for demo)
export const getMusicBrainzGenres = async (artist: string, track: string): Promise<GenreData | null> => {
  if (isInCache(artist, track)) {
    return getFromCache(artist, track);
  }

  try {
    // Simulate API delay
    await simulateApiDelay();
    
    // In a real app, we would make actual API calls
    // For demo purposes, we'll use mock data to avoid CORS and rate limiting issues
    const result = mockGenreData(artist, track, 'musicbrainz');
    addToCache(result);
    return result;
    
    /* Real implementation would be:
    // First, search for the recording
    const searchUrl = `https://musicbrainz.org/ws/2/recording/?query=recording:${encodeURIComponent(track)}%20AND%20artist:${encodeURIComponent(artist)}&fmt=json`;
    const searchResponse = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'SpotifyStatsExplorer/1.0.0 (contact@example.com)'
      }
    });

    if (searchResponse.data.recordings && searchResponse.data.recordings.length > 0) {
      // Process response and return genres
    }
    */
  } catch (error) {
    safeLogError('Error fetching from MusicBrainz', error);
    return null;
  }
};

// Last.fm API (using mock for demo)
export const getLastFmGenres = async (artist: string, track: string): Promise<GenreData | null> => {
  if (isInCache(artist, track)) {
    return getFromCache(artist, track);
  }

  try {
    // Simulate API delay
    await simulateApiDelay();
    
    // In a real app, we would make actual API calls
    // For demo purposes, we'll use mock data to avoid CORS and rate limiting issues
    const result = mockGenreData(artist, track, 'lastfm');
    addToCache(result);
    return result;
    
    /* Real implementation would be:
    const API_KEY = 'your_api_key';
    const trackUrl = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`;
    const trackResponse = await axios.get(trackUrl);
    // Process response and return genres
    */
  } catch (error) {
    safeLogError('Error fetching from Last.fm', error);
    return null;
  }
};

// Discogs API (using mock for demo)
export const getDiscogsGenres = async (artist: string, track: string): Promise<GenreData | null> => {
  if (isInCache(artist, track)) {
    return getFromCache(artist, track);
  }

  try {
    // Simulate API delay
    await simulateApiDelay();
    
    // In a real app, we would make actual API calls
    // For demo purposes, we'll use mock data to avoid CORS and rate limiting issues
    const result = mockGenreData(artist, track, 'discogs');
    addToCache(result);
    return result;
    
    /* Real implementation would be:
    const searchUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(artist)}+${encodeURIComponent(track)}&type=release&token=your_token`;
    const searchResponse = await axios.get(searchUrl);
    // Process response and return genres
    */
  } catch (error) {
    safeLogError('Error fetching from Discogs', error);
    return null;
  }
};

// Function to get genres from all sources and combine them
export const getGenresFromAllSources = async (artist: string, track: string): Promise<GenreData | null> => {
  if (isInCache(artist, track)) {
    return getFromCache(artist, track);
  }
  
  try {
    // Simulate API delay
    await simulateApiDelay();
    
    // Try all three sources in parallel
    const [musicBrainzResult, lastFmResult, discogsResult] = await Promise.allSettled([
      getMusicBrainzGenres(artist, track),
      getLastFmGenres(artist, track),
      getDiscogsGenres(artist, track)
    ]);
    
    // Combine genres from all successful results
    const allGenres: string[] = [];
    let source = 'combined';
    
    if (musicBrainzResult.status === 'fulfilled' && musicBrainzResult.value) {
      allGenres.push(...musicBrainzResult.value.genres);
      source = 'musicbrainz';
    }
    
    if (lastFmResult.status === 'fulfilled' && lastFmResult.value) {
      allGenres.push(...lastFmResult.value.genres);
      if (source === 'combined' || allGenres.length === 0) {
        source = 'lastfm';
      }
    }
    
    if (discogsResult.status === 'fulfilled' && discogsResult.value) {
      allGenres.push(...discogsResult.value.genres);
      if (source === 'combined' || allGenres.length === 0) {
        source = 'discogs';
      }
    }
    
    // Remove duplicates and normalize
    const uniqueGenres = [...new Set(allGenres.map(g => g.toLowerCase()))];
    
    if (uniqueGenres.length > 0) {
      const result: GenreData = {
        artist,
        track,
        genres: uniqueGenres,
        source
      };
      
      addToCache(result);
      return result;
    }
    
    // If no genres found, return Unknown
    const result: GenreData = {
      artist,
      track,
      genres: ['Unknown'],
      source: 'unknown'
    };
    
    addToCache(result);
    return result;
  } catch (error) {
    safeLogError('Error fetching genres from all sources', error);
    return null;
  }
};

// Function to get the best genre data from all sources
export const getBestGenreData = async (artist: string, track: string): Promise<GenreData | null> => {
  if (!artist || !track) {
    return null;
  }
  
  if (isInCache(artist, track)) {
    return getFromCache(artist, track);
  }
  
  try {
    // Simulate API delay
    await simulateApiDelay();
    
    // Try Last.fm first as it tends to have the most comprehensive genre data
    let result = await getLastFmGenres(artist, track);
    
    // If Last.fm doesn't have data or has limited data, try MusicBrainz
    if (!result || result.genres.length < 2 || result.genres[0] === 'Unknown') {
      const mbResult = await getMusicBrainzGenres(artist, track);
      if (mbResult && (!result || mbResult.genres.length > result.genres.length)) {
        result = mbResult;
      }
    }
    
    // If still no good data, try Discogs
    if (!result || result.genres.length < 2 || result.genres[0] === 'Unknown') {
      const discogsResult = await getDiscogsGenres(artist, track);
      if (discogsResult && (!result || discogsResult.genres.length > result.genres.length)) {
        result = discogsResult;
      }
    }
    
    // If we still don't have good data, try combining all sources
    if (!result || result.genres.length < 2 || result.genres[0] === 'Unknown') {
      const combinedResult = await getGenresFromAllSources(artist, track);
      if (combinedResult && (!result || combinedResult.genres.length > result.genres.length)) {
        result = combinedResult;
      }
    }
    
    if (result) {
      addToCache(result);
      return result;
    }
    
    // If all else fails, return Unknown
    const unknownResult: GenreData = {
      artist,
      track,
      genres: ['Unknown'],
      source: 'unknown'
    };
    
    addToCache(unknownResult);
    return unknownResult;
  } catch (error) {
    safeLogError('Error getting best genre data', error);
    
    // Return Unknown on error
    const unknownResult: GenreData = {
      artist,
      track,
      genres: ['Unknown'],
      source: 'unknown'
    };
    
    addToCache(unknownResult);
    return unknownResult;
  }
};

// Function to get genres for a batch of tracks
export const getGenresForTracks = async (tracks: { artist: string; track: string }[]): Promise<Record<string, GenreData>> => {
  const results: Record<string, GenreData> = {};
  
  // Process each track in the batch
  const batchPromises = tracks.map(async ({ artist, track }) => {
    try {
      const key = createCacheKey(artist, track);
      
      // Skip if already in cache
      if (isInCache(artist, track)) {
        results[key] = getFromCache(artist, track)!;
        return;
      }
      
      // Get genre data
      const genreData = await getBestGenreData(artist, track);
      
      if (genreData) {
        results[key] = genreData;
      } else {
        // If all APIs fail, use Unknown
        results[key] = {
          artist,
          track,
          genres: ['Unknown'],
          source: 'unknown'
        };
      }
    } catch (error) {
      safeLogError(`Error processing track ${artist} - ${track}`, error);
      
      // On error, use Unknown
      const key = createCacheKey(artist, track);
      results[key] = {
        artist,
        track,
        genres: ['Unknown'],
        source: 'unknown'
      };
    }
  });
  
  await Promise.all(batchPromises);
  
  return results;
};