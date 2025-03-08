import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory
  const env = loadEnv(mode, process.cwd());
  
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      open: true
    },
    define: {
      // Expose env variables to the client
      'process.env.VITE_SPOTIFY_CLIENT_ID': JSON.stringify(env.VITE_SPOTIFY_CLIENT_ID),
      'process.env.VITE_SPOTIFY_CLIENT_SECRET': JSON.stringify(env.VITE_SPOTIFY_CLIENT_SECRET),
      'process.env.VITE_SPOTIFY_REDIRECT_URI': JSON.stringify(env.VITE_SPOTIFY_REDIRECT_URI)
    }
  };
});