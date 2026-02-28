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
    server: {
      fs: {
        // Bloquear acceso directo a archivos sensibles de la raíz del proyecto
        deny: [
          'config.json',
          'sea-config.json',
          'package.json',
          'package-lock.json',
          'tsconfig.json',
          '.env',
          '.env.*',
          '*.{pem,key,crt}',
        ],
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'larvitar': ['larvitar']
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