import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // THIS EXACTLY MATCHES YOUR REPO NAME
  base: '/MoRN_Chess/', 
})
