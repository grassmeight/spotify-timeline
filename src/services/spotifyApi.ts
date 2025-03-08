import axios from 'axios';
import { getCurrentAccessToken, getClientCredentialsToken } from './spotifyAuthService';

// Spotify API base URL
const API_BASE_URL = 'https://api.spotify.com/v1';

// Create axios instance for Spotify API
const spotifyApi = axios.create({
  baseURL: API_BASE_URL
});

// Track API rate limiting
let lastApiCallTime = 0;
const API_CALL_DELAY = 1000; // 1 second between API calls to avoid rate limiting

// Types for Spotify API responses
export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images?: { url: string; height: number; width: number }[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  popularity: number;
  explicit: boolean;
  duration_ms: number;
  album: {
    id: string;
    name: string;
    release_date: string;
    images: { url: string; height: number; width: number }[];
  };
}

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  duration_ms: number;
  time_signature: number;
}

export interface TrackAnalysis {
  track: SpotifyTrack | null;
  audioFeatures: SpotifyAudioFeatures | null;
  genres: string[];
  likabilityScore: number;
  source: string;
}

// Delay API calls to avoid rate limiting
const delayApiCall = async (): Promise<void> => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  
  if (timeSinceLastCall < API_CALL_DELAY) {
    const delayTime = API_CALL_DELAY - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, delayTime));
  }
  
  lastApiCallTime = Date.now();
};

// Safe error logging function
const safeLogError = (message: string, error: unknown): void => {
  if (error instanceof Error) {
    console.error(`${message}: ${error.message}`);
  } else {
    console.error(`${message}: Unknown error`);
  }
};

// Helper function to create a cache key for tracks
const createTrackCacheKey = (artist: string, track: string): string => {
  return `${artist.toLowerCase()}:${track.toLowerCase()}`;
};

// Helper function to extract Spotify ID from URI
export const extractSpotifyIdFromUri = (uri: string): string | null => {
  if (!uri) return null;
  
  const parts = uri.split(':');
  if (parts.length === 3) {
    return parts[2];
  }
  
  return null;
};

// Helper function to validate Spotify ID
export const isValidSpotifyId = (id: string): boolean => {
  // Spotify IDs are alphanumeric and typically 22 characters
  return /^[a-zA-Z0-9]{22}$/.test(id);
};

// Cache to store Spotify IDs and reduce API calls
interface SpotifyIdCache {
  tracks: Record<string, string>; // key: "artist:track", value: trackId
  artists: Record<string, string>; // key: artistName, value: artistId
  albums: Record<string, string>; // key: albumName, value: albumId
  trackDetails: Record<string, SpotifyTrack>; // key: trackId, value: track details
  audioFeatures: Record<string, SpotifyAudioFeatures>; // key: trackId, value: audio features
  artistDetails: Record<string, SpotifyArtist>; // key: artistId, value: artist details
}

const idCache: SpotifyIdCache = {
  tracks: {},
  artists: {},
  albums: {},
  trackDetails: {},
  audioFeatures: {},
  artistDetails: {}
};

/**
 * Make an authenticated request to the Spotify API
 */
export const makeSpotifyRequest = async (
  endpoint: string, 
  method: 'get' | 'post' | 'put' | 'delete' = 'get',
  params: Record<string, any> = {},
  data: any = null
): Promise<any> => {
  try {
    await delayApiCall();
    
    // Try to get user access token first
    let token;
    try {
      token = await getCurrentAccessToken();
    } catch (error) {
      // If user token fails, fall back to client credentials
      token = await getClientCredentialsToken();
    }
    
    const config = {
      method,
      url: endpoint,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: Object.keys(params).length > 0 ? params : undefined,
      data: data ? data : undefined
    };
    
    const response = await spotifyApi(config);
    return response.data;
  } catch (error) {
    safeLogError(`Error making Spotify request to ${endpoint}`, error);
    throw error;
  }
};

/**
 * Get track directly by ID
 * Uses cache to avoid redundant API calls
 */
