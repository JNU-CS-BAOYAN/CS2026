import boldCss from 'lxgw-wenkai-webfont/lxgwwenkai-bold.css?raw';
import atkinsonRegular from '../assets/fonts/atkinson-regular.woff?url';
import { fontSubsets, subsetsForText } from './font-ranges';

const boldSubsets = fontSubsets(boldCss);
const boldUrls = import.meta.glob<string>('/node_modules/lxgw-wenkai-webfont/files/lxgwwenkai-bold-subset-*.woff2', {
  eager: true, query: '?url', import: 'default',
});

export function titleFontPreloads(text: string): Array<{ href: string; type: string }> {
  return [
    { href: atkinsonRegular, type: 'font/woff' },
    ...subsetsForText(boldSubsets, text).map((filename) => {
      const href = boldUrls[`/node_modules/lxgw-wenkai-webfont/files/${filename}`];
      if (!href) throw new Error(`Missing font subset URL: ${filename}`);
      return { href, type: 'font/woff2' };
    }),
  ];
}
