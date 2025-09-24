import SpotifyWebApi from 'spotify-web-api-node';
import { Buffer } from 'buffer';

// Get environment variables
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

// Storage keys
const ACCESS_TOKEN_KEY = 'spotify_access_token';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const EXPIRY_TIME_KEY = 'spotify_token_expiry';

// Create a new Spotify API instance
const spotifyApi = new SpotifyWebApi({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI
});

// Track API rate limiting
let lastApiCallTime = 0;
const API_CALL_DELAY = 1000; // 1 second between API calls to avoid rate limiting

// Cache for track and artist data
interface SpotifyCache {
  tracks: Record<string, any>;
  artists: Record<string, any>;
  audioFeatures: Record<string, any>;
}

const cache: SpotifyCache = {
  tracks: {},
  artists: {},
  audioFeatures: {}
};

// Helper function to create a cache key for tracks
const createTrackCacheKey = (artist: string, track: string): string => {
  return `${artist.toLowerCase()}:${track.toLowerCase()}`;
};

// Helper function to delay API calls to avoid rate limiting
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

/**
 * Set the access token for the Spotify API
 */
export const setAccessToken = (token: string): void => {
  spotifyApi.setAccessToken(token);
};

/**
 * Set the refresh token for the Spotify API
 */
export const setRefreshToken = (token: string): void => {
  spotifyApi.setRefreshToken(token);
};

/**
 * Generate the authorization URL for Spotify login
 */
export const getAuthUrl = (): string => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-read-recently-played',
    'user-library-read'
  ];
  
  // Manually construct the authorization URL
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: scopes.join(' '),
    show_dialog: 'true'
  });
  
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
export const getAccessToken = async (code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> => {
  try {
    await delayApiCall();
    
    const data = await spotifyApi.authorizationCodeGrant(code);
    
    // Store tokens
    localStorage.setItem(ACCESS_TOKEN_KEY, data.body.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.body.refresh_token);
    
    // Calculate and store expiry time
    const expiryTime = Date.now() + (data.body.expires_in * 1000);
    localStorage.setItem(EXPIRY_TIME_KEY, expiryTime.toString());
    
    // Set the access token on the API object
    spotifyApi.setAccessToken(data.body.access_token);
    spotifyApi.setRefreshToken(data.body.refresh_token);
    
    return {
      access_token: data.body.access_token,
      refresh_token: data.body.refresh_token,
      expires_in: data.body.expires_in
    };
  } catch (error) {
    safeLogError('Error getting access token', error);
    throw error;
  }
};

/**
 * Refresh the access token using the refresh token
 */
export const refreshAccessToken = async (): Promise<string> => {
  try {
    await delayApiCall();
    
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Set the refresh token on the API object
    spotifyApi.setRefreshToken(refreshToken);
    
    const data = await spotifyApi.refreshAccessToken();
    
    // Update stored tokens
    localStorage.setItem(ACCESS_TOKEN_KEY, data.body.access_token);
    
    // Update refresh token if provided
    if (data.body.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.body.refresh_token);
      spotifyApi.setRefreshToken(data.body.refresh_token);
    }
    
    // Calculate and store new expiry time
    const expiryTime = Date.now() + (data.body.expires_in * 1000);
    localStorage.setItem(EXPIRY_TIME_KEY, expiryTime.toString());
    
    // Set the new access token on the API object
    spotifyApi.setAccessToken(data.body.access_token);
    
    return data.body.access_token;
  } catch (error) {
    safeLogError('Error refreshing access token', error);
    throw error;
  }
};

/**
 * Get the current access token, refreshing if necessary
 */
export const getCurrentAccessToken = async (): Promise<string> => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiryTime = localStorage.getItem(EXPIRY_TIME_KEY);
  
  // If no token or expiry time, we need to login
  if (!accessToken || !expiryTime) {
    throw new Error('No access token available. Please login.');
  }
  
  // Check if token is expired or about to expire (within 5 minutes)
  const isExpired = Date.now() > parseInt(expiryTime) - (5 * 60 * 1000);
  
  if (isExpired) {
    // Token is expired, refresh it
    return refreshAccessToken();
  }
  
  // Set the access token on the API object
  spotifyApi.setAccessToken(accessToken);
  
  // Token is still valid
  return accessToken;
};

/**
 * Get client credentials token (for non-user-specific API calls)
 */
export const getClientCredentialsToken = async (): Promise<string> => {
  try {
    await delayApiCall();
    
    const data = await spotifyApi.clientCredentialsGrant();
    
    // Set the access token on the API object
    spotifyApi.setAccessToken(data.body.access_token);
    
    return data.body.access_token;
  } catch (error) {
    safeLogError('Error getting client credentials token', error);
    throw error;
  }
};

/**
 * Check if user is currently authenticated
 */
export const isAuthenticated = (): boolean => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiryTime = localStorage.getItem(EXPIRY_TIME_KEY);
  
  if (!accessToken || !expiryTime) {
    return false;
  }
  
  // Check if token is expired
  return Date.now() < parseInt(expiryTime);
};

/**
 * Logout user by clearing stored tokens
 */
export const logout = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRY_TIME_KEY);
  
  // Clear the access token on the API object
  spotifyApi.resetAccessToken();
  spotifyApi.resetRefreshToken();
};

/**
 * Ensure the API has a valid token
 */