export const getTrackById = async (trackId: string): Promise<SpotifyTrack | null> => {
  try {
    // Check cache first
    if (idCache.trackDetails[trackId]) {
      return idCache.trackDetails[trackId];
    }
    
    // Get track from API
    const trackData = await makeSpotifyRequest(`/tracks/${trackId}`);
    
    // Cache the track details
    idCache.trackDetails[trackId] = trackData;
    
    // Also cache the artist ID
    if (trackData.artists.length > 0) {
      const artistId = trackData.artists[0].id;
      idCache.artists[trackData.artists[0].name.toLowerCase()] = artistId;
    }
    
    return trackData;
  } catch (error) {
    safeLogError(`Failed to get track by ID: ${trackId}`, error);
    return null;
  }
};

/**
 * Get audio features directly by track ID
 * Uses cache to avoid redundant API calls
 */
export const getAudioFeaturesById = async (trackId: string): Promise<SpotifyAudioFeatures | null> => {
  try {
    // Check cache first
    if (idCache.audioFeatures[trackId]) {
      return idCache.audioFeatures[trackId];
    }
    
    // Get audio features from API
    const features = await makeSpotifyRequest(`/audio-features/${trackId}`);
    
    // Cache the audio features
    idCache.audioFeatures[trackId] = features;
    
    return features;
  } catch (error) {
    safeLogError(`Failed to get audio features by ID: ${trackId}`, error);
    return null;
  }
};

/**
 * Search for a track and get its Spotify ID
 * Uses cache to avoid redundant API calls
 */
export const getTrackId = async (artist: string, track: string): Promise<string | null> => {
  try {
    const cacheKey = createTrackCacheKey(artist, track);
    
    // Check cache first
    if (idCache.tracks[cacheKey]) {
      return idCache.tracks[cacheKey];
    }
    
    // Search for the track
    const searchData = await makeSpotifyRequest('/search', 'get', {
      q: `artist:${encodeURIComponent(artist)} track:${encodeURIComponent(track)}`,
      type: 'track',
      limit: 1
    });
    
    if (searchData.tracks.items.length === 0) {
      throw new Error('Track not found');
    }
    
    const trackId = searchData.tracks.items[0].id;
    
    // Cache the ID
    idCache.tracks[cacheKey] = trackId;
    
    // Also cache the track details
    idCache.trackDetails[trackId] = searchData.tracks.items[0];
    
    // Also cache the artist ID
    if (searchData.tracks.items[0].artists.length > 0) {
      const artistId = searchData.tracks.items[0].artists[0].id;
      idCache.artists[artist.toLowerCase()] = artistId;
    }
    
    return trackId;
  } catch (error) {
    safeLogError(`Failed to get track ID for ${artist} - ${track}`, error);
    return null;
  }
};

/**
 * Get artist ID from Spotify
 * Uses cache to avoid redundant API calls
 */
export const getArtistId = async (artist: string): Promise<string | null> => {
  try {
    // Check cache first
    if (idCache.artists[artist.toLowerCase()]) {
      return idCache.artists[artist.toLowerCase()];
    }
    
    // Search for the artist
    const searchData = await makeSpotifyRequest('/search', 'get', {
      q: `artist:${encodeURIComponent(artist)}`,
      type: 'artist',
      limit: 1
    });
    
    if (searchData.artists.items.length === 0) {
      throw new Error('Artist not found');
    }
    
    const artistId = searchData.artists.items[0].id;
    
    // Cache the ID
    idCache.artists[artist.toLowerCase()] = artistId;
    
    // Also cache the artist details
    idCache.artistDetails[artistId] = searchData.artists.items[0];
    
    return artistId;
  } catch (error) {
    safeLogError(`Failed to get artist ID for ${artist}`, error);
    return null;
  }
};

/**
 * Get artist details by ID
 * Uses cache to avoid redundant API calls
 */
