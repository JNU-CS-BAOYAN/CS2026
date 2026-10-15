import assert from 'node:assert/strict';
import test from 'node:test';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { normalizeContributors, contributorsElement, contributors, forewordContributors } from '../src/lib/contributors.mjs';

test('manual contributors support accounts, aliases and nicknames without accounts', () => {
  const list = normalizeContributors([{ github: 'New-User' }, { name: ' 小江 ', github: 'Someone' }, { name: '匿名作者' }]);
  assert.deepEqual(list.map(({ name, github, initial }) => [name, github, initial]), [['New-User', 'New-User', 'N'], ['小江', 'Someone', '小'], ['匿名作者', undefined, '匿']]);
  assert.equal(contributorsElement(list).children[2].tagName, 'span');
});

test('bad manual entries fail with useful item numbers instead of broken avatar links', () => {
  for (const entries of [[{}], [{ github: 'https://github.com/alice' }], [{ github: 'alice--bob' }], [{ name: '' }], [{ github: 'Alice' }, { github: 'alice' }], [{ github: 'alice', avatar: 'wrong' }]]) {
    assert.throws(() => normalizeContributors(entries), /contributors.json 第 \d+ 项/);
  }
});

test('foreword placeholder renders in place, retaining all accounts and safe attributes', async () => {
  const renderer = await createSatteriMarkdownProcessor({ syntaxHighlight: false, hastPlugins: [forewordContributors] });
  const source = '## 贡献者\n\n<!-- CONTRIBUTORS -->\n\n## 感谢\n';
  const result = await renderer.render(source, { fileURL: new URL('../src/content/pages/foreword.md', import.meta.url) });
  assert.equal((result.code.match(/width="48"/g) ?? []).length, contributors.filter(({ github }) => github).length);
  assert(result.code.indexOf('class="contributors"') < result.code.indexOf('>感谢<'));
  for (const { github, name } of contributors) {
    if (github) assert(result.code.includes(`href="https://github.com/${github}"`));
    else assert(result.code.includes(name));
  }
  const other = await renderer.render(source, { fileURL: new URL('../src/content/pages/about.md', import.meta.url) });
  assert(!other.code.includes('class="contributors"'));
});
