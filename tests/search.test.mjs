import assert from 'node:assert/strict';
import test from 'node:test';
import { searchRecords, searchSnippet } from '../src/lib/search.ts';
import { buildSearchIndex } from '../src/lib/search-index.ts';

function source(overrides = {}) {
  return {
    kind: 'experience', section: '经验贴', title: '保研经历', author: 'alice', year: 2026,
    undergraduateMajor: '人工智能', institutions: ['北京航空航天大学'],
    institutionKeywords: '北京航空航天大学 北航', path: '/CS2026/experiences/2026/alice/',
    body: '学习机器学习，准备面试。', ...overrides,
  };
}

test('experience queries retain aliases, year/author/major fields and AND matching', async () => {
  const records = await buildSearchIndex([source()]);
  for (const query of ['北航 2026', '北京航空航天大学', 'ALICE', '人工智能', '机器学习，面试']) {
    assert.equal(searchRecords(records, query).length, 1, query);
  }
  assert.equal(searchRecords(records, '北航 2025').length, 0);
  assert.equal(searchRecords(records, '').length, 0);
  assert.equal(searchRecords(records, ' ☀ ' ).length, 0);
});

test('page bodies, titles, sections and rendered introductions are searchable without phantom years', async () => {
  const records = await buildSearchIndex([source({
    kind: 'page', section: '投稿说明', title: '分享一篇经验', author: '', year: null,
    undergraduateMajor: '', institutions: [], institutionKeywords: '', path: '/CS2026/submit/',
    body: '## Markdown 模板\n\n通过 PR 提交完整个人文件夹。', extraText: '欢迎匿名投稿。',
  })]);
  for (const query of ['投稿说明', '匿名投稿', 'Markdown', 'PR 文件夹', '分享一篇经验']) {
    assert.equal(searchRecords(records, query).length, 1, query);
  }
  assert.equal(searchRecords(records, 'null').length, 0);
  assert.equal(searchRecords(records, '2026').length, 0);
  assert.equal(records[0].path, '/CS2026/submit/');
});

test('index extracts visible Markdown text and code, omitting comments, HTML attributes and scripts', async () => {
  const records = await buildSearchIndex([source({ body: '学习**数据**结构 &amp; 算法。\n\n<!-- 私有提示暗号 -->\n\n<img src="hidden-filename.jpg" alt="插图说明" width="9999">\n\n<script>hiddenScriptSecret</script>\n<style>.hiddenClass { color: red; }</style>\n\n```yaml\napplicationYear: 2026\n```\n' })]);
  for (const query of ['数据结构', '插图说明', 'applicationYear']) assert.equal(searchRecords(records, query).length, 1, query);
  for (const query of ['暗号', 'hidden-filename', '9999', 'hiddenScriptSecret', 'hiddenClass']) assert.equal(searchRecords(records, query).length, 0, query);
  assert(records[0].text.includes('& 算法'));
  assert(!records[0].text.includes('&amp;'));
});

test('matching page titles take priority while ties keep the existing record order', async () => {
  const records = await buildSearchIndex([
    source({ author: 'first', body: '我看了简历指导。' }),
    source({ author: 'second', body: '我也看了简历指导。' }),
    source({ kind: 'page', section: '资料与工具', title: '简历指导', body: '写好简历。', path: '/CS2026/resources/' }),
  ]);
  const matches = searchRecords(records, '简历指导');
  assert.equal(matches[0].kind, 'page');
  assert.deepEqual(matches.slice(1).map((item) => item.author), ['first', 'second']);
});

test('snippets use visible text offsets and find separate query terms, including Latin case variants', () => {
  const text = '前文。'.repeat(100) + 'Markdown 投稿说明。' + '后文。'.repeat(100);
  const snippet = searchSnippet(text, 'MARKDOWN 投稿');
  assert(snippet.startsWith('…'));
  assert(snippet.includes('Markdown 投稿说明'));
  assert(snippet.endsWith('…'));
  assert.equal(searchSnippet('没有匹配的短文。', '北航'), '没有匹配的短文。');
});
