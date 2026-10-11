import type { ExperienceEntry } from './experiences';

export interface ArticleAttachment {
  name: string;
  href: string;
  type: string;
  isImage: boolean;
}

// URL imports emit the original bytes, including small files, under the site's base URL.
const files = import.meta.glob<string>(
  '/src/content/experiences/**/{asset,assets}/**/*.{png,jpg,jpeg,webp,gif,pdf,docx,md,txt,zip}',
  { eager: true, query: '?url&no-inline', import: 'default' },
);

export function articleAttachments(entry: ExperienceEntry): ArticleAttachment[] {
  const filePath = entry.filePath ?? `src/content/experiences/${entry.id.replace(/\/index$/, '')}/index.md`;
  const directory = `/${filePath.replace(/^\.\//, '').replace(/^\//, '').replace(/\/index\.md$/, '')}/`;

  return Object.entries(files)
    .filter(([path]) => path.startsWith(`${directory}asset/`) || path.startsWith(`${directory}assets/`))
    .map(([path, href]) => {
      const name = path.slice(directory.length).replace(/^assets?\//, '');
      const extension = name.split('.').at(-1)?.toLowerCase() ?? '';
      return {
        name,
        href,
        type: extension.toUpperCase(),
        isImage: /^(png|jpe?g|webp|gif)$/.test(extension),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }));
}
