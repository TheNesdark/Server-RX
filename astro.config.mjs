// Force reload
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), "");
const { API_BASE_URL, ORTHANC_USERNAME, ORTHANC_PASSWORD } = env;
const ORTHANC_AUTH = `Basic ${btoa(`${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`)}`; 

if (!API_BASE_URL) {
  console.warn('API_BASE_URL not found in environment variables. Proxy may not work correctly.');
}

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
    server: {
      proxy: {
        '/orthanc': {
          target: API_BASE_URL,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/orthanc/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              try {
                proxyReq.setHeader('Authorization', ORTHANC_AUTH);
              } catch (error) {
                console.error('Error setting proxy authorization header:', error);
              }
            });
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Proxy error occurred');
              }
            });
          },
        },
      },
    },
  },

  integrations: [preact()],
});