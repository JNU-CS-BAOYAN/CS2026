// @ts-check
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import baseline from '../data/contributors.snapshot.json' with { type: 'json' };
import { normalizeContributors, normalizeSnapshot, repositorySources } from './contributor-data.mjs';

/** @typedef {import('./contributor-data.mjs').ContributorSnapshot} ContributorSnapshot */

/** A committed baseline also supports fresh clones and offline builds. */
export function readContributorSnapshot(cachePath = resolve('.cache/contributors.json'), warn = console.warn) {
  const fallback = normalizeSnapshot(baseline);
  try {
    return normalizeSnapshot(JSON.parse(readFileSync(cachePath, 'utf8')));
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) warn('贡献者缓存无法读取，使用仓库内的备用快照。');
    return fallback;
  }
}

/** Complete every page before replacing a repository's previous list. */
/** @param {string} repo */
export async function fetchRepositoryContributors(repo, { fetchImpl = fetch, token = '', timeoutMs = 12000 } = {}) {
  if (!repositorySources.includes(repo)) throw new Error('未配置的贡献者来源。');
  const signal = AbortSignal.timeout(timeoutMs);
  const accounts = new Map();
  const headers = /** @type {Record<string, string>} */ ({ Accept: 'application/vnd.github+json', 'User-Agent': 'JNU-CS-BAOYAN-contributors' });
  if (token) headers.Authorization = `Bearer ${token}`;
  for (let page = 1; page <= 20; page++) {
    const response = await fetchImpl(`https://api.github.com/repos/${repo}/contributors?per_page=100&page=${page}`, { headers, signal });
    if (response.status === 204 && page === 1) return [];
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('GitHub 未返回贡献者数组。');
    for (const row of rows) {
      if (row.type === 'Bot' || row.type === 'Anonymous' || /\[bot\]$/i.test(row.login ?? '')) continue;
      if (row.type !== 'User' || typeof row.login !== 'string') throw new Error('GitHub 贡献者账号格式错误。');
      const [entry] = normalizeContributors([{ github: row.login }]);
      if (!entry.github) throw new Error('GitHub 贡献者缺少账号。');
      accounts.set(entry.github.toLowerCase(), { github: entry.github });
    }
    if (rows.length < 100) return [...accounts.values()];
  }
  throw new Error('贡献者分页未完整读取。');
}

/** Each repository falls back independently; errors never replace a good list with a partial response. */
/** @param {ContributorSnapshot} previous */
export async function refreshContributorSnapshot(previous, options = {}) {
  const snapshot = normalizeSnapshot(previous);
  const results = await Promise.all(repositorySources.map(async (repo) => {
    try {
      return { repo, entries: await fetchRepositoryContributors(repo, options), refreshed: true };
    } catch (error) {
      // Avoid logging response bodies or request headers, which could contain credentials.
      return { repo, entries: snapshot.repositories[repo], refreshed: false };
    }
  }));
  return {
    snapshot: { version: /** @type {const} */ (1), repositories: Object.fromEntries(results.map(({ repo, entries }) => [repo, entries])) },
    results,
  };
}