export const getArtistById = async (artistId: string): Promise<SpotifyArtist | null> => {
  try {
    // Check cache first
    if (idCache.artistDetails[artistId]) {
      return idCache.artistDetails[artistId];
    }
    
    // Get artist from API
    const artistData = await makeSpotifyRequest(`/artists/${artistId}`);
    
    // Cache the artist details
    idCache.artistDetails[artistId] = artistData;
    
    return artistData;
  } catch (error) {
    safeLogError(`Failed to get artist by ID: ${artistId}`, error);
    return null;
  }
};

/**
 * Calculate likability score based on audio features and popularity
 */
export const calculateLikabilityScore = (track: SpotifyTrack, features: SpotifyAudioFeatures): number => {
  // Factors that generally make songs more likable:
  // - Higher valence (positivity/happiness)
  // - Moderate danceability
  // - Moderate energy
  // - Higher popularity
  // - Not too much speechiness
  // - Not too much instrumentalness (for general audience)
  
  const valenceScore = features.valence * 25; // 0-25 points
  const danceabilityScore = (1 - Math.abs(features.danceability - 0.7)) * 15; // 0-15 points
  const energyScore = (1 - Math.abs(features.energy - 0.65)) * 15; // 0-15 points
  const popularityScore = (track.popularity / 100) * 25; // 0-25 points
  const speechinessScore = (1 - features.speechiness) * 10; // 0-10 points
  const instrumentalnessScore = (1 - features.instrumentalness) * 10; // 0-10 points
  
  // Sum all scores and round to 2 decimal places
  const totalScore = parseFloat((
    valenceScore + 
    danceabilityScore + 
    energyScore + 
    popularityScore + 
    speechinessScore + 
    instrumentalnessScore
  ).toFixed(2));
  
  // Ensure score is between 0-100
  return Math.min(100, Math.max(0, totalScore));
};

