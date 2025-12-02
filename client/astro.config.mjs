// Force reload
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

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
          target: 'https://sega-avoid-dresses-citation.trycloudflare.com', // <--- ACTUALIZA ESTO
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // EL SERVIDOR PONE EL HEADER, NO TU CÓDIGO JS
              proxyReq.setHeader('Bypass-Tunnel-Reminder', 'true');
            });
          },
        },
      },
    },
  },
});