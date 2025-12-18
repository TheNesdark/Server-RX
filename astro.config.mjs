// Force reload
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import { loadEnv } from "vite";

const { API_BASE_URL } = loadEnv(process.env.NODE_ENV, process.cwd(), "");

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

  integrations: [preact()],
});