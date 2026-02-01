// Force reload
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import node from '@astrojs/node';
import { schedule } from 'node-cron';
import { sincronizarDatos } from '#/libs/orthanc';
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
    {
      name: 'astro-cron',
      hooks: {
        'astro:server:start': async () => {
          sincronizarDatos();
          schedule('0 0 * * *', () => {
            sincronizarDatos();
          });
        },
      },
    }
  ],
});