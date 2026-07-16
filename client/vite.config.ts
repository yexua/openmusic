import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';
import { buildRobotsTxt, buildSitemapXml, resolveDevSiteOrigin } from '../server/seoFiles.js';

function seoDevMiddleware() {
  return {
    name: 'openmusic-seo-dev',
    enforce: 'pre' as const,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0];
        if (pathname !== '/sitemap.xml' && pathname !== '/robots.txt') {
          next();
          return;
        }

        const origin = resolveDevSiteOrigin(req);
        const body = pathname === '/robots.txt' ? buildRobotsTxt(origin) : buildSitemapXml(origin);
        res.setHeader('Content-Type', pathname === '/robots.txt' ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8');
        res.end(body);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    seoDevMiddleware(),
    compression({
      threshold: 1024,
      algorithms: ['gzip', 'brotliCompress'],
      skipIfLargerOrEqual: true,
    }),
  ],
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    chunkSizeWarningLimit: 600,
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            // 聊天相关拆出，避免塞进 Room 主包
            if (
              id.includes('/components/Chat')
              || id.includes('/components/Sticker')
              || id.includes('/components/UserSticker')
              || id.includes('/lib/chat')
              || id.includes('/lib/qface')
              || id.includes('/stores/chat')
            ) {
              return 'chat-ui';
            }
            if (id.includes('/components/queue/') || id.includes('/components/QueuePanel')) {
              return 'queue-ui';
            }
            return;
          }
          if (id.includes('three') || id.includes('@react-three') || id.includes('@mediapipe')) {
            return;
          }
          if (id.includes('socket.io-client')) {
            return 'socket-vendor';
          }
          if (id.includes('lucide-react')) {
            return 'icons-vendor';
          }
          if (id.includes('zustand')) {
            return 'zustand-vendor';
          }
          if (id.includes('react-window')) {
            return 'window-vendor';
          }
          if (
            id.includes('react-dom')
            || id.includes('react-router')
            || /[/\\]react[/\\]/.test(id)
          ) {
            return 'react-vendor';
          }
        },
      },
    },
  },
  esbuild: {
    drop: ['debugger'],
    legalComments: 'none',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/wx-proxy': 'http://localhost:4000',
      '/cgi-bin': 'http://localhost:4000',
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
});
