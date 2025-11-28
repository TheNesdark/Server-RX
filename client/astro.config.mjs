import { defineConfig } from 'astro/config';

export default defineConfig({
  vite: {
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