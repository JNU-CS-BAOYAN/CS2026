import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { contactHints, contactReport, externalLinks, formatContactReport, formatLinkReport, inspectLinks, requestLink } from '../scripts/review-content.mjs';

const exec = promisify(execFile);
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'baoyan-content-review-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src/content/experiences'), { recursive: true });
  await mkdir(join(root, 'src/content/pages'), { recursive: true });
  return root;
}
async function put(root, path, text) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), text);
}
async function git(root, ...args) { return exec('git', args, { cwd: root }); }

test('contact report identifies actual values without confusing email digits, URLs or general terms', () => {
  const source = '联系我：13800138000@example.invalid\nQQ：123456789\n电话：13800138000\n微信：alice_2026\n学校的 QQ 群，联系老师的邮箱\nhttps://example.invalid/13800138000\n';
  const findings = contactHints(source, 'index.md');
  assert.deepEqual(findings.map(({ line, kind }) => [line, kind]), [[1, 'email'], [2, 'qq'], [3, 'phone'], [4, 'wechat']]);
  const report = formatContactReport({ scope: '测试', files: 1, findings });
  assert(!/13800138000|123456789|alice_2026|@example/.test(report));
  assert.match(report, /不自动改稿/);
});

test('comment and fenced code examples are skipped without changing real line numbers', () => {
  const source = '<!--\nexample@example.invalid\n-->\n```yaml\nemail: example@example.invalid\n```\n联系邮箱：`real@example.invalid`\n~~~text\nQQ：123456789\n~~~\n';
  assert.deepEqual(contactHints(source, 'article.md'), [{ file: 'article.md', line: 7, kind: 'email' }]);
});

test('PR contact review scopes hints to committed content changes and excludes unchanged history', async (t) => {
  const root = await fixture(t);
  await git(root, 'init', '-b', 'main');
  await git(root, 'config', 'user.name', 'Test');
  await git(root, 'config', 'user.email', 'test@example.invalid');
  await put(root, 'src/content/experiences/2025/old/index.md', '联系：old@example.invalid');
  await git(root, 'add', '.');
  await git(root, 'commit', '-m', 'baseline');
  await git(root, 'checkout', '-b', 'submission');
  await put(root, 'src/content/experiences/2026/alice/index.md', '联系：new@example.invalid');
  await git(root, 'add', '.');
  await git(root, 'commit', '-m', 'submit');
  const report = await contactReport(root, 'main');
  assert.equal(report.files, 1);
  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].file, 'src/content/experiences/2026/alice/index.md');
});

test('external inventory uses rendered links, repairs historical URLs, merges anchors and includes sourceUrl', async (t) => {
  const root = await fixture(t);
  await put(root, 'src/content/experiences/2025/klein-sc/index.md', '---\ntitle: Test\nsourceUrl: "https://example.invalid/original"\n---\n[目录](./南京航空航天大学/)\n[一](https://example.invalid/news?id=1#one)\n[二](https://example.invalid/news?id=1#two)\n<!-- [隐藏](https://ignored.invalid/) -->\n```md\n[示例](https://ignored.invalid/)\n```\n');
  await put(root, 'src/content/pages/resources.md', '[同一链接](https://example.invalid/news?id=1)');
  const links = await externalLinks(root);
  assert.equal(links.length, 3);
  assert(!links.some((row) => row.url.includes('ignored.invalid')));
  assert(links.some((row) => row.url.startsWith('https://github.com/kleinblue4/Record-of-Klein')));
  const news = links.find((row) => row.url === 'https://example.invalid/news?id=1');
  assert.equal(news.sources.length, 3);
  assert.equal(news.sources[0].line, 6);
  assert(links.some((row) => row.url === 'https://example.invalid/original'));
});

test('external results distinguish successful redirects, unavailable URLs, restrictions and server errors', async () => {
  const kinds = new Map([[200, 'ok'], [206, 'ok'], [404, 'unavailable'], [410, 'unavailable'], [403, 'restricted'], [429, 'restricted'], [503, 'server']]);
  for (const [status, kind] of kinds) {
    let cancelled = false;
    const result = await requestLink('https://example.invalid/news', { request: async (url, options) => {
      assert.equal(url, 'https://example.invalid/news');
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'follow');
      return { status, url: 'https://example.invalid/landing', body: { cancel: async () => { cancelled = true; } } };
    } });
    assert.equal(result.kind, kind);
    assert.equal(result.finalUrl, 'https://example.invalid/landing');
    assert(cancelled);
  }
});

test('timeouts, network errors, invalid URLs and obvious local destinations are reportable without fatal failure', async () => {
  for (const [name, kind] of [['TimeoutError', 'timeout'], ['AbortError', 'timeout'], ['TypeError', 'network']]) {
    assert.equal((await requestLink('https://example.invalid/', { request: async () => { const error = new Error(); error.name = name; throw error; } })).kind, kind);
  }
  let requests = 0;
  const request = async () => { requests++; };
  assert.equal((await requestLink('https://[invalid/', { request })).kind, 'invalid');
  for (const url of ['http://localhost/', 'http://127.0.0.1/', 'http://192.168.1.2/', 'https://user:password@example.invalid/']) {
    assert.equal((await requestLink(url, { request })).kind, 'skipped');
  }
  assert.equal(requests, 0);
});

test('bounded concurrent checks preserve inventory order and write readable reports for all statuses', async () => {
  const links = Array.from({ length: 9 }, (_, i) => ({ url: `https://example.invalid/${i}`, sources: [{ file: 'article.md', line: i + 1 }] }));
  let active = 0, peak = 0;
  const results = await inspectLinks(links, { request: async (url) => {
    active++; peak = Math.max(peak, active);
    await new Promise((done) => setTimeout(done, 2));
    active--;
    return { status: url.endsWith('0') ? 404 : 403, url };
  } });
  assert(peak <= 4);
  assert.deepEqual(results.map((row) => row.url), links.map((row) => row.url));
  const markdown = formatLinkReport(results);
  assert.match(markdown, /失效候选 1/);
  assert.match(markdown, /访问受限 8/);
  assert.match(markdown, /article.md:1/);
  assert.match(markdown, /不证明内容/);
});