export const ensureToken = async (): Promise<void> => {
  try {
    // Try to get user access token first
    try {
      await getCurrentAccessToken();
    } catch (error) {
      // If user token fails, fall back to client credentials
      await getClientCredentialsToken();
    }
  } catch (error) {
    safeLogError('Error ensuring token', error);
    throw error;
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async () => {
  try {
    await ensureToken();
    await delayApiCall();
    
    const response = await spotifyApi.getMe();
    return response.body;
  } catch (error) {
    safeLogError('Error getting current user', error);
    throw error;
  }
};

/**
 * Search for a track
 */
export const searchTrack = async (artist: string, track: string) => {
  try {
    await ensureToken();
    await delayApiCall();
    
    const cacheKey = createTrackCacheKey(artist, track);
    
    // Check cache first
    if (cache.tracks[cacheKey]) {
      return cache.tracks[cacheKey];
    }
    
    const query = `artist:${artist} track:${track}`;
    const response = await spotifyApi.searchTracks(query, { limit: 1 });
    
    if (response.body.tracks && response.body.tracks.items.length > 0) {
      // Cache the result
      cache.tracks[cacheKey] = response.body.tracks.items[0];
      return response.body.tracks.items[0];
    }
    
    return null;
  } catch (error) {
    safeLogError(`Error searching for track: ${artist} - ${track}`, error);
    return null;
  }
};

/**
 * Get a track by ID
 */
export const getTrack = async (trackId: string) => {
  try {
    await ensureToken();
    await delayApiCall();
    
    // Check cache first
    if (cache.tracks[trackId]) {
      return cache.tracks[trackId];
    }
    
    const response = await spotifyApi.getTrack(trackId);
    
    // Cache the result
    cache.tracks[trackId] = response.body;
    
    return response.body;
  } catch (error) {
    safeLogError(`Error getting track by ID: ${trackId}`, error);
    return null;
  }
};

/**
 * Get audio features for a track
 */
export const getAudioFeatures = async (trackId: string) => {
  try {
    await ensureToken();
    await delayApiCall();
    
    // Check cache first
    if (cache.audioFeatures[trackId]) {
      return cache.audioFeatures[trackId];
    }
    
    const response = await spotifyApi.getAudioFeaturesForTrack(trackId);
    
    // Cache the result
    cache.audioFeatures[trackId] = response.body;
    
    return response.body;
  } catch (error) {
    safeLogError(`Error getting audio features for track: ${trackId}`, error);
    return null;
  }
};

/**
 * Get an artist by ID
 */
export const getArtist = async (artistId: string) => {
  try {
    await ensureToken();
    await delayApiCall();
    
    // Check cache first
    if (cache.artists[artistId]) {
      return cache.artists[artistId];
    }
    
    const response = await spotifyApi.getArtist(artistId);
    
    // Cache the result
    cache.artists[artistId] = response.body;
    
    return response.body;
  } catch (error) {
    safeLogError(`Error getting artist by ID: ${artistId}`, error);
    return null;
  }
};

/**
 * Get user's top tracks
 */
export const getTopTracks = async (timeRange = 'medium_term', limit = 50) => {
  try {
    await ensureToken();
    await delayApiCall();
    
    const response = await spotifyApi.getMyTopTracks({ time_range: timeRange, limit });
    return response.body.items;
  } catch (error) {
    safeLogError('Error getting top tracks', error);
    return [];
  }
};

/**
 * Get user's top artists
 */
export const getTopArtists = async (timeRange = 'medium_term', limit = 50) => {
  try {
    await ensureToken();
    await delayApiCall();
    
    const response = await spotifyApi.getMyTopArtists({ time_range: timeRange, limit });
    return response.body.items;
  } catch (error) {
    safeLogError('Error getting top artists', error);
    return [];
  }
};

/**
 * Get user's recently played tracks
 */
export const getRecentlyPlayed = async (limit = 50) => {
  try {
    await ensureToken();
    await delayApiCall();
    
    const response = await spotifyApi.getMyRecentlyPlayedTracks({ limit });
    return response.body.items;
  } catch (error) {
    safeLogError('Error getting recently played tracks', error);
    return [];
  }
};


/**
 * Interpret audio features into human-readable descriptions
 */
export const interpretAudioFeatures = (features: any): Record<string, string> => {
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

// Mock data generation for fallback when API fails
export const generateMockData = (artist: string, track: string) => {
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
  const generateAudioFeatures = (artistName: string, trackName: string) => {
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
  
  // Generate a mock Spotify track
  const mockTrack = {
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
  
  return {
    track: mockTrack,
    audioFeatures: mockAudioFeatures,
    genres: mockTrack.artists[0].genres,
    source: 'mock'
  };
};

/**
 * Get comprehensive track info with fallback to mock data
 */
export const getTrackInfo = async (artist: string, track: string, spotifyId?: string | null) => {
  try {
    await ensureToken();
    
    let trackData;
    
    // Try to get track by ID first if provided
    if (spotifyId) {
      trackData = await getTrack(spotifyId);
    }
    
    // If no ID provided or track not found by ID, search for it
    if (!trackData) {
      trackData = await searchTrack(artist, track);
    }
    
    // If track found, get audio features and artist details
    if (trackData) {
      const trackId = trackData.id;
      const artistId = trackData.artists[0].id;
      
      // Get audio features and artist details in parallel
      const [audioFeatures, artistData] = await Promise.all([
        getAudioFeatures(trackId),
        getArtist(artistId)
      ]);
      
      if (audioFeatures && artistData) {
        return {
          track: trackData,
          audioFeatures,
          genres: artistData.genres,
          source: 'spotify'
        };
      }
    }
    
    // If any part fails, fall back to mock data
    console.log(`Generating mock data for ${artist} - ${track}`);
    return generateMockData(artist, track);
  } catch (error) {
    safeLogError(`Error getting track info for ${artist} - ${track}`, error);
    
    // Fall back to mock data on error
    console.log(`Generating mock data for ${artist} - ${track} due to error`);
    return generateMockData(artist, track);
  }
};

// Export the Spotify API instance for direct use if needed
export default spotifyApi;