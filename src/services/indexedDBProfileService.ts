// Robust UUID generator using crypto API (with fallback)
const generateId = (): string => {
  // Use crypto.randomUUID if available (modern browsers)
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: Create a UUID v4-like string
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Database configuration
const DB_NAME = 'SpotifyTimelineDB';
const DB_VERSION = 1;
const PROFILES_STORE = 'profiles';
const PROFILE_DATA_STORE = 'profileData';

// Interfaces
export interface ProfileSummary {
  id: string;
  name: string;
  createdAt: string;
  lastAccessed: string;
  totalTracks: number;
  totalListeningHours: number;
  storageSizeKB: number;
}

export interface ProfileData {
  id: string;
  name: string;
  createdAt: string;
  lastAccessed: string;
  streamingData: any;
  spotifyApiKey?: string;
}

// IndexedDB wrapper class
class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create profiles store
        if (!db.objectStoreNames.contains(PROFILES_STORE)) {
          const profilesStore = db.createObjectStore(PROFILES_STORE, { keyPath: 'id' });
          profilesStore.createIndex('name', 'name', { unique: false });
          profilesStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Create profile data store
        if (!db.objectStoreNames.contains(PROFILE_DATA_STORE)) {
          db.createObjectStore(PROFILE_DATA_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  async getProfiles(): Promise<ProfileSummary[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROFILES_STORE], 'readonly');
      const store = transaction.objectStore(PROFILES_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getProfile(id: string): Promise<ProfileData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROFILES_STORE, PROFILE_DATA_STORE], 'readonly');
      
      // Get profile metadata
      const profileStore = transaction.objectStore(PROFILES_STORE);
      const profileRequest = profileStore.get(id);

      profileRequest.onsuccess = () => {
        const profile = profileRequest.result;
        if (!profile) {
          resolve(null);
          return;
        }

        // Get profile data
        const dataStore = transaction.objectStore(PROFILE_DATA_STORE);
        const dataRequest = dataStore.get(id);

        dataRequest.onsuccess = () => {
          const data = dataRequest.result;
          resolve({
            ...profile,
            streamingData: data?.streamingData || null
          });
        };

        dataRequest.onerror = () => reject(dataRequest.error);
      };

      profileRequest.onerror = () => reject(profileRequest.error);
    });
  }

  async saveProfile(profile: ProfileSummary): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROFILES_STORE], 'readwrite');
      const store = transaction.objectStore(PROFILES_STORE);
      const request = store.put(profile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveProfileData(id: string, streamingData: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROFILE_DATA_STORE], 'readwrite');
      const store = transaction.objectStore(PROFILE_DATA_STORE);
      const request = store.put({ id, streamingData });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProfile(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROFILES_STORE, PROFILE_DATA_STORE], 'readwrite');
      
      // Delete from both stores
      const profileStore = transaction.objectStore(PROFILES_STORE);
      const dataStore = transaction.objectStore(PROFILE_DATA_STORE);
      
      profileStore.delete(id);
      dataStore.delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getStorageUsage(): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROFILE_DATA_STORE], 'readonly');
      const store = transaction.objectStore(PROFILE_DATA_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const data = request.result || [];
        let totalSize = 0;
        const profileSizes: Record<string, number> = {};

        data.forEach(item => {
          const size = JSON.stringify(item.streamingData).length;
          totalSize += size;
          profileSizes[item.id] = Math.ceil(size / 1024); // KB
        });

        resolve({
          totalSizeKB: Math.ceil(totalSize / 1024),
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          profileSizes,
          profileCount: data.length,
          // IndexedDB can typically store several GB per origin
          limitGB: 'Several GB available',
          usagePercent: 0 // We can't easily calculate percentage for IndexedDB
        });
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
const dbManager = new IndexedDBManager();

// Active profile management (still use localStorage for this small data)
const ACTIVE_PROFILE_KEY = 'spotify_timeline_active_profile_id';

// Helper functions to calculate profile stats
const calculateProfileStats = (streamingData: any): { totalTracks: number; totalListeningHours: number; storageSizeKB: number } => {
  let totalTracks = 0;
  let totalListeningHours = 0;
  
  if (streamingData) {
    if (Array.isArray(streamingData)) {
      // Raw JSON data
      totalTracks = streamingData.length;
      totalListeningHours = streamingData.reduce((sum: number, item: any) => sum + (item.ms_played || 0), 0) / (1000 * 60 * 60);
    } else if (streamingData.rawData) {
      // Processed data with rawData
      totalTracks = streamingData.rawData.length;
      totalListeningHours = streamingData.stats?.total_stats?.total_listening_hours || 0;
    } else if (streamingData.stats) {
      // Processed data without rawData
      totalTracks = streamingData.stats.total_stats?.total_tracks_played || 0;
      totalListeningHours = streamingData.stats.total_stats?.total_listening_hours || 0;
    }
  }

  const storageSizeKB = streamingData ? Math.ceil(JSON.stringify(streamingData).length / 1024) : 0;
  
  return { totalTracks, totalListeningHours, storageSizeKB };
};

// Public API functions
export const getProfileSummaries = async (): Promise<ProfileSummary[]> => {
  try {
    return await dbManager.getProfiles();
  } catch (error) {
    console.error('Error getting profiles:', error);
    return [];
  }
};

export const createProfile = async (name: string): Promise<ProfileData> => {
  try {
    // Generate unique ID with collision check
    let id: string;
    let isUnique = false;
    const existingProfiles = await getProfileSummaries();
    
    do {
      id = generateId();
      isUnique = !existingProfiles.some(p => p.id === id);
    } while (!isUnique);

    const profile: ProfileSummary = {
      id,
      name,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      totalTracks: 0,
      totalListeningHours: 0,
      storageSizeKB: 0
    };

    await dbManager.saveProfile(profile);

    return {
      id: profile.id,
      name: profile.name,
      createdAt: profile.createdAt,
      lastAccessed: profile.lastAccessed,
      streamingData: null
    };
  } catch (error) {
    console.error('Error creating profile:', error);
    throw new Error('Failed to create profile');
  }
};

export const getProfile = async (profileId: string): Promise<ProfileData | null> => {
  try {
    const profile = await dbManager.getProfile(profileId);
    if (profile) {
      // Update last accessed time
      const profiles = await dbManager.getProfiles();
      const profileSummary = profiles.find(p => p.id === profileId);
      if (profileSummary) {
        profileSummary.lastAccessed = new Date().toISOString();
        await dbManager.saveProfile(profileSummary);
      }
    }
    return profile;
  } catch (error) {
    console.error('Error getting profile:', error);
    return null;
  }
};

export const updateProfile = async (profileId: string, updates: Partial<ProfileData>): Promise<ProfileData | null> => {
  try {
    const profile = await dbManager.getProfile(profileId);
    if (!profile) return null;

    // Update profile metadata
    const profiles = await dbManager.getProfiles();
    const profileIndex = profiles.findIndex(p => p.id === profileId);
    if (profileIndex === -1) return null;

    const updatedProfile = { ...profile, ...updates };
    
    // Save streaming data separately for better performance
    if (updates.streamingData !== undefined) {
      await dbManager.saveProfileData(profileId, updates.streamingData);
      
      // Update profile summary with new stats
      const stats = calculateProfileStats(updates.streamingData);
      profiles[profileIndex] = {
        ...profiles[profileIndex],
        lastAccessed: new Date().toISOString(),
        totalTracks: stats.totalTracks,
        totalListeningHours: stats.totalListeningHours,
        storageSizeKB: stats.storageSizeKB
      };
    } else {
      profiles[profileIndex].lastAccessed = new Date().toISOString();
    }

    await dbManager.saveProfile(profiles[profileIndex]);
    return updatedProfile;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }
};

export const deleteProfile = async (profileId: string): Promise<boolean> => {
  try {
    await dbManager.deleteProfile(profileId);
    
    // Clear active profile if it was deleted
    if (getActiveProfileId() === profileId) {
      clearActiveProfile();
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting profile:', error);
    return false;
  }
};

export const getActiveProfileId = (): string | null => {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
};

export const setActiveProfile = (profileId: string): void => {
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
};

export const clearActiveProfile = (): void => {
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
};

export const getActiveProfile = async (): Promise<ProfileData | null> => {
  const activeId = getActiveProfileId();
  if (!activeId) return null;
  return await getProfile(activeId);
};

export const exportProfile = async (profileId: string): Promise<string | null> => {
  try {
    const profile = await dbManager.getProfile(profileId);
    return profile ? JSON.stringify(profile, null, 2) : null;
  } catch (error) {
    console.error('Error exporting profile:', error);
    return null;
  }
};

export const importProfile = async (jsonString: string): Promise<ProfileData | null> => {
  try {
    const importedProfile: ProfileData = JSON.parse(jsonString);
    if (!importedProfile.id || !importedProfile.name) {
      throw new Error('Invalid profile data structure.');
    }

    // Ensure unique ID
    const existingProfiles = await getProfileSummaries();
    if (existingProfiles.some(p => p.id === importedProfile.id)) {
      importedProfile.id = generateId();
      importedProfile.name = `${importedProfile.name} (Imported)`;
    }

    // Create the profile
    const stats = calculateProfileStats(importedProfile.streamingData);
    const profileSummary: ProfileSummary = {
      id: importedProfile.id,
      name: importedProfile.name,
      createdAt: importedProfile.createdAt || new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      totalTracks: stats.totalTracks,
      totalListeningHours: stats.totalListeningHours,
      storageSizeKB: stats.storageSizeKB
    };

    await dbManager.saveProfile(profileSummary);
    if (importedProfile.streamingData) {
      await dbManager.saveProfileData(importedProfile.id, importedProfile.streamingData);
    }

    return importedProfile;
  } catch (error) {
    console.error('Error importing profile:', error);
    return null;
  }
};

export const getStorageStats = async () => {
  try {
    return await dbManager.getStorageUsage();
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      totalSizeKB: 0,
      totalSizeMB: '0.00',
      profileSizes: {},
      profileCount: 0,
      limitGB: 'Several GB available',
      usagePercent: 0
    };
  }
};
