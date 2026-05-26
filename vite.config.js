import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // REPLACE '/open-chess/' with exactly whatever your GitHub repository name is!
  base: '/open-chess/', 
})