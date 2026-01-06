// Force reload
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';

export default defineConfig({
  output: 'server',

  adapter: node({
    mode: 'standalone',
  }),

  vite: {
    resolve: {
      alias: {
        "@/*": "./src/*",
      },
    },
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

  integrations: [preact()],
});