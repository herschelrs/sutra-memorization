import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'
import { createHash } from 'crypto'

function refPatternsHash(): string {
  const content = readFileSync('public/vendor/kanjicanvas/ref-patterns.js');
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

// https://vite.dev/config/
export default defineConfig({
  base: '/sutra-memorization/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      workbox: {
        globPatterns: ['**/*.{js,css,html}'],
        globIgnores: ['vendor/kanjicanvas/ref-patterns.js'],
        runtimeCaching: [
          {
            urlPattern: /vendor\/kanjicanvas\/ref-patterns\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kanji-patterns',
              expiration: { maxEntries: 1, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
        ],
        navigateFallback: '/sutra-memorization/index.html',
      },
      manifest: {
        name: 'お經 — Sutra Memorization',
        short_name: 'お經',
        description: 'Memorize Sino-Japanese sutras as chanted in the Zen tradition',
        theme_color: '#4a6741',
        background_color: '#faf8f5',
        display: 'standalone',
        scope: '/sutra-memorization/',
        start_url: '/sutra-memorization/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { host: true },
  define: {
    __REF_PATTERNS_HASH__: JSON.stringify(refPatternsHash()),
  },
})
