import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' → funktioniert unter /digital-wardrobe/start/ auf GitHub Pages
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1200 },
})
