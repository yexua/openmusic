import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function siteSeoFiles(siteUrl?: string) {
  return {
    name: 'openmusic-site-seo',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');
      const robots = [
        'User-agent: *',
        'Allow: /',
        '',
        '# 房间与电视模式为动态会话页，不参与收录',
        'Disallow: /room/',
        'Disallow: /tv/',
        '',
        ...(siteUrl ? [`Sitemap: ${siteUrl}/sitemap.xml`] : []),
        '',
      ].join('\n');
      writeFileSync(resolve(dist, 'robots.txt'), robots);

      if (siteUrl) {
        const sitemap = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          '  <url>',
          `    <loc>${siteUrl}/</loc>`,
          '    <changefreq>daily</changefreq>',
          '    <priority>1.0</priority>',
          '  </url>',
          '</urlset>',
          '',
        ].join('\n');
        writeFileSync(resolve(dist, 'sitemap.xml'), sitemap);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const siteUrl = env.VITE_SITE_URL?.replace(/\/$/, '');

  return {
    plugins: [react(), siteSeoFiles(siteUrl)],
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:4000',
        '/socket.io': {
          target: 'http://localhost:4000',
          ws: true,
        },
      },
    },
  };
});
