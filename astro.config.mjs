// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jnu-cs-baoyan.github.io',
  // GitHub Pages needs the repository prefix; local dev should stay at `/`.
  base: process.env.NODE_ENV === 'development' ? '/' : '/CS2026',
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
  integrations: [mdx(), sitemap()],
});

