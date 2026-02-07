// Force reload
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import node from '@astrojs/node';
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'dwv': ['dwv']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
  },

  integrations: [
    preact(),
  ],
});