import assert from 'node:assert/strict';
import test from 'node:test';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { parse } from 'ultrahtml';
import { unescape } from 'html-escaper';
import { obsidianImageSizes, parseObsidianImageSize } from '../src/lib/obsidian-image-sizes.mjs';

test('only a positive integer after the last pipe specifies image width', () => {
  assert.deepEqual(parseObsidianImageSize('插图 1|50'), { alt: '插图 1', width: 50 });
  assert.deepEqual(parseObsidianImageSize('A|B|300'), { alt: 'A|B', width: 300 });
  for (const alt of ['插图 1', '50', '插图|0', '插图|-50', '插图|50%', '插图|50x100', '插图|1.5', '插图|50px', '插图|9007199254740992']) {
    assert.equal(parseObsidianImageSize(alt), null, alt);
  }
});

test('local GIF retains its asset path, with clean alt text and CSS width passed to Astro', async () => {
  const renderer = await createSatteriMarkdownProcessor({ syntaxHighlight: false, hastPlugins: [obsidianImageSizes] });
  const result = await renderer.render('![插图 1|50](./amiya.gif)');
  const image = parse(result.code).children[0].children[0];
  const props = JSON.parse(unescape(image.attributes.__ASTRO_IMAGE_));
  assert.equal(props.src, './amiya.gif');
  assert.equal(props.alt, '插图 1');
  assert.equal(props.style, '--markdown-image-width: 50px;');
  assert.deepEqual(result.metadata.localImagePaths, ['./amiya.gif']);
  assert(props.className.includes('markdown-image-sized'));
  // Presentation width does not resize or replace the animated source asset.
  assert(!('width' in props));
  assert(!('height' in props));
});

test('remote images support width; plain images, links and code examples remain unchanged', async () => {
  const renderer = await createSatteriMarkdownProcessor({ syntaxHighlight: false, hastPlugins: [obsidianImageSizes] });
  const source = '![动图|50](https://example.org/a.gif)\n\n![原图](https://example.org/b.png)\n\n[链接|50](./other/)\n\n`![代码|50](./amiya.gif)`\n\n```md\n![示例|50](./amiya.gif)\n```';
  const { code } = await renderer.render(source);
  assert(code.includes('alt="动图"'));
  assert(code.includes('--markdown-image-width: 50px;'));
  assert(code.includes('alt="原图"'));
  assert(code.includes('>链接|50</a>'));
  assert(code.includes('![代码|50](./amiya.gif)'));
  assert(code.includes('![示例|50](./amiya.gif)'));
  assert.equal((code.match(/markdown-image-sized/g) ?? []).length, 1);
});
