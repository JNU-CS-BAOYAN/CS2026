// Build-time only: Markdown parsers must not enter the browser bundle.
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { unescape } from 'html-escaper';
import { ELEMENT_NODE, TEXT_NODE, parse, type Node } from 'ultrahtml';
import type { SearchRecord } from './search';
import { obsidianImageSizes } from './obsidian-image-sizes.mjs';

const blocks = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'li', 'td', 'th', 'pre', 'blockquote', 'br', 'hr']);

export function visibleHtmlText(html: string) {
  const visit = (node: Node): string => {
    if (node.type === TEXT_NODE) return unescape(node.value);
    if (node.type === ELEMENT_NODE) {
      if (['script', 'style'].includes(node.name)) return '';
      if (node.name === 'img') return unescape(node.attributes.alt ?? '');
    }
    if (!('children' in node)) return '';
    const text = node.children.map(visit).join('');
    return node.type === ELEMENT_NODE && blocks.has(node.name) ? ` ${text} ` : text;
  };
  return visit(parse(html)).replace(/\s+/g, ' ').trim();
}

export interface SearchSource extends Omit<SearchRecord, 'text'> {
  body: string;
  extraText?: string;
}

export async function buildSearchIndex(sources: SearchSource[]): Promise<SearchRecord[]> {
  const renderer = await createSatteriMarkdownProcessor({ syntaxHighlight: false, hastPlugins: [obsidianImageSizes] });
  return Promise.all(sources.map(async ({ body, extraText = '', ...record }) => {
    const { code } = await renderer.render(body);
    return { ...record, text: `${extraText} ${visibleHtmlText(code)}`.replace(/\s+/g, ' ').trim() };
  }));
}
