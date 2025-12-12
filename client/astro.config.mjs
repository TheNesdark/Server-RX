// Force reload
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

import react from '@astrojs/react';

// URL del servidor API - configurable desde .env
const API_BASE_URL ="https://tablets-dreams-cardiac-lightning.trycloudflare.com"

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
        '/orthanc': {
          target: API_BASE_URL,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/orthanc/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.setHeader('Authorization', 'Basic TUVESUNPOk1FRElDTw==');
            });
          },
        },
      },
    },
  },

  integrations: [react()],
});