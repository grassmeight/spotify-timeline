import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { PythonShell } from 'python-shell';
import fs from 'fs';
import Store from 'electron-store';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Initialize store for saving Spotify credentials
const store = new Store({
  name: 'spotify-stats-explorer',
  encryptionKey: 'spotify-stats-explorer-secret-key'
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
  app.setAppUserModelId(app.name);
}

let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // In production, load the built app
  if (app.isPackaged) {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  } else {
    // In development, load from the dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }
  
  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for Python script execution
ipcMain.handle('select-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });
  
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle('analyze-data', async (event, filePath) => {
  try {
    // Copy the Python script to a temporary location
    const pythonScript = join(app.getPath('temp'), 'spotify_analyzer.py');
    fs.writeFileSync(pythonScript, fs.readFileSync(join(__dirname, '../src/python/spotify_analyzer.py')));
    
    // Run the Python script with the file path
    const options = {
      mode: 'json',
      pythonOptions: ['-u'],
      args: [filePath]
    };
    
    const results = await PythonShell.run(pythonScript, options);
    return results[0];
  } catch (error) {
    console.error('Error running Python script:', error);
    return { error: error.message };
  }
});

// IPC handlers for Spotify authentication
ipcMain.handle('get-spotify-credentials', () => {
  return {
    accessToken: store.get('spotify_access_token'),
    refreshToken: store.get('spotify_refresh_token'),
    expiryTime: store.get('spotify_token_expiry')
  };
});

ipcMain.handle('save-spotify-credentials', (event, credentials) => {
  store.set('spotify_access_token', credentials.accessToken);
  store.set('spotify_refresh_token', credentials.refreshToken);
  store.set('spotify_token_expiry', credentials.expiryTime);
  return true;
});

ipcMain.handle('clear-spotify-credentials', () => {
  store.delete('spotify_access_token');
  store.delete('spotify_refresh_token');
  store.delete('spotify_token_expiry');
  return true;
});