import axios from 'axios';
import { getCurrentAccessToken, getClientCredentialsToken } from './spotifyAuthService';
import { getTrackInfo as getSpotifyTrackInfo, getTrackId, getArtistId } from './spotifyApi';

// Spotify API base URL
const API_BASE_URL = 'https://api.spotify.com/v1';

// Create axios instance for Spotify API
const spotifyApi = axios.create({
  baseURL: API_BASE_URL
});

// Add request interceptor to add authorization header
spotifyApi.interceptors.request.use(async (config) => {
  try {
    // Try to get user access token first
    let token;
    try {
      token = await getCurrentAccessToken();
    } catch (error) {
      // If user token fails, fall back to client credentials
      token = await getClientCredentialsToken();
    }
    
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  } catch (error) {
    // Safe error logging
    if (error instanceof Error) {
      console.error('Error setting authorization header:', error.message);
    } else {
      console.error('Error setting authorization header: Unknown error');
    }
    return Promise.reject(error);
  }
});

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

export interface SpotifyPlayHistory {
  track: SpotifyTrack;
  played_at: string;
  context: {
    type: string;
    uri: string;
  } | null;
}

// Safe error logging function
const safeLogError = (message: string, error: unknown): void => {
  if (error instanceof Error) {
    console.error(`${message}: ${error.message}`);
  } else {
    console.error(`${message}: Unknown error`);
  }
};

// API functions

/**
 * Get current user profile
 */
export const getCurrentUser = async (): Promise<SpotifyUser> => {
  try {
    // Real implementation with actual API call
    const response = await spotifyApi.get('/me');
    return response.data;
  } catch (error) {
    safeLogError('Error getting current user', error);
    throw error;
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
    // Real implementation with actual API call
    const response = await spotifyApi.get('/me/top/artists', {
      params: { time_range: timeRange, limit }
    });
    return response.data.items;
  } catch (error) {
    safeLogError('Error getting top artists', error);
    throw error;
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
    // Real implementation with actual API call
    const response = await spotifyApi.get('/me/top/tracks', {
      params: { time_range: timeRange, limit }
    });
    return response.data.items;
  } catch (error) {
    safeLogError('Error getting top tracks', error);
    throw error;
  }
};

/**
 * Get user's recently played tracks
 */
export const getRecentlyPlayed = async (limit: number = 50): Promise<SpotifyPlayHistory[]> => {
  try {
    // Real implementation with actual API call
    const response = await spotifyApi.get('/me/player/recently-played', {
      params: { limit }
    });
    return response.data.items;
  } catch (error) {
    safeLogError('Error getting recently played tracks', error);
    throw error;
  }
};

/**
 * Search for tracks
 */
export const searchTracks = async (query: string, limit: number = 10): Promise<SpotifyTrack[]> => {
  try {
    // Real implementation with actual API call
    const response = await spotifyApi.get('/search', {
      params: { q: query, type: 'track', limit }
    });
    return response.data.tracks.items;
  } catch (error) {
    safeLogError('Error searching tracks', error);
    throw error;
  }
};

/**
 * Get audio features for a track
 */
export const getAudioFeatures = async (trackId: string): Promise<SpotifyAudioFeatures> => {
  try {
    // Real implementation with actual API call
    const response = await spotifyApi.get(`/audio-features/${trackId}`);
    return response.data;
  } catch (error) {
    safeLogError('Error getting audio features', error);
    throw error;
  }
};

/**
 * Get audio features for multiple tracks
 */
export const getAudioFeaturesForTracks = async (trackIds: string[]): Promise<SpotifyAudioFeatures[]> => {
  try {
    // Spotify API limits to 100 IDs per request
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 100) {
      chunks.push(trackIds.slice(i, i + 100));
    }
    
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await spotifyApi.get('/audio-features', {
          params: { ids: chunk.join(',') }
        });
        return response.data.audio_features;
      })
    );
    
    return results.flat();
  } catch (error) {
    safeLogError('Error getting audio features for tracks', error);
    throw error;
  }
};

/**
 * Get artist information
 */
export const getArtist = async (artistId: string): Promise<SpotifyArtist> => {
  try {
    // Real implementation with actual API call
    const response = await spotifyApi.get(`/artists/${artistId}`);
    return response.data;
  } catch (error) {
    safeLogError('Error getting artist', error);
    throw error;
  }
};

/**
 * Get track information
 */
export const getTrack = async (trackId: string): Promise<SpotifyTrack> => {
  try {
    // Real implementation with actual API call
    const response = await spotifyApi.get(`/tracks/${trackId}`);
    return response.data;
  } catch (error) {
    safeLogError('Error getting track', error);
    throw error;
  }
};

/**
 * Search for artist and track to get IDs
 */
export const searchArtistAndTrack = async (artist: string, track: string): Promise<{
  artistId?: string;
  trackId?: string;
}> => {
  try {
    // Get track ID first
    const trackId = await getTrackId(artist, track);
    if (!trackId) {
      return {};
    }
    
    // Get artist ID
    const artistId = await getArtistId(artist);
    if (!artistId) {
      // Try to get artist ID from track
      const trackData = await getTrack(trackId);
      return {
        trackId,
        artistId: trackData.artists[0].id
      };
    }
    
    return {
      trackId,
      artistId
    };
  } catch (error) {
    safeLogError('Error searching for artist and track', error);
    return {};
  }
};

/**
 * Get track analysis with audio features and artist genres
 */
export const getTrackAnalysis = async (artist: string, track: string): Promise<{
  track: SpotifyTrack | null;
  audioFeatures: SpotifyAudioFeatures | null;
  genres: string[];
  likabilityScore: number;
}> => {
  try {
    // Use the optimized track info function
    const result = await getSpotifyTrackInfo(artist, track);
    
    if (result) {
      return {
        track: result.track,
        audioFeatures: result.audioFeatures,
        genres: result.genres,
        likabilityScore: result.likabilityScore
      };
    }
    
    // If the API call fails, return empty data
    return {
      track: null,
      audioFeatures: null,
      genres: [],
      likabilityScore: 0
    };
  } catch (error) {
    safeLogError('Error getting track analysis', error);
    return {
      track: null,
      audioFeatures: null,
      genres: [],
      likabilityScore: 0
    };
  }
};