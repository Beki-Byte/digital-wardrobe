import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Digitaler Kleiderschrank',
        short_name: 'Kleiderschrank',
        description: 'Dein Kleiderschrank mit täglichen Outfit-Vorschlägen passend zum Wetter.',
        lang: 'de',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f3ede3',
        theme_color: '#f3ede3',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['start/**', 'neu/**'],
        navigateFallbackDenylist: [/\/start\//, /\/neu\//],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
