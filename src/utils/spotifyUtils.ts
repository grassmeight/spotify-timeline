/**
 * Extracts the Spotify ID from a Spotify URI
 * 
 * @param uri Spotify URI in format "spotify:track:42OqvXIY4Vfnmdj3SZyPUD"
 * @returns The Spotify ID or null if the URI is invalid
 */
export const extractSpotifyIdFromUri = (uri: string): string | null => {
  if (!uri) return null;
  
  // Handle spotify:track:ID format
  if (uri.startsWith('spotify:track:')) {
    return uri.split(':')[2];
  }
  
  // Handle https://open.spotify.com/track/ID format
  if (uri.includes('spotify.com/track/')) {
    const parts = uri.split('/');
    const idPart = parts[parts.length - 1];
    // Remove any query parameters
    return idPart.split('?')[0];
  }
  
  return null;
};

/**
 * Checks if a string is a valid Spotify ID
 * 
 * @param id String to check
 * @returns Boolean indicating if the string is a valid Spotify ID
 */
export const isValidSpotifyId = (id: string): boolean => {
  // Spotify IDs are 22 characters long and alphanumeric
  return /^[a-zA-Z0-9]{22}$/.test(id);
};

/**
 * Creates a Spotify URI from a track ID
 * 
 * @param id Spotify track ID
 * @returns Spotify URI in format "spotify:track:ID"
 */
export const createSpotifyUri = (id: string): string => {
  return `spotify:track:${id}`;
};

/**
 * Creates a Spotify web URL from a track ID
 * 
 * @param id Spotify track ID
 * @returns Spotify web URL in format "https://open.spotify.com/track/ID"
 */
export const createSpotifyUrl = (id: string): string => {
  return `https://open.spotify.com/track/${id}`;
};