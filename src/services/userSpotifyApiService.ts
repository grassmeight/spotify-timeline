/**
 * Service for using user-provided Spotify API credentials to fetch recent listening data
 */

export interface SpotifyApiCredentials {
  clientId: string;
  clientSecret: string;
}

export interface RecentTrack {
  played_at: string;
  track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: { name: string };
    duration_ms: number;
    external_urls: { spotify: string };
  };
}

export interface SpotifyApiResponse {
  items: RecentTrack[];
  next?: string;
  cursors?: {
    after?: string;
    before?: string;
  };
}

/**
 * Get access token using Client Credentials flow (for user's own API key)
 * Note: Client credentials can only access public data, not user-specific data
 */
export const getClientCredentialsToken = async (credentials: SpotifyApiCredentials): Promise<string> => {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${credentials.clientId}:${credentials.clientSecret}`)
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get access token: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  return data.access_token;
};

/**
 * Generate authorization URL for user's own app
 */
export const getUserOAuthUrl = (credentials: SpotifyApiCredentials, redirectUri: string): string => {
  const scopes = [
    'user-read-recently-played',
    'user-top-read',
    'user-read-playback-state',
    'user-read-currently-playing'
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: credentials.clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state: 'user_api_auth'
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for access token using user's credentials
 */
export const getUserAccessToken = async (
  credentials: SpotifyApiCredentials,
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string }> => {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${credentials.clientId}:${credentials.clientSecret}`)
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get user access token: ${error.error_description || error.error}`);
  }

  return await response.json();
};

/**
 * Fetch recently played tracks using user's OAuth token
 * Note: Requires user to have authorized their own app first
 */
export const getRecentlyPlayedTracks = async (
  userAccessToken: string,
  limit: number = 50,
  after?: string
): Promise<SpotifyApiResponse> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
  });
  
  if (after) {
    params.append('after', after);
  }

  const response = await fetch(`https://api.spotify.com/v1/me/player/recently-played?${params}`, {
    headers: {
      'Authorization': `Bearer ${userAccessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to fetch recently played: ${error.error?.message || 'Unknown error'}`);
  }

  return await response.json();
};

/**
 * Convert Spotify API recent tracks to the format expected by our streaming data analyzer
 */
export const convertRecentTracksToStreamingData = (tracks: RecentTrack[]): Array<{
  ts: string;
  ms_played: number;
  master_metadata_track_name: string;
  master_metadata_album_artist_name: string;
  master_metadata_album_album_name: string;
  spotify_track_uri: string;
  reason_start: string;
  reason_end: string;
  shuffle: null;
  skipped: boolean;
  offline: boolean;
  offline_timestamp: null;
  incognito_mode: boolean;
  platform: string;
}> => {
  return tracks.map(item => ({
    ts: item.played_at,
    ms_played: item.track.duration_ms, // Assume full track was played (limitation of API)
    master_metadata_track_name: item.track.name,
    master_metadata_album_artist_name: item.track.artists[0]?.name || 'Unknown Artist',
    master_metadata_album_album_name: item.track.album.name,
    spotify_track_uri: `spotify:track:${item.track.id}`,
    reason_start: 'clickrow', // Default value
    reason_end: 'endplay', // Assume completed
    shuffle: null, // Not available in API
    skipped: false, // Assume not skipped (limitation)
    offline: false, // Assume online
    offline_timestamp: null,
    incognito_mode: false,
    platform: 'api_sync' // Mark as API-synced data
  }));
};

/**
 * Test if the provided credentials are valid
 */
export const testSpotifyCredentials = async (credentials: SpotifyApiCredentials): Promise<boolean> => {
  try {
    await getClientCredentialsToken(credentials);
    return true;
  } catch (error) {
    console.error('Credential test failed:', error);
    return false;
  }
};

/**
 * Fetch all available recent tracks (with pagination)
 * Note: Spotify's recently played endpoint is limited and may not provide 2 full weeks of data
 */
export const getAllRecentTracks = async (
  userAccessToken: string,
  maxTracks: number = 1000
): Promise<RecentTrack[]> => {
  const allTracks: RecentTrack[] = [];
  let after: string | undefined;
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).getTime();

  try {
    while (allTracks.length < maxTracks) {
      const response = await getRecentlyPlayedTracks(userAccessToken, 50, after);
      
      if (!response.items || response.items.length === 0) {
        break; // No more data
      }

      // Filter tracks to only include those from the last 2 weeks
      const recentTracks = response.items.filter(item => {
        const playedAt = new Date(item.played_at).getTime();
        return playedAt >= twoWeeksAgo;
      });

      allTracks.push(...recentTracks);

      // Check if we've reached the 2-week limit
      if (recentTracks.length < response.items.length) {
        break; // We've gone beyond 2 weeks
      }

      // Get cursor for next page
      after = response.cursors?.after;
      if (!after) {
        break; // No more pages
      }

      // Prevent infinite loops
      if (allTracks.length >= maxTracks) {
        break;
      }
    }
  } catch (error) {
    console.error('Error fetching recent tracks:', error);
    throw error;
  }

  return allTracks;
};
