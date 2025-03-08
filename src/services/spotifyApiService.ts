import axios from 'axios';
import { getCurrentAccessToken, getClientCredentialsToken } from './spotifyAuthService';
import { extractSpotifyIdFromUri } from '../utils/spotifyUtils';

// Spotify API base URL
const API_BASE_URL = 'https://api.spotify.com/v1';

// Create axios instance for Spotify API
const api = axios.create({
  baseURL: API_BASE_URL
});

// Set up cache to minimize API calls
const cache = {
  tracks: new Map<string, any>(),
  artists: new Map<string, any>(),
  audioFeatures: new Map<string, any>()
};

// Types for Spotify API responses
export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
  country: string;
  product: string;
}

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
  album: {
    id: string;
    name: string;
    images: { url: string; height: number; width: number }[];
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
  explicit: boolean;
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
}

/**
 * Make an authenticated request to the Spotify API
 */
const makeRequest = async (endpoint: string, method = 'GET', params = {}) => {
  try {
    // Try to use user token first, fall back to client credentials
    let token;
    try {
      token = await getCurrentAccessToken();
    } catch (error) {
      token = await getClientCredentialsToken();
    }

    return api({
      method,
      url: endpoint,
      params,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    console.error(`Error calling Spotify API (${endpoint}):`, error);
    throw error;
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (): Promise<SpotifyUser> => {
  try {
    const response = await makeRequest('/me');
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
};

/**
 * Search for a track on Spotify
 */
export const searchTrack = async (artist: string, trackName: string) => {
  const cacheKey = `${artist}:${trackName}`.toLowerCase();
  
  if (cache.tracks.has(cacheKey)) {
    return cache.tracks.get(cacheKey);
  }
  
  try {
    const response = await makeRequest('/search', 'GET', {
      q: `artist:${artist} track:${trackName}`,
      type: 'track',
      limit: 1
    });
    
    if (response.data.tracks.items.length > 0) {
      const track = response.data.tracks.items[0];
      cache.tracks.set(cacheKey, track);
      return track;
    }
    
    return null;
  } catch (error) {
    console.error(`Error searching for track ${artist} - ${trackName}:`, error);
    return null;
  }
};

/**
 * Get a track by ID
 */
export const getTrack = async (trackId: string) => {
  if (cache.tracks.has(trackId)) {
    return cache.tracks.get(trackId);
  }
  
  try {
    const response = await makeRequest(`/tracks/${trackId}`);
    const track = response.data;
    cache.tracks.set(trackId, track);
    return track;
  } catch (error) {
    console.error(`Error getting track by ID ${trackId}:`, error);
    return null;
  }
};

/**
 * Get an artist by ID
 */
export const getArtist = async (artistId: string) => {
  if (cache.artists.has(artistId)) {
    return cache.artists.get(artistId);
  }
  
  try {
    const response = await makeRequest(`/artists/${artistId}`);
    const artist = response.data;
    cache.artists.set(artistId, artist);
    return artist;
  } catch (error) {
    console.error(`Error getting artist by ID ${artistId}:`, error);
    return null;
  }
};

/**
 * Get audio features for a track
 */
export const getAudioFeatures = async (trackId: string) => {
  if (cache.audioFeatures.has(trackId)) {
    return cache.audioFeatures.get(trackId);
  }
  
  try {
    const response = await makeRequest(`/audio-features/${trackId}`);
    const features = response.data;
    cache.audioFeatures.set(trackId, features);
    return features;
  } catch (error) {
    console.error(`Error getting audio features for track ${trackId}:`, error);
    return null;
  }
};

/**
 * Calculate likability score based on audio features and popularity
 */
export const calculateLikabilityScore = (track: any, features: any): number => {
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
};

/**
 * Analyze a track to get all its information
 */
export const getTrackAnalysis = async (
  artistName: string, 
  trackName: string, 
  spotifyUri?: string | null
): Promise<TrackAnalysis | null> => {
  try {
    let trackId = spotifyUri ? extractSpotifyIdFromUri(spotifyUri) : null;
    let track;
    
    // If we have a track ID, get the track directly
    if (trackId) {
      track = await getTrack(trackId);
    } 
    // Otherwise, search for the track
    else {
      track = await searchTrack(artistName, trackName);
      trackId = track?.id;
    }
    
    // If we couldn't find the track, return null
    if (!track || !trackId) {
      return null;
    }
    
    // Get audio features and artist details in parallel
    const [audioFeatures, artist] = await Promise.all([
      getAudioFeatures(trackId),
      getArtist(track.artists[0].id)
    ]);
    
    if (!audioFeatures || !artist) {
      return null;
    }
    
    // Calculate likability score
    const likabilityScore = calculateLikabilityScore(track, audioFeatures);
    
    return {
      track,
      audioFeatures,
      genres: artist.genres || [],
      likabilityScore
    };
  } catch (error) {
    console.error(`Error analyzing track ${artistName} - ${trackName}:`, error);
    return null;
  }
};

/**
 * Get user's top artists
 */
export const getTopArtists = async (
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit: number = 50
): Promise<SpotifyArtist[]> => {
  try {
    const response = await makeRequest('/me/top/artists', 'GET', {
      time_range: timeRange,
      limit
    });
    return response.data.items;
  } catch (error) {
    console.error('Error getting top artists:', error);
    return [];
  }
};

/**
 * Get user's top tracks
 */
export const getTopTracks = async (
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit: number = 50
): Promise<SpotifyTrack[]> => {
  try {
    const response = await makeRequest('/me/top/tracks', 'GET', {
      time_range: timeRange,
      limit
    });
    return response.data.items;
  } catch (error) {
    console.error('Error getting top tracks:', error);
    return [];
  }
};

/**
 * Analyze multiple tracks at once (batch processing)
 */
export const analyzeMultipleTracks = async (
  tracks: Array<{ artist: string; track: string; uri?: string }>
): Promise<Record<string, TrackAnalysis>> => {
  const results: Record<string, TrackAnalysis> = {};
  
  // Process in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < tracks.length; i += batchSize) {
    const batch = tracks.slice(i, i + batchSize);
    
    // Process each batch in parallel
    const batchPromises = batch.map(async ({ artist, track, uri }) => {
      try {
        const analysis = await getTrackAnalysis(artist, track, uri);
        if (analysis) {
          const key = `${artist}:${track}`.toLowerCase();
          results[key] = analysis;
        }
      } catch (error) {
        console.error(`Error processing track ${artist} - ${track}:`, error);
      }
    });
    
    await Promise.all(batchPromises);
    
    // Add a small delay between batches to avoid rate limiting
    if (i + batchSize < tracks.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
};