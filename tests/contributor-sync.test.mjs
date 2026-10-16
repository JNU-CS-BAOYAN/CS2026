import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeContributors, normalizeSnapshot, repositorySources } from '../src/lib/contributor-data.mjs';
import { fetchRepositoryContributors, readContributorSnapshot, refreshContributorSnapshot } from '../src/lib/contributor-sync.mjs';

const [current, original] = repositorySources;
const snapshot = () => ({ version: 1, repositories: {
  [current]: [{ github: 'OldCurrent' }], [original]: [{ github: 'OldOriginal' }],
} });
const user = (login) => ({ type: 'User', login });

test('manual order, account casing and aliases win across both repositories', () => {
  const result = mergeContributors([{ name: '手动昵称', github: 'Alice' }, { name: '邮箱投稿者' }], {
    version: 1, repositories: {
      [current]: [{ github: 'alice' }, { github: 'Zulu' }, { github: 'Bob' }],
      [original]: [{ github: 'BOB' }, { github: 'Charlie' }],
    },
  });
  assert.deepEqual(result.map(({ name }) => name), ['手动昵称', '邮箱投稿者', 'Bob', 'Charlie', 'Zulu']);
  assert.equal(result[0].github, 'Alice');
});

test('API consumes all pages, ignores bots and preserves only GitHub usernames', async () => {
  const calls = [];
  const result = await fetchRepositoryContributors(current, { token: 'test-only', fetchImpl: async (url, options) => {
    calls.push(url);
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    assert(options.signal instanceof AbortSignal);
    return Response.json(calls.length === 1 ? Array.from({ length: 100 }, (_, i) => user(`user-${i}`)) :
      [user('NewUser'), user('USER-1'), { type: 'Bot', login: 'robot[bot]' }, { type: 'Anonymous' }]);
  } });
  assert.equal(calls.length, 2);
  assert.match(calls[1], /page=2$/);
  assert.equal(result.length, 101);
  assert(result.some(({ github }) => github === 'NewUser'));
  assert(result.every((row) => Object.keys(row).join() === 'github'));
});

test('one failed repository retains its own previous list while the other updates', async () => {
  const previous = snapshot();
  const result = await refreshContributorSnapshot(previous, { fetchImpl: async (url) =>
    url.includes(current) ? Response.json([user('NewCurrent')]) : new Response('', { status: 403 }),
  });
  assert.deepEqual(result.snapshot.repositories[current], [{ github: 'NewCurrent' }]);
  assert.deepEqual(result.snapshot.repositories[original], [{ github: 'OldOriginal' }]);
  assert.deepEqual(previous, snapshot());
  assert.deepEqual(result.results.map(({ refreshed }) => refreshed), [true, false]);
});

test('failed second page never replaces a complete cached repository with partial data', async () => {
  const { snapshot: result, results } = await refreshContributorSnapshot(snapshot(), { fetchImpl: async (url) => {
    if (url.endsWith('page=1')) return Response.json(Array.from({ length: 100 }, (_, i) => user(`new-${i}`)));
    throw new Error('network unavailable');
  } });
  assert.deepEqual(result, snapshot());
  assert(results.every(({ refreshed }) => !refreshed));
});

test('bad JSON, invalid accounts and timeout use fallback, while empty repositories can refresh', async () => {
  for (const fetchImpl of [
    async () => Response.json({ message: 'bad response' }),
    async () => new Response('not json'),
    async () => Response.json([user('https://github.com/wrong')]),
    async () => { throw new DOMException('Timed out', 'TimeoutError'); },
  ]) {
    const result = await refreshContributorSnapshot(snapshot(), { fetchImpl });
    assert.deepEqual(result.snapshot, snapshot());
    assert(result.results.every(({ refreshed }) => !refreshed));
  }
  assert.deepEqual(await fetchRepositoryContributors(current, { fetchImpl: async () => new Response(null, { status: 204 }) }), []);
});

test('missing or corrupt runtime cache falls back to committed snapshot; valid cache is reused', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'baoyan-contributors-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'cache.json');
  const warnings = [];
  const baseline = readContributorSnapshot(path, (text) => warnings.push(text));
  assert.deepEqual(warnings, []);
  await writeFile(path, '{invalid');
  assert.deepEqual(readContributorSnapshot(path, (text) => warnings.push(text)), baseline);
  assert.equal(warnings.length, 1);
  await writeFile(path, JSON.stringify(snapshot()));
  assert.deepEqual(readContributorSnapshot(path), snapshot());
  assert.throws(() => normalizeSnapshot({ version: 1, repositories: { [current]: [] } }));
});
