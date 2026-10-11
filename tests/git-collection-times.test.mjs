import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { gitCollectionTimes } from '../src/lib/git-collection-times.ts';

const exec = promisify(execFile);
async function git(cwd, args, date = '2026-01-01T12:00:00+08:00') {
  const { stdout } = await exec('git', args, {
    cwd, encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
  });
  return stdout.trim();
}
async function repository(t) {
  const root = await mkdtemp(join(tmpdir(), 'baoyan-git-time-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-b', 'main']);
  await git(root, ['config', 'user.name', 'Test']);
  await git(root, ['config', 'user.email', 'test@example.invalid']);
  return root;
}
async function article(root, path, suffix = '') {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), '## 经历\n\n' + '这是一篇用于测试收录时间的完整文章。\n'.repeat(20) + suffix);
}

test('first main introduction survives edits, PR merges, renames and detached checkouts', async (t) => {
  const root = await repository(t);
  const first = 'src/content/experiences/2026/first author/index.md';
  const second = 'src/content/experiences/2025/second/index.md';
  await article(root, first);
  assert.equal((await gitCollectionTimes([first], root)).size, 0);
  await git(root, ['add', '.']);
  await git(root, ['commit', '-m', 'first article']);
  const initial = new Date('2026-01-01T12:00:00+08:00').valueOf();
  assert.equal((await gitCollectionTimes([first], root)).get(first).valueOf(), initial);

  await article(root, first, '\n普通修订。\n');
  await git(root, ['add', '.']);
  await git(root, ['commit', '-m', 'revise article'], '2026-01-03T12:00:00+08:00');
  assert.equal((await gitCollectionTimes([first], root)).get(first).valueOf(), initial);

  await git(root, ['checkout', '-b', 'submission']);
  await article(root, second);
  await git(root, ['add', '.']);
  await git(root, ['commit', '-m', 'write on contributor branch'], '2026-01-04T12:00:00+08:00');
  assert.equal((await gitCollectionTimes([second], root)).size, 0);
  await git(root, ['checkout', 'main']);
  await git(root, ['merge', '--no-ff', 'submission', '-m', 'publish PR'], '2026-01-05T12:00:00+08:00');
  const merged = new Date('2026-01-05T12:00:00+08:00').valueOf();
  assert.equal((await gitCollectionTimes([second], root)).get(second).valueOf(), merged);

  const renamed = 'src/content/experiences/2026/renamed/index.md';
  await mkdir(dirname(join(root, renamed)), { recursive: true });
  await git(root, ['mv', first, renamed]);
  await git(root, ['commit', '-m', 'rename article folder'], '2026-01-06T12:00:00+08:00');
  assert.equal((await gitCollectionTimes([renamed], root)).get(renamed).valueOf(), initial);
  await git(root, ['checkout', '--detach']);
  await git(root, ['branch', '-D', 'main']);
  assert.equal((await gitCollectionTimes([renamed, second], root)).get(second).valueOf(), merged);
});

test('shallow history is rejected instead of assigning the checkout date', async (t) => {
  const root = await repository(t);
  const path = 'src/content/experiences/2026/first/index.md';
  await article(root, path);
  await git(root, ['add', '.']);
  await git(root, ['commit', '-m', 'first article']);
  await article(root, path, '\n后续修改。\n');
  await git(root, ['add', '.']);
  await git(root, ['commit', '-m', 'later edit'], '2026-01-07T12:00:00+08:00');
  const shallow = join(root, 'shallow-clone');
  await git(root, ['clone', '--depth=1', pathToFileURL(root).href, shallow]);
  await assert.rejects(gitCollectionTimes([path], shallow), /完整 Git 历史/);
});

test('a downloaded folder without Git metadata can still be previewed', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'baoyan-no-history-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal((await gitCollectionTimes(['index.md'], root)).size, 0);
});
