import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createSatteriMarkdownProcessor, satteriHeadingIdsPlugin } from '@astrojs/markdown-satteri';
import { legacyArticleLinks } from '../src/lib/legacy-article-links.mjs';

const renderer = await createSatteriMarkdownProcessor({
  syntaxHighlight: false,
  hastPlugins: [satteriHeadingIdsPlugin(), legacyArticleLinks],
});

function render(body, article, year = 2025) {
  return renderer.render(body, {
    fileURL: new URL(`../src/content/experiences/${year}/${article}/index.md`, import.meta.url),
  });
}

test('historical hand-written directories resolve to visible title or actual headings', async () => {
  for (const article of ['ccandtt-yt', 'feather1023-yt', 'mkk-sc', 'xxy-yt']) {
    const file = new URL(`../src/content/experiences/2025/${article}/index.md`, import.meta.url);
    const source = await readFile(file, 'utf8');
    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    const { code, metadata } = await render(body, article);
    const targets = new Set(['article-title', ...metadata.headings.map((h) => h.slug)]);
    const links = [...code.matchAll(/href="(#[^"]+)"/g)].map((m) => decodeURIComponent(m[1].slice(1)));
    assert.ok(links.length > 0, article);
    for (const link of links) assert.ok(targets.has(link), `${article}: #${link}`);
    assert.ok(metadata.headings.some((h) => h.text === '目录'), article);
    assert.equal(await readFile(file, 'utf8'), source);
  }
});

test('a valid link to the hidden original title targets the visible layout title', async () => {
  const result = await render('# Example\n\n[回到标题](#example)\n', 'irokit-yt');
  assert.match(result.code, /href="#article-title"/);
  assert.equal(result.metadata.headings[0].slug, 'example');
});

test('legacy repairs stay scoped to the original article and year', async () => {
  const body = '# Example\n\n[旧目录](##摘要)\n\n## 摘要\n';
  assert.match((await render(body, 'ccandtt-yt')).code, /href="#摘要"/);
  for (const [article, year] of [['another-author', 2025], ['ccandtt-yt', 2026]]) {
    assert.match((await render(body, article, year)).code, /href="##(?:摘要|%E6%91%98%E8%A6%81)"/);
  }
});

test('code examples, unknown links and malformed percent escapes are preserved', async () => {
  const result = await render('```md\n[示例](##摘要)\n```\n\n[未知](#not-a-heading) [坏编码](#%ZZ) [普通路径](constructor)\n', 'ccandtt-yt');
  assert.match(result.code, /\[示例\]\(##摘要\)/);
  assert.match(result.code, /href="#not-a-heading"/);
  assert.match(result.code, /href="#%ZZ"/);
  assert.match(result.code, /href="constructor"/);
});

test('missing resource directories link to the verified original repository', async () => {
  const result = await render('[论文](./中山大学-软件学院/中山大学-论文研读范围/)\n\n[活动](./南京航空航天大学/)\n', 'klein-sc');
  assert.match(result.code, /href="https:\/\/github.com\/kleinblue4\/Record-of-Klein-s-25-BaoYan\/tree\/main\/SummerCamp\/中山大学-软件学院\/中山大学-论文研读范围"/);
  assert.match(result.code, /href="https:\/\/github.com\/kleinblue4\/Record-of-Klein-s-25-BaoYan\/tree\/main\/SummerCamp\/南京航空航天大学"/);
});

test('unavailable notices keep their exact URLs and gain readable adjacent status text', async () => {
  for (const article of ['klein-sc', 'lulu-sc']) {
    const file = new URL(`../src/content/experiences/2025/${article}/index.md`, import.meta.url);
    const source = await readFile(file, 'utf8');
    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    const { code } = await render(body, article);
    assert.equal([...code.matchAll(/（原链接已失效）/g)].length, article === 'klein-sc' ? 2 : 1);
    assert.match(code, /<\/a><span class="legacy-link-status"[^>]*>（原链接已失效）<\/span>/);
    if (article === 'klein-sc') {
      assert.match(code, /href="https:\/\/informatics.xmu.edu.cn\/info\/1050\/45710.htm"/);
      assert.match(code, /href="https:\/\/soft.buaa.edu.cn\/news_nry.jsp\?urltype=news.NewsContentUrl&amp;wbtreeid=1117&amp;wbnewsid=11912"/);
    } else assert.match(code, /href="https:\/\/see.tongji.edu.cn\/info\/1147\/13909.htm"/);
    assert.equal(await readFile(file, 'utf8'), source);
  }
});

test('unavailability notices do not apply to other articles, years or access-restricted platforms', async () => {
  const body = '[通知](https://informatics.xmu.edu.cn/info/1050/45710.htm)\n\n[知乎](https://zhuanlan.zhihu.com/p/1946176384578856692)\n';
  for (const [article, year] of [['another-author', 2025], ['klein-sc', 2026]]) {
    assert.doesNotMatch((await render(body, article, year)).code, /legacy-link-status/);
  }
  const { code } = await render(body, 'klein-sc');
  assert.equal([...code.matchAll(/class="legacy-link-status"/g)].length, 1);
  assert.match(code, /href="https:\/\/zhuanlan.zhihu.com\/p\/1946176384578856692">知乎<\/a>/);
});

test('the mismatched school notice is annotated only in the affected article', async () => {
  const body = '[夏令营通知](https://ga.sjtu.edu.cn/zsgl/xxgs/xlyhdbfmx.aspx)';
  const { code } = await render(body, 'lulu-sc');
  assert.match(code, /href="https:\/\/ga.sjtu.edu.cn\/zsgl\/xxgs\/xlyhdbfmx.aspx">夏令营通知<\/a><span[^>]*>（链接指向上海交通大学）<\/span>/);
  assert.doesNotMatch(code, /（原链接已失效）/);
  for (const [article, year] of [['lomig-sc', 2025], ['lulu-sc', 2026]]) {
    assert.doesNotMatch((await render(body, article, year)).code, /legacy-link-status/);
  }
});
