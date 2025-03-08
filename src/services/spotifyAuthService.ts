import axios from 'axios';

// Spotify API endpoints
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

// Get environment variables
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

// Scopes needed for the application
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'user-library-read'
];

// Storage keys
const ACCESS_TOKEN_KEY = 'spotify_access_token';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const EXPIRY_TIME_KEY = 'spotify_token_expiry';

/**
 * Generate the authorization URL for Spotify login
 */
export const getAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    show_dialog: 'true'
  });

  return `${AUTH_ENDPOINT}?${params.toString()}`;
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
    // Form data for token request
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', code);
    formData.append('redirect_uri', REDIRECT_URI);
    
    // Basic auth header
    const auth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    
    const response = await axios.post(TOKEN_ENDPOINT, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      }
    });

    // Store tokens
    localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);
    
    // Calculate and store expiry time
    const expiryTime = Date.now() + (response.data.expires_in * 1000);
    localStorage.setItem(EXPIRY_TIME_KEY, expiryTime.toString());

    return response.data;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

/**
 * Refresh the access token using the refresh token
 */
export const refreshAccessToken = async (): Promise<string> => {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Form data for token refresh
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', refreshToken);
    
    // Basic auth header
    const auth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    
    const response = await axios.post(TOKEN_ENDPOINT, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      }
    });

    // Update stored tokens
    localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
    
    // Update refresh token if provided
    if (response.data.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);
    }
    
    // Calculate and store new expiry time
    const expiryTime = Date.now() + (response.data.expires_in * 1000);
    localStorage.setItem(EXPIRY_TIME_KEY, expiryTime.toString());

    return response.data.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
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
  
  // Token is still valid
  return accessToken;
};

/**
 * Get client credentials token (for non-user-specific API calls)
 */
export const getClientCredentialsToken = async (): Promise<string> => {
  try {
    // Form data for client credentials
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    
    // Basic auth header
    const auth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    
    const response = await axios.post(TOKEN_ENDPOINT, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting client credentials token:', error);
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
};