// Mock Spotify API responses for fallback when real API fails
export const mockSpotifyData = (artist: string, track: string): TrackAnalysis => {
  // Create a deterministic but varied response based on artist and track names
  const seed = (artist + track).toLowerCase();
  
  // Generate a pseudo-random ID based on artist and track
  const generateId = (text: string): string => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 22);
  };
  
  // Generate artist genres based on artist name
  const getArtistGenres = (artistName: string): string[] => {
    const name = artistName.toLowerCase();
    
    if (name.includes('rock') || name.includes('metal') || name.includes('band')) {
      return ['rock', 'alternative rock', 'hard rock'];
    } else if (name.includes('pop') || name.includes('love') || name.includes('girl')) {
      return ['pop', 'dance pop', 'electropop'];
    } else if (name.includes('rap') || name.includes('hip') || name.includes('beat')) {
      return ['hip-hop', 'rap', 'trap'];
    } else if (name.includes('country') || name.includes('heart') || name.includes('road')) {
      return ['country', 'americana', 'folk'];
    } else if (name.includes('electro') || name.includes('dance') || name.includes('dj')) {
      return ['electronic', 'edm', 'house'];
    } else if (name.includes('jazz') || name.includes('blues') || name.includes('soul')) {
      return ['jazz', 'soul', 'blues'];
    } else if (name.includes('classical') || name.includes('piano') || name.includes('symphony')) {
      return ['classical', 'instrumental', 'orchestral'];
    } else {
      // Use characters from the artist name to create pseudo-random genres
      const genrePool = [
        'pop', 'rock', 'hip-hop', 'electronic', 'indie', 'alternative', 
        'r&b', 'dance', 'folk', 'ambient', 'jazz', 'metal', 'punk'
      ];
      
      // Select genres based on character codes in the name
      const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const primaryGenreIndex = charSum % genrePool.length;
      let secondaryGenreIndex = (charSum + 7) % genrePool.length;
      
      // Ensure we don't pick the same genre twice
      if (secondaryGenreIndex === primaryGenreIndex) {
        secondaryGenreIndex = (secondaryGenreIndex + 1) % genrePool.length;
      }
      
      return [genrePool[primaryGenreIndex], genrePool[secondaryGenreIndex]];
    }
  };
  
  // Generate pseudo-random audio features based on artist and track
  const generateAudioFeatures = (artistName: string, trackName: string): SpotifyAudioFeatures => {
    const combined = (artistName + trackName).toLowerCase();
    const charSum = combined.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    
    // Generate values between 0 and 1 based on the character sum
    const getValue = (offset: number): number => {
      const value = ((charSum + offset) % 1000) / 1000;
      return parseFloat(value.toFixed(3));
    };
    
    const trackId = generateId(trackName);
    
    return {
      id: trackId,
      danceability: getValue(1),
      energy: getValue(2),
      key: getValue(3) * 11,
      loudness: -1 * (getValue(4) * 15),
      mode: getValue(5) > 0.5 ? 1 : 0,
      speechiness: getValue(6) * 0.5,
      acousticness: getValue(7),
      instrumentalness: getValue(8) * 0.8,
      liveness: getValue(9) * 0.8,
      valence: getValue(10),
      tempo: 70 + (getValue(11) * 100),
      duration_ms: 120000 + (getValue(12) * 240000),
      time_signature: 3 + Math.floor(getValue(13) * 3)
    };
  };
  
  // Generate mock IDs
  const trackId = generateId(track);
  const artistId = generateId(artist);
  const albumId = generateId(artist + "album");
  
  // Store mock IDs in cache for future use
  idCache.tracks[createTrackCacheKey(artist, track)] = trackId;
  idCache.artists[artist.toLowerCase()] = artistId;
  
  // Generate a mock Spotify track
  const mockTrack: SpotifyTrack = {
    id: trackId,
    name: track,
    artists: [{
      id: artistId,
      name: artist,
      genres: getArtistGenres(artist),
      popularity: 50 + Math.floor((seed.length % 50))
    }],
    popularity: 50 + Math.floor((seed.length % 50)),
    explicit: seed.includes('explicit') || seed.includes('parental') || Math.random() > 0.8,
    duration_ms: 180000 + (seed.length * 1000),
    album: {
      id: albumId,
      name: `${artist} - Album`,
      release_date: `202${seed.length % 5}-0${(seed.length % 9) + 1}-0${(seed.length % 9) + 1}`,
      images: [
        {
          url: `https://picsum.photos/id/${Math.abs(seed.charCodeAt(0) % 1000)}/300/300`,
          height: 300,
          width: 300
        }
      ]
    }
  };
  
  // Generate audio features
  const mockAudioFeatures = generateAudioFeatures(artist, track);
  
  // Calculate likability score
  const likabilityScore = calculateLikabilityScore(mockTrack, mockAudioFeatures);
  
  return {
    track: mockTrack,
    audioFeatures: mockAudioFeatures,
    genres: mockTrack.artists[0].genres,
    likabilityScore,
    source: 'mock'
  };
};

/**
 * Get track information from Spotify API with fallback to mock data
 * Prioritizes using the Spotify ID if available
 */
export const getTrackInfo = async (artist: string, track: string, spotifyId?: string | null): Promise<TrackAnalysis | null> => {
  try {
    // Try to use the real Spotify API first
    try {
      let trackId = spotifyId;
      
      // If no Spotify ID provided, try to get it from the track name and artist
      if (!trackId) {
        trackId = await getTrackId(artist, track);
      }
      
      if (!trackId) {
        throw new Error('Track not found');
      }
      
      // Validate the track ID
      if (!isValidSpotifyId(trackId)) {
        throw new Error('Invalid Spotify ID');
      }
      
      // Get track details
      let trackData = idCache.trackDetails[trackId];
      if (!trackData) {
        trackData = await getTrackById(trackId);
        if (!trackData) {
          throw new Error('Failed to get track details');
        }
      }
      
      // Get audio features
      let audioFeatures = idCache.audioFeatures[trackId];
      if (!audioFeatures) {
        audioFeatures = await getAudioFeaturesById(trackId);
        if (!audioFeatures) {
          throw new Error('Failed to get audio features');
        }
      }
      
      // Get artist details to get genres
      const artistId = trackData.artists[0].id;
      let artistData = idCache.artistDetails[artistId];
      if (!artistData) {
        artistData = await getArtistById(artistId);
        if (!artistData) {
          throw new Error('Failed to get artist details');
        }
      }
      
      // Calculate likability score
      const likabilityScore = calculateLikabilityScore(trackData, audioFeatures);
      
      return {
        track: trackData,
        audioFeatures: audioFeatures,
        genres: artistData.genres,
        likabilityScore,
        source: 'spotify'
      };
    } catch (apiError) {
      // If the real API fails, fall back to mock data
      safeLogError('Spotify API failed, falling back to mock data', apiError);
      console.log(`Generating mock data for ${artist} - ${track}`);
      return mockSpotifyData(artist, track);
    }
  } catch (error) {
    safeLogError('Error in getTrackInfo', error);
    // If all else fails, return mock data
    return mockSpotifyData(artist, track);
  }
};

