import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { checkContent } from '../scripts/check-content.mjs';
import { checkBuiltLinks } from '../scripts/check-built-links.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'baoyan-content-check-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src/content/experiences'), { recursive: true });
  return root;
}
async function put(root, path, text = '') {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, text);
}
function article(author = 'alice', year = 2026, extra = '') {
  return `---\ntitle: "经验"\nauthor: "${author}"\napplicationYear: ${year}\n${extra}---\n## 夏令营\n\n正文。\n`;
}

test('valid optional metadata and local cover pass; year README and MD attachments are not articles', async (t) => {
  const root = await fixture(t);
  await put(root, 'src/content/experiences/2026/README.md', '# 年份说明');
  await put(root, 'src/content/experiences/2026/alice/index.md', article('alice', 2026, 'institutions: []\ncover: "./cover.jpg"\n'));
  await put(root, 'src/content/experiences/2026/alice/cover.jpg', 'image fixture');
  await put(root, 'src/content/experiences/2026/alice/asset/README.md', '# 附件说明');
  assert.deepEqual(await checkContent(root), { errors: [], articles: 1 });
});

test('legacy authors are exempt by fixed path, but new historical submissions are checked', async (t) => {
  const root = await fixture(t);
  await put(root, 'src/content/experiences/2025/irokit-yt/index.md', article('IROKIT', 2025));
  assert.deepEqual((await checkContent(root)).errors, []);
  await put(root, 'src/content/experiences/2025/new-author/index.md', article('中文署名', 2025));
  const errors = (await checkContent(root)).errors.join('\n');
  assert.match(errors, /小写英文字母/);
  assert.match(errors, /目录名必须/);
});

test('year mismatch, nickname mismatch, unknown fields and missing covers fail together', async (t) => {
  const root = await fixture(t);
  await put(root, 'src/content/experiences/2026/alice/index.md', article('bob', 2025, 'publishedAt: 2026-01-01\ncover: "./missing.jpg"\n'));
  const errors = (await checkContent(root)).errors.join('\n');
  for (const pattern of [/年份目录不一致/, /目录名必须/, /未知字段 publishedAt/, /图片不存在/]) assert.match(errors, pattern);
});

test('duplicate YAML keys, missing title and malformed institutions are rejected', async (t) => {
  const root = await fixture(t);
  const path = 'src/content/experiences/2026/alice/index.md';
  await put(root, path, article('alice', 2026, 'author: bob\n'));
  assert.match((await checkContent(root)).errors.join('\n'), /YAML 无效/);
  await put(root, path, article('alice', 2026, 'institutions: "北京航空航天大学"\n').replace('title: "经验"\n', ''));
  const errors = (await checkContent(root)).errors.join('\n');
  assert.match(errors, /title 必须/);
  assert.match(errors, /institutions 必须/);
});

test('wrong article filename and redirect route conflict fail', async (t) => {
  const root = await fixture(t);
  await put(root, 'src/content/experiences/2026/alice/submission.md', article());
  assert.match((await checkContent(root)).errors.join('\n'), /index.md/);
  await put(root, 'src/content/experiences/2026/alice/index.md', article());
  await put(root, 'public/experiences/2026/alice/index.html', 'redirect');
  assert.match((await checkContent(root)).errors.join('\n'), /跳转页冲突/);
});

test('a folder with only pictures or uppercase index.MD is rejected instead of silently omitted', async (t) => {
  const root = await fixture(t);
  await put(root, 'src/content/experiences/2026/alice/cover.jpg', 'image');
  assert.match((await checkContent(root)).errors.join('\n'), /缺少 index.md/);
  await put(root, 'src/content/experiences/2026/alice/index.MD', article());
  const errors = (await checkContent(root)).errors.join('\n');
  assert.match(errors, /缺少 index.md/);
  assert.match(errors, /文章必须位于/);
});

test('new nicknames cannot collide with a case variant; cover must be a repository-relative path', async (t) => {
  const root = await fixture(t);
  await put(root, 'src/content/experiences/2026/alice/index.md', article('alice', 2026, 'cover: "https://example.invalid/cover.jpg"\n'));
  await put(root, 'src/content/experiences/2026/Alice/index.md', article('Alice', 2026));
  const errors = (await checkContent(root)).errors.join('\n');
  assert.match(errors, /文章路由冲突/);
  assert.match(errors, /相对图片路径/);
});

async function built(t, base = '/CS2026') {
  const dist = await fixture(t);
  const options = { dist, site: 'https://example.invalid', base };
  return { dist, options };
}

test('built links accept base paths, relative links, percent-encoded filenames and HTML entities', async (t) => {
  const { dist, options } = await built(t);
  await put(dist, 'index.html', '<a href="/CS2026/article/#a&amp;b">文章</a><img src="/CS2026/图%20片.jpg"><source srcset="/CS2026/图%20片.jpg 1x, /CS2026/other.webp 2x">');
  await put(dist, 'article/index.html', '<h2 id="a&amp;b">标题</h2><a href="../?q=foo">首页</a><a href="https://external.invalid/unreachable">外部</a><img src="data:image/png;base64,AAAA">');
  await put(dist, '图 片.jpg');
  await put(dist, 'other.webp');
  assert.deepEqual(await checkBuiltLinks(options), { errors: [], pages: 2 });
});

test('built links identify absent image, missing base, invalid anchor and duplicate IDs', async (t) => {
  const { dist, options } = await built(t);
  await put(dist, 'index.html', '<img src="/CS2026/missing.jpg"><a href="/article/">缺前缀</a><a href="/CS2026/article/#missing">缺锚点</a><a href="//example.invalid/CS2026/absent/">站内协议相对地址</a>');
  await put(dist, 'article/index.html', '<h2 id="duplicate">A</h2><h3 id="duplicate">B</h3>');
  const errors = (await checkBuiltLinks(options)).errors.join('\n');
  for (const pattern of [/missing.jpg/, /缺少站点前缀/, /目标锚点 #missing/, /重复的 id/, /absent/]) assert.match(errors, pattern);
});

test('root-site build handles query links and 404.html without a repository prefix', async (t) => {
  const { dist, options } = await built(t, '/');
  await put(dist, 'index.html', '<a href="/404.html">404</a><a href="?q=hello#intro">查询</a><h2 id="intro">介绍</h2>');
  await put(dist, '404.html', '<link rel="canonical" href="https://example.invalid/404.html"><a href="/">返回首页</a>');
  assert.deepEqual((await checkBuiltLinks(options)).errors, []);
});

test('empty output and malformed encoded URLs cannot produce a passing check', async (t) => {
  const { dist, options } = await built(t);
  assert.match((await checkBuiltLinks(options)).errors.join('\n'), /未找到 HTML/);
  await put(dist, 'index.html', '<a href="/CS2026/%zz/">损坏链接</a>');
  assert.equal((await checkBuiltLinks(options)).errors.length, 1);
});
