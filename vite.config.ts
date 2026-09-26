/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// Tes memakai zona waktu WIB supaya hasilnya sama di laptop dan di CI (UTC).
process.env.TZ ??= 'Asia/Jakarta';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '.',
        name: 'TC Counter',
        short_name: 'TC Counter',
        description: 'Traffic counting manual per interval, offline, export Excel.',
        lang: 'id',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        theme_color: '#17191b',
        background_color: '#17191b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // ExcelJS (~1 MB) ikut di-precache supaya export jalan offline.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
  },
});
