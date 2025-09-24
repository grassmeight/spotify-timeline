import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import SpotifyCallback from './components/SpotifyCallback';
import './index.css';


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