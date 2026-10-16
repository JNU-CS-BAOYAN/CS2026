// @ts-check
import data from '../data/contributors.json' with { type: 'json' };

import { mergeContributors } from './contributor-data.mjs';
import { readContributorSnapshot } from './contributor-sync.mjs';
export { normalizeContributors } from './contributor-data.mjs';

/** @typedef {import('./contributor-data.mjs').Contributor} Contributor */

export const contributors = mergeContributors(data, readContributorSnapshot());
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
