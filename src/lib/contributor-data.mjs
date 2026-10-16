// @ts-check

/** @typedef {{ github?: string, name: string, initial: string }} Contributor */

/** @param {unknown} input @returns {Contributor[]} */
export function normalizeContributors(input) {
  if (!Array.isArray(input)) throw new Error('contributors.json 必须是数组。');
  const accounts = new Set();
  return input.map((entry, index) => {
    const fail = (/** @type {string} */ message) => { throw new Error(`contributors.json 第 ${index + 1} 项：${message}`); };
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail('必须填写 github 或 name 对象。');
    if (Object.keys(entry).some((key) => !['github', 'name'].includes(key))) fail('仅支持 github 和 name 字段。');
    for (const key of ['github', 'name']) {
      if (Object.hasOwn(entry, key) && (typeof entry[key] !== 'string' || !entry[key].trim())) fail(`${key} 必须是非空文字；不用时删除该字段。`);
    }
    const github = entry.github?.trim();
    if (github) {
      if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(github) || github.includes('--')) fail('github 只填用户名，不填 URL；使用英文字母、数字和单连字符。');
      const key = github.toLowerCase();
      if (accounts.has(key)) fail(`GitHub 账号 ${github} 重复（忽略大小写）。`);
      accounts.add(key);
    }
    const name = entry.name?.trim() ?? github;
    if (!name) fail('没有 GitHub 账号时必须填写 name。');
    return { github, name, initial: [...name][0].toLocaleUpperCase() };
  });
}

/** Manual order and aliases take priority; automatic additions have stable account order. */
/** @param {unknown} manual @param {ContributorSnapshot} snapshot */
export function mergeContributors(manual, snapshot) {
  const result = normalizeContributors(manual);
  const known = new Set(result.flatMap((entry) => entry.github ? [entry.github.toLowerCase()] : []));
  const automatic = repositorySources.flatMap((repo) => snapshot.repositories[repo]);
  for (const entry of [...automatic].sort((a, b) => a.github.localeCompare(b.github, 'en', { sensitivity: 'base' }))) {
    if (!known.has(entry.github.toLowerCase())) {
      result.push(...normalizeContributors([entry]));
      known.add(entry.github.toLowerCase());
    }
  }
  return result;
}

export const repositorySources = ['JNU-CS-BAOYAN/CS2026', 'kleinblue4/JNU-CS-BAOYAN'];
/** @typedef {{ version: 1, repositories: Record<string, {github: string}[]> }} ContributorSnapshot */

/** Reject broken snapshots instead of erasing the fallback list. */
/** @param {unknown} input @returns {ContributorSnapshot} */
export function normalizeSnapshot(input) {
  if (!input || typeof input !== 'object' || !('version' in input) || input.version !== 1 ||
      !('repositories' in input) || !input.repositories || typeof input.repositories !== 'object') {
    throw new Error('贡献者快照格式错误。');
  }
  const raw = /** @type {Record<string, unknown>} */ (input.repositories);
  const repositories = Object.fromEntries(repositorySources.map((repo) => {
    const list = normalizeContributors(raw[repo]);
    return [repo, list.map(({ github }) => {
      if (!github) throw new Error(`${repo} 快照缺少 GitHub 用户名。`);
      return { github };
    })];
  }));
  return { version: 1, repositories };
}
