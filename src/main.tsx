import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import SpotifyCallback from './components/SpotifyCallback';
import './index.css';

// Initialize Spotify service
import { ensureToken } from './services/spotifyService';

// Try to ensure we have a valid token on startup
ensureToken().catch(error => {
  console.log('No valid Spotify token available, user will need to connect');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/callback" element={<SpotifyCallback />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);