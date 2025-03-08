import axios from 'axios';
import { Buffer } from 'buffer';

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

// Track API rate limiting
let lastApiCallTime = 0;
const API_CALL_DELAY = 1000; // 1 second between API calls to avoid rate limiting

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
 * Delay API calls to avoid rate limiting
 */
const delayApiCall = async (): Promise<void> => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  
  if (timeSinceLastCall < API_CALL_DELAY) {
    const delayTime = API_CALL_DELAY - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, delayTime));
  }
  
  lastApiCallTime = Date.now();
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
    
    // Real implementation with actual API call
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI
    });

    const response = await axios.post(TOKEN_ENDPOINT, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
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
    // Safe error logging
    if (error instanceof Error) {
      console.error('Error getting access token:', error.message);
    } else {
      console.error('Error getting access token: Unknown error');
    }
    
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

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const response = await axios.post(TOKEN_ENDPOINT, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
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
    // Safe error logging
    if (error instanceof Error) {
      console.error('Error refreshing access token:', error.message);
    } else {
      console.error('Error refreshing access token: Unknown error');
    }
    
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

/**
 * Get client credentials token (for non-user-specific API calls)
 */
export const getClientCredentialsToken = async (): Promise<string> => {
  try {
    await delayApiCall();
    
    // Real implementation with actual API call
    const params = new URLSearchParams({
      grant_type: 'client_credentials'
    });

    const response = await axios.post(TOKEN_ENDPOINT, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
      }
    });

    return response.data.access_token;
  } catch (error) {
    // Safe error logging
    if (error instanceof Error) {
      console.error('Error getting client credentials token:', error.message);
    } else {
      console.error('Error getting client credentials token: Unknown error');
    }
    
    throw error;
  }
};