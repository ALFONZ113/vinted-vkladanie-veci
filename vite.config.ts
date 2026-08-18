import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/vinted-vkladanie-veci/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Do Vinted',
        short_name: 'Do Vinted',
        description: 'Připrav inzerát a vlož ho ručně na Vinted.',
        theme_color: '#f4efe6',
        background_color: '#f4efe6',
        display: 'standalone',
        lang: 'cs',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5174,
  },
})
