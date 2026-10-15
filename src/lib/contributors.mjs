// @ts-check
import data from '../data/contributors.json' with { type: 'json' };

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

export const contributors = normalizeContributors(data);
export const contributorSearchText = contributors.map(({ name, github }) => `${name} ${github ?? ''}`).join(' ');

/** @param {Contributor[]} list @returns {import('hast').Element} */
export function contributorsElement(list) {
  return {
    type: 'element', tagName: 'div', properties: { className: ['contributors'] },
    children: list.map(({ github, name, initial }) => ({
      type: 'element', tagName: github ? 'a' : 'span',
      properties: github
        ? { href: `https://github.com/${github}`, ariaLabel: name, title: name }
        : { className: ['contributor-avatar'], role: 'img', ariaLabel: name, title: name },
      children: [
        { type: 'element', tagName: 'span', properties: { className: ['contributor-initial'], ariaHidden: 'true' }, children: [{ type: 'text', value: initial }] },
        github
          ? { type: 'element', tagName: 'img', properties: { src: `https://github.com/${github}.png?size=48`, alt: name, width: 48, height: 48, loading: 'lazy', onerror: 'this.remove()' }, children: [] }
          : { type: 'element', tagName: 'span', properties: { className: ['sr-only'] }, children: [{ type: 'text', value: name }] },
      ],
    })),
  };
}

/** Keep the list in Markdown's original position, without hand-maintained HTML. */
/** @type {import('satteri').HastPluginEntry} */
export const forewordContributors = ({ fileURL }) => {
  if (!fileURL?.pathname.endsWith('/src/content/pages/foreword.md')) return null;
  return {
    name: 'foreword-contributors',
    comment(node, ctx) {
      if (node.value.trim() === 'CONTRIBUTORS') ctx.replaceNode(node, contributorsElement(contributors));
    },
    raw(node, ctx) {
      if (node.value.trim() === '<!-- CONTRIBUTORS -->') ctx.replaceNode(node, contributorsElement(contributors));
    },
  };
};