/**
 * Get track information for multiple tracks
 * Prioritizes using Spotify IDs when available
 */
export const getTracksInfo = async (tracks: { artist: string; track: string; spotifyId?: string | null }[]): Promise<Record<string, TrackAnalysis>> => {
  const results: Record<string, TrackAnalysis> = {};
  
  // Process each track
  const trackPromises = tracks.map(async ({ artist, track, spotifyId }) => {
    try {
      const key = createTrackCacheKey(artist, track);
      const trackInfo = await getTrackInfo(artist, track, spotifyId);
      
      if (trackInfo) {
        results[key] = trackInfo;
      }
    } catch (error) {
      safeLogError(`Error processing track ${artist} - ${track}`, error);
      // Fall back to mock data on error
      const mockData = mockSpotifyData(artist, track);
      const key = createTrackCacheKey(artist, track);
      results[key] = mockData;
    }
  });
  
  await Promise.all(trackPromises);
  
  return results;
};

/**
 * Interpret audio features into human-readable descriptions
 */
export const interpretAudioFeatures = (features: SpotifyAudioFeatures): Record<string, string> => {
  const interpretations: Record<string, string> = {};
  
  // Danceability
  if (features.danceability > 0.7) {
    interpretations.danceability = "Very danceable";
  } else if (features.danceability > 0.4) {
    interpretations.danceability = "Moderately danceable";
  } else {
    interpretations.danceability = "Not very danceable";
  }
  
  // Energy
  if (features.energy > 0.7) {
    interpretations.energy = "High energy";
  } else if (features.energy > 0.4) {
    interpretations.energy = "Moderate energy";
  } else {
    interpretations.energy = "Low energy";
  }
  
  // Valence (happiness)
  if (features.valence > 0.7) {
    interpretations.valence = "Very positive/happy";
  } else if (features.valence > 0.4) {
    interpretations.valence = "Neutral mood";
  } else {
    interpretations.valence = "Negative/sad mood";
  }
  
  // Acousticness
  if (features.acousticness > 0.7) {
    interpretations.acousticness = "Highly acoustic";
  } else if (features.acousticness > 0.4) {
    interpretations.acousticness = "Partially acoustic";
  } else {
    interpretations.acousticness = "Not acoustic";
  }
  
  // Instrumentalness
  if (features.instrumentalness > 0.5) {
    interpretations.instrumentalness = "Instrumental";
  } else {
    interpretations.instrumentalness = "Vocal";
  }
  
  // Speechiness
  if (features.speechiness > 0.66) {
    interpretations.speechiness = "Spoken word";
  } else if (features.speechiness > 0.33) {
    interpretations.speechiness = "Speech and music";
  } else {
    interpretations.speechiness = "Music, not speech";
  }
  
  // Liveness
  if (features.liveness > 0.8) {
    interpretations.liveness = "Live performance";
  } else {
    interpretations.liveness = "Studio recording";
  }
  
  // Tempo
  if (features.tempo > 120) {
    interpretations.tempo = "Fast tempo";
  } else if (features.tempo > 76) {
    interpretations.tempo = "Medium tempo";
  } else {
    interpretations.tempo = "Slow tempo";
  }
  
  return interpretations;