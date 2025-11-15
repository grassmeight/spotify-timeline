import axios from 'axios';

export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images: { url: string; height?: number; width?: number }[];
  country: string;
  product: string;
  followers: { total: number };
}

// Spotify API endpoints
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

// Get environment variables
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
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
const CODE_VERIFIER_KEY = 'spotify_code_verifier';

// ============================================================================
// PKCE Helper Functions (Required by Spotify as of November 2025)
// ============================================================================

/**
 * Generate a random string for PKCE code verifier
 * Must be between 43-128 characters
 */
const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
};

/**
 * Generate code challenge from verifier using SHA-256
 */
const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
};

/**
 * Base64 URL encode without padding (as required by PKCE spec)
 */
const base64URLEncode = (buffer: Uint8Array): string => {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Generate the authorization URL for Spotify login with PKCE
 * Now uses PKCE flow as required by Spotify (November 2025 security update)
 */
export const getAuthUrl = async (): Promise<string> => {
  // Check if credentials are available
  if (!CLIENT_ID || !REDIRECT_URI) {
    console.error('Missing Spotify credentials. CLIENT_ID or REDIRECT_URI not found.');
    console.log('CLIENT_ID present:', !!CLIENT_ID);
    console.log('REDIRECT_URI present:', !!REDIRECT_URI);
    throw new Error('Spotify credentials not configured. Please check your .env file.');
  }

  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store code verifier for later use in token exchange
  localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
  
  console.log('Generated PKCE challenge for authorization');

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    show_dialog: 'true'
  });

  return `${AUTH_ENDPOINT}?${params.toString()}`;
};

/**
 * Exchange authorization code for access token using PKCE
 * No longer requires client_secret (PKCE flow)
 */
export const getAccessToken = async (code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> => {
  try {
    // Check if credentials are available
    if (!CLIENT_ID || !REDIRECT_URI) {
      console.error('Missing Spotify credentials for token exchange');
      console.log('CLIENT_ID present:', !!CLIENT_ID);
      console.log('REDIRECT_URI present:', !!REDIRECT_URI);
      throw new Error('Spotify credentials not configured. Please check your .env file.');
    }

    // Get the code verifier we stored during authorization
    const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
    if (!codeVerifier) {
      throw new Error('Code verifier not found. Please restart the login process.');
    }

    // Form data for token request with PKCE
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', code);
    formData.append('redirect_uri', REDIRECT_URI);
    formData.append('client_id', CLIENT_ID);
    formData.append('code_verifier', codeVerifier);
    
    console.log('Making PKCE token request with:', {
      grant_type: 'authorization_code',
      code: code.substring(0, 10) + '...',
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID.substring(0, 8) + '...',
      using_pkce: true
    });
    
    const response = await axios.post(TOKEN_ENDPOINT, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Store tokens
    localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);
    
    // Calculate and store expiry time
    const expiryTime = Date.now() + (response.data.expires_in * 1000);
    localStorage.setItem(EXPIRY_TIME_KEY, expiryTime.toString());
    
    // Clean up code verifier as it's no longer needed
    localStorage.removeItem(CODE_VERIFIER_KEY);

    console.log('Token exchange successful with PKCE');
    return response.data;
  } catch (error) {
    console.error('Error getting access token:', error);
    
    interface AxiosError {
      response?: {
        data?: {
          error?: string;
          error_description?: string;
        };
        status?: number;
      };
    }
    
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      console.error('Response data:', axiosError.response.data);
      console.error('Response status:', axiosError.response.status);
      
      // Handle specific Spotify errors
      if (axiosError.response.data?.error === 'invalid_grant') {
        throw new Error('Authorization code has expired or been used. Please try connecting again.');
      }
    }
    throw error;
  }
};

/**
 * Refresh the access token using the refresh token
 * PKCE flow only requires client_id (no client_secret needed)
 */
export const refreshAccessToken = async (): Promise<string> => {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    if (!CLIENT_ID) {
      throw new Error('CLIENT_ID not configured');
    }

    // Form data for token refresh with PKCE flow
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', refreshToken);
    formData.append('client_id', CLIENT_ID);
    
    console.log('Refreshing access token with PKCE flow');
    
    const response = await axios.post(TOKEN_ENDPOINT, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
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

    console.log('Token refresh successful');
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
 * 
 * @deprecated This function is no longer supported with PKCE flow.
 * Client credentials flow requires client_secret which should not be exposed
 * in frontend/Electron apps. Use user authorization flow instead.
 * 
 * If you need client credentials, implement this on a secure backend server.
 */
export const getClientCredentialsToken = async (): Promise<string> => {
  throw new Error(
    'Client credentials flow is not supported with PKCE. ' +
    'This requires client_secret which should not be in frontend code. ' +
    'Please use user authorization or implement on a secure backend.'
  );
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
 * Logout user by clearing stored tokens and PKCE data
 */
export const logout = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRY_TIME_KEY);
  localStorage.removeItem(CODE_VERIFIER_KEY);
};

/**
 * Get current user profile from Spotify
 */
export const getCurrentUser = async (): Promise<SpotifyUser> => {
  try {
    const accessToken = await getCurrentAccessToken();
    
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
};

/**
 * Get user's recently played tracks
 */
export const getRecentlyPlayed = async (limit: number = 20) => {
  try {
    const accessToken = await getCurrentAccessToken();
    
    const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: { limit }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting recently played:', error);
    throw error;
  }
};

/**
 * Get user's top tracks
 */
export const getTopTracks = async (timeRange: string = 'medium_term', limit: number = 20) => {
  try {
    const accessToken = await getCurrentAccessToken();
    
    const response = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: { 
        time_range: timeRange,
        limit 
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting top tracks:', error);
    throw error;
  }
};

/**
 * Get user's top artists
 */
export const getTopArtists = async (timeRange: string = 'medium_term', limit: number = 20) => {
  try {
    const accessToken = await getCurrentAccessToken();
    
    const response = await axios.get('https://api.spotify.com/v1/me/top/artists', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: { 
        time_range: timeRange,
        limit 
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting top artists:', error);
    throw error;
  }
};