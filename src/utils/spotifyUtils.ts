/**
 * Extract Spotify track ID from URI
 * @param uri - Spotify URI (e.g., "spotify:track:4iJyoBOLtHqaGxP12qzhQI")
 * @returns The track ID or null if invalid
 */
export const extractSpotifyIdFromUri = (uri: string): string | null => {
  if (!uri || typeof uri !== 'string') {
    return null;
  }
  
  // Handle different URI formats
  if (uri.startsWith('spotify:track:')) {
    return uri.replace('spotify:track:', '');
  }
  
  if (uri.startsWith('https://open.spotify.com/track/')) {
    const parts = uri.split('/');
    const trackPart = parts[parts.length - 1];
    // Remove any query parameters
    return trackPart.split('?')[0];
  }
  
  // If it's already just an ID (22 characters, alphanumeric)
  if (/^[a-zA-Z0-9]{22}$/.test(uri)) {
    return uri;
  }
  
  return null;
};

/**
 * Create a Spotify URI from track ID
 * @param trackId - Spotify track ID
 * @returns Spotify URI
 */
export const createSpotifyUri = (trackId: string): string => {
  return `spotify:track:${trackId}`;
};

/**
 * Create a Spotify URL from track ID
 * @param trackId - Spotify track ID
 * @returns Spotify URL
 */
export const createSpotifyUrl = (trackId: string): string => {
  return `https://open.spotify.com/track/${trackId}`;
};