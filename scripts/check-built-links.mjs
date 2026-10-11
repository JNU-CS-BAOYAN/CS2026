import { readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ELEMENT_NODE, parse, walkSync } from 'ultrahtml';
import { unescape } from 'html-escaper';
import { filesUnder } from './check-content.mjs';

export async function checkBuiltLinks({ dist, site, base = '/' }) {
  const errors = [];
  const prefix = base === '/' ? '' : `/${base.replace(/^\/+|\/+$/g, '')}`;
  const origin = new URL(site).origin;
  const files = (await filesUnder(dist)).filter((file) => file.endsWith('.html'));
  if (!files.length) return { errors: ['未找到 HTML 构建产物，请先运行 npm run build。'], pages: 0 };
  const pages = new Map();
  const localPath = (url) => {
    const path = decodeURIComponent(url.pathname);
    if (prefix && path !== prefix && !path.startsWith(`${prefix}/`)) throw new Error(`站内链接缺少站点前缀 ${prefix}`);
    return path.slice(prefix.length).replace(/^\/+/, '');
  };
  for (const file of files) {
    const path = relative(dist, file).replaceAll('\\', '/');
    const route = path.endsWith('index.html') ? path.slice(0, -10) : path;
    const refs = [];
    const ids = new Set();
    const document = parse(await readFile(file, 'utf8'));
    walkSync(document, (node) => {
      if (node.type !== ELEMENT_NODE) return;
      const attrs = node.attributes;
      if (attrs.id) {
        const id = unescape(attrs.id);
        if (ids.has(id)) errors.push(`${path}: 重复的 id #${id}`);
        ids.add(id);
      }
      const keys = {
        a: ['href'], img: ['src', 'srcset'], source: ['src', 'srcset'],
        script: ['src'], link: ['href'], form: ['action'],
        video: ['src', 'poster'], audio: ['src'], iframe: ['src'],
      }[node.name.toLowerCase()] ?? [];
      for (const key of keys) {
        if (!attrs[key]) continue;
        const value = unescape(attrs[key]);
        if (key === 'srcset' && !value.startsWith('data:')) {
          refs.push(...value.split(',').map((item) => item.trim().split(/\s+/)[0]));
        } else refs.push(value);
      }
    });
    pages.set(file, { ids, refs, path, url: new URL(`${prefix}/${route}`, origin) });
  }
  for (const page of pages.values()) {
    for (const ref of new Set(page.refs)) {
      if (!ref || /^[a-z][\w+.-]*:/i.test(ref) && !/^https?:/i.test(ref)) continue;
      try {
        const url = new URL(ref, page.url);
        if (url.origin !== origin) continue;
        const path = localPath(url);
        let target = resolve(dist, path);
        if (relative(dist, target).startsWith('..')) throw new Error('路径超出构建目录');
        const info = await stat(target).catch(() => null);
        if (info?.isDirectory()) target = join(target, 'index.html');
        if (!await stat(target).then((s) => s.isFile(), () => false)) throw new Error('目标页面或资源不存在');
        if (url.hash && url.hash !== '#' && pages.has(target)) {
          const id = decodeURIComponent(url.hash.slice(1));
          if (!pages.get(target).ids.has(id)) throw new Error(`目标锚点 #${id} 不存在`);
        }
      } catch (error) { errors.push(`${page.path}: ${ref} → ${error.message}`); }
    }
  }
  return { errors, pages: files.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { default: config } = await import('../astro.config.mjs');
  const result = await checkBuiltLinks({ dist: resolve('dist'), site: config.site, base: config.base });
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`构建链接检查通过：${result.pages} 个 HTML 页面。`);
}
