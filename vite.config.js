import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/icon.svg'],
      manifest: {
        name: 'Imoloc — Gestion Immobilière',
        short_name: 'Imoloc',
        description: 'Plateforme SaaS de gestion immobilière internationale',
        theme_color: '#0078d4',
        background_color: '#0d1117',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'fr',
        icons: [
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        shortcuts: [
          { name: 'Baux', short_name: 'Baux', url: '/imoloc/baux', description: 'Gestion des baux' },
          { name: 'Paiements', short_name: 'Paiements', url: '/imoloc/paiements', description: 'Gestion des paiements' },
          { name: 'Locataires', short_name: 'Locataires', url: '/imoloc/locataires', description: 'Gestion des locataires' },
        ],
        categories: ['business', 'finance', 'productivity'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
})
