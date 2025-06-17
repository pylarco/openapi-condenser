import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { API_PREFIX, API_HOST, API_PORT } from './src/shared/constants'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      [API_PREFIX]: {
        target: `http://${API_HOST}:${API_PORT}`,
        changeOrigin: true,
      }
    }
  },
  build: {
    // Output to the dist directory which matches our wrangler.toml configuration
    outDir: 'dist',
    // Generate assets with hashed filenames for better caching
    assetsDir: 'assets',
    // Make sure source maps are generated for easier debugging
    sourcemap: true,
    // Ensure Vite optimizes the build for production
    minify: 'terser',
    // Configure Terser for optimal production builds
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      }
    }
  }
})