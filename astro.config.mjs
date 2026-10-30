// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { satteri, satteriHeadingIdsPlugin } from '@astrojs/markdown-satteri';
import { legacyArticleLinks } from './src/lib/legacy-article-links.mjs';
import { forewordContributors } from './src/lib/contributors.mjs';
import { obsidianImageSizes } from './src/lib/obsidian-image-sizes.mjs';

// Recolor only Shiki's dark variables; light tokens and token formatting stay intact.
const warmCodePalette = new Map([
  ['#24292e', '#211f1d'], ['#2f363d', '#211f1d'],
  ['#e1e4e8', '#eee7de'], ['#d1d5da', '#eee7de'],
  ['#6a737d', '#bdb0a4'],
  ['#79b8ff', '#d6a082'], ['#ffab70', '#d6a082'], ['#f97583', '#d6a082'],
  ['#9ecbff', '#ecc0a3'], ['#dbedff', '#ecc0a3'],
  ['#b392f0', '#ecc0a3'], ['#fdaeb7', '#ecc0a3'],
  ['#85e89d', '#889984'],
  ['#86181d', '#342f29'], ['#144620', '#282520'], ['#c24e00', '#342f29'],
]);

/** @param {import('hast').Element} node */
function warmCodeColors(node) {
  const style = node.properties.style;
  if (typeof style !== 'string') return;
  node.properties.style = style.replace(
    /(--shiki-dark(?:-bg)?:)(#[\da-f]{3,8})/gi,
    (_, property, color) => `${property}${warmCodePalette.get(color.toLowerCase()) ?? color}`,
  );
}

export default defineConfig({
  site: 'https://jnu-cs-baoyan.github.io',
  // GitHub Pages needs the repository prefix; local dev should stay at `/`.
  base: process.env.NODE_ENV === 'development' ? '/' : '/CS2026',
  markdown: {
    processor: satteri({ hastPlugins: [satteriHeadingIdsPlugin(), legacyArticleLinks, obsidianImageSizes, forewordContributors] }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      transformers: [{ name: 'warm-charcoal', pre: warmCodeColors, span: warmCodeColors }],
    },
  },
  integrations: [mdx(), sitemap()],
});

