// Force reload
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// URL del servidor API - configurable desde .env
const API_BASE_URL = process.env.API_BASE_URL || 'https://sega-avoid-dresses-citation.trycloudflare.com';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  vite: {
    resolve: {
      alias: {
        "@config": "./src/config",
      },
    },
    server: {
      proxy: {
        '/api': {
          target: API_BASE_URL,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.setHeader('Bypass-Tunnel-Reminder', 'true');
            });
          },
        },
      },
    },
  },
});