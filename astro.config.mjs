// Force reload
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import path from 'path';
import { fileURLToPath } from 'url';

import vercel from '@astrojs/vercel';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'server',

  adapter: vercel(),

  vite: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
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