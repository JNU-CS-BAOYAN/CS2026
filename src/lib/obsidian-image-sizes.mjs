// @ts-check

/** A positive pixel width after the last pipe in a Markdown image description. */
/** @param {string} alt */
export function parseObsidianImageSize(alt) {
  const match = /^(.*)\|([1-9]\d*)$/.exec(alt.trim());
  if (!match) return null;
  const width = Number(match[2]);
  if (!Number.isSafeInteger(width)) return null;
  return { alt: match[1].trimEnd(), width };
}

/** Runs before Astro's image marker so local asset processing and GIF animation remain intact. */
/** @type {import('satteri').HastPluginEntry} */
export const obsidianImageSizes = () => ({
  name: 'obsidian-image-sizes',
  element: {
    filter: ['img'],
    visit(node, ctx) {
      const alt = node.properties.alt;
      if (typeof alt !== 'string') return;
      const size = parseObsidianImageSize(alt);
      if (!size) return;
      const existingStyle = typeof node.properties.style === 'string' ? node.properties.style : '';
      const classes = node.properties.className ?? [];
      const style = `--markdown-image-width: ${size.width}px;`;
      ctx.setProperty(node, 'alt', size.alt);
      ctx.setProperty(node, 'className', [...classes, 'markdown-image-sized']);
      ctx.setProperty(node, 'style', existingStyle ? `${existingStyle}; ${style}` : style);
    },
  },
});
