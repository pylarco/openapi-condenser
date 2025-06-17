import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { API_BASE_URL, API_PREFIX } from './src/shared/constants'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      [API_PREFIX]: API_BASE_URL
    }
  }
})