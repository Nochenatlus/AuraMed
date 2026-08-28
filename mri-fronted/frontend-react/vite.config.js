import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // MriMonitoring.Api varsayılan olarak http://localhost:5119'da çalışır (bkz. Properties/launchSettings.json).
      '/api': { target: 'http://localhost:5119', changeOrigin: true },
      '/hubs': { target: 'http://localhost:5119', changeOrigin: true, ws: true }
    }
  }
});
