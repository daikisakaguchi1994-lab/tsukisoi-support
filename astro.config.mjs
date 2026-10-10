// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com',
  // サンプル表示の検証用に、出力先を環境変数で分けられる（通常は dist）
  outDir: process.env.ASTRO_OUT_DIR || 'dist',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
