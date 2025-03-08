import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  analyzeData: (filePath) => ipcRenderer.invoke('analyze-data', filePath),
  
  // Spotify authentication
  getSpotifyCredentials: () => ipcRenderer.invoke('get-spotify-credentials'),
  saveSpotifyCredentials: (credentials) => ipcRenderer.invoke('save-spotify-credentials', credentials),
  clearSpotifyCredentials: () => ipcRenderer.invoke('clear-spotify-credentials')
});