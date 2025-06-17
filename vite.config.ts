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
  }
})