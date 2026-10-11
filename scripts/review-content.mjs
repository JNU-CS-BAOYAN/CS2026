import { execFile } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { unescape } from 'html-escaper';
import { ELEMENT_NODE, parse, walkSync } from 'ultrahtml';
import { parseDocument } from 'yaml';
import { filesUnder } from './check-content.mjs';
import { legacyArticleLinks } from '../src/lib/legacy-article-links.mjs';

const exec = promisify(execFile);
const labels = {
  email: '邮箱', phone: '疑似手机号', qq: 'QQ/群号', wechat: '微信标识',
  ok: '可访问', unavailable: '失效候选', restricted: '访问受限',
  server: '服务器错误', timeout: '超时', network: '网络错误',
  other: '其他响应', skipped: '未请求', unchecked: '未请求', invalid: 'URL 格式错误',
};

/** Hide comments and code examples while preserving source line numbers. */
export function reviewableText(source) {
  let text = source.replace(/<!--[^]*?-->/g, (value) => value.replace(/[^\r\n]/g, ' '));
  let fence;
  text = text.split('\n').map((line) => {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      return '';
    }
    if (marker) { fence = marker[1]; return ''; }
    return line;
  }).join('\n');
  return text;
}

export function contactHints(source, file) {
  const findings = [];
  const text = reviewableText(source);
  text.split(/\r?\n/).forEach((line, index) => {
    const kinds = new Set();
    // Remove email addresses before inspecting numbers, so digits in an email
    // cannot be reported as a separate phone/QQ number.
    let rest = line.replace(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[a-z]{2,}/gi, () => { kinds.add('email'); return ' '; });
    rest = rest.replace(/https?:\/\/[^\s<>]+/gi, ' ');
    rest = rest.replace(/(?:\bQQ|[Qq]{1,2}群|扣扣)(?:号码?|群)?\s*[:：=]?\s*\d{5,12}(?!\d)/gi, () => { kinds.add('qq'); return ' '; });
    if (/(?<!\d)1[3-9]\d{9}(?!\d)/.test(rest)) kinds.add('phone');
    if (/(?:微信(?:号)?|wechat|weixin|\bvx)\s*[:：=]\s*[a-z\d_-]{5,20}(?![a-z\d_-])/i.test(rest)) kinds.add('wechat');
    for (const kind of kinds) findings.push({ file, line: index + 1, kind });
  });
  return findings;
}

async function contentFiles(root) {
  const experiences = (await filesUnder(join(root, 'src/content/experiences'))).filter((file) => /\/\d{4}\/[^/]+\/index\.md$/.test(file));
  const pages = (await filesUnder(join(root, 'src/content/pages'))).filter((file) => file.endsWith('.md'));
  return [...experiences, ...pages].sort();
}

export async function contactReport(root, base) {
  let changed;
  if (base) {
    const { stdout } = await exec('git', ['diff', '--name-only', '-z', `${base}...HEAD`, '--', 'src/content'], { cwd: root });
    changed = new Set(stdout.split('\0'));
  }
  const findings = [];
  let files = 0;
  for (const file of await contentFiles(root)) {
    const path = relative(root, file).split(sep).join('/');
    if (changed && !changed.has(path)) continue;
    files++;
    findings.push(...contactHints(await readFile(file, 'utf8'), path));
  }
  return { scope: base ? 'PR 改动的经验文章及说明页' : '全部经验文章及说明页', files, findings };
}

export async function externalLinks(root) {
  const renderer = await createSatteriMarkdownProcessor({ syntaxHighlight: false, hastPlugins: [legacyArticleLinks] });
  const links = new Map();
  for (const file of await contentFiles(root)) {
    const source = await readFile(file, 'utf8');
    const frontmatter = /^(?:\uFEFF)?---\r?\n([^]*?)\r?\n---(?:\r?\n|$)/.exec(source);
    const body = frontmatter ? source.slice(frontmatter[0].length) : source;
    const { code } = await renderer.render(body, { fileURL: pathToFileURL(file) });
    const urls = new Set();
    walkSync(parse(code), (node) => {
      if (node.type === ELEMENT_NODE && node.name === 'a' && node.attributes.href) urls.add(unescape(node.attributes.href));
    });
    if (frontmatter) {
      const doc = parseDocument(frontmatter[1]);
      if (!doc.errors.length) {
        const metadata = doc.toJS();
        if (typeof metadata?.sourceUrl === 'string') urls.add(metadata.sourceUrl);
      }
    }
    for (const value of urls) {
      if (!/^https?:\/\//i.test(value)) continue;
      let normalized;
      try {
        const url = new URL(value);
        url.hash = '';
        normalized = url.href;
      } catch { normalized = value; }
      const path = relative(root, file).split(sep).join('/');
      let decoded = value;
      try { decoded = decodeURI(value); } catch {}
      const lineIndex = source.split(/\r?\n/).findIndex((line) => unescape(line).includes(value) || unescape(line).includes(decoded));
      const location = { file: path, line: lineIndex >= 0 ? lineIndex + 1 : null };
      const record = links.get(normalized) ?? { url: normalized, sources: [] };
      record.sources.push(location);
      links.set(normalized, record);
    }
  }
  return [...links.values()].sort((a, b) => a.url.localeCompare(b.url));
}

export function classifyStatus(status) {
  if (status >= 200 && status < 300) return 'ok';
  if ([404, 410].includes(status)) return 'unavailable';
  if ([401, 403, 429].includes(status)) return 'restricted';
  if (status >= 500) return 'server';
  return 'other';
}

export async function requestLink(url, { request = fetch, timeoutMs = 8000 } = {}) {
  let destination;
  try { destination = new URL(url); }
  catch { return { kind: 'invalid', status: null, finalUrl: null }; }
  if (destination.username || destination.password || !['http:', 'https:'].includes(destination.protocol)
    || /^(?:localhost|127\.|0\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|\[::1\])/i.test(destination.hostname)
    || /\.(?:local|internal)$/i.test(destination.hostname)) return { kind: 'skipped', status: null, finalUrl: null };
  try {
    // GET rather than HEAD: many valid academic sites reject HEAD requests.
    const response = await request(url, {
      method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'JNU-CS-BAOYAN-Link-Review/1.0', Range: 'bytes=0-4095' },
    });
    await response.body?.cancel();
    return { kind: classifyStatus(response.status), status: response.status, finalUrl: response.url || url };
  } catch (error) {
    return { kind: ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'network', status: null, finalUrl: null };
  }
}

export async function inspectLinks(links, options = {}) {
  const results = new Array(links.length);
  let next = 0;
  async function worker() {
    while (next < links.length) {
      const index = next++;
      results[index] = { ...links[index], ...await requestLink(links[index].url, options) };
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, links.length) }, worker));
  return results;
}

const cell = (value) => String(value ?? '—').replace(/[|\r\n]/g, ' ').replace(/[<>`]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '`': '&#96;' })[ch]);
export function formatContactReport(report) {
  let text = `# 联系方式审查提示\n\n范围：${report.scope}；扫描 ${report.files} 份 Markdown，发现 ${report.findings.length} 条提示。\n\n只提供类型和源文件行号，不复制具体号码/地址，不自动改稿，不因命中阻止合并或部署。历史原有公开联系方式按交接记录保留，新增或改动信息由维护者核对；没有命中不代表已完成隐私审核。HTML 注释和 fenced code 示例不检查。\n\n`;
  if (report.findings.length) {
    text += '| 文件 | 行号 | 疑似类型 |\n| --- | --- | --- |\n';
    for (const row of report.findings) text += `| ${cell(row.file)} | ${row.line} | ${labels[row.kind]} |\n`;
  } else text += '本次未发现符合规则的联系方式条目。\n';
  return text;
}

export function formatLinkReport(results) {
  const counts = {};
  for (const row of results) counts[row.kind] = (counts[row.kind] ?? 0) + 1;
  let text = `# 外链可达性检查\n\n检查时间：${new Date().toISOString()}；去重后 ${results.length} 个 URL。\n\n${Object.entries(counts).map(([kind, count]) => `${labels[kind]} ${count}`).join('，')}。\n\n404/410 是失效候选，403/429 等是访问受限，网络错误或超时不能直接判失效。HTTP 成功只说明请求可达，不证明内容、院校、年份或授权正确；跳转到登录页或首页仍需人工核对。本报告不会改正文、替换链接、发送 Issue 或阻塞部署。只检查 Markdown 中实际渲染的 HTTP/HTTPS 链接及 sourceUrl，不检查图片和下载附件，也不扫描脚本动态生成的链接。\n\n| 状态 | HTTP | URL | 最终地址 | 来源文件:行号 |\n| --- | --- | --- | --- | --- |\n`;
  const order = { unavailable: 0, invalid: 0, restricted: 1, timeout: 2, network: 3, server: 4, other: 5, skipped: 6, unchecked: 6, ok: 7 };
  for (const row of [...results].sort((a, b) => order[a.kind] - order[b.kind])) {
    const sources = row.sources.map((item) => `${item.file}:${item.line ?? '渲染后链接'}`).join('；');
    text += `| ${labels[row.kind]} | ${row.status ?? '—'} | ${cell(row.url)} | ${cell(row.finalUrl && row.finalUrl !== row.url ? row.finalUrl : '—')} | ${cell(sources)} |\n`;
  }
  return text;
}

async function run() {
  const mode = process.argv[2];
  if (!['contacts', 'links'].includes(mode)) throw new Error('使用 node scripts/review-content.mjs contacts|links [--base=origin/main] [--collect-only]');
  const root = process.cwd();
  const output = join(root, 'reports');
  await mkdir(output, { recursive: true });
  let report, text;
  if (mode === 'contacts') {
    const base = process.argv.find((arg) => arg.startsWith('--base='))?.slice(7);
    report = await contactReport(root, base);
    text = formatContactReport(report);
  } else {
    const links = await externalLinks(root);
    report = process.argv.includes('--collect-only') ? links.map((row) => ({ ...row, kind: 'unchecked', status: null, finalUrl: null })) : await inspectLinks(links);
    text = formatLinkReport(report);
  }
  await writeFile(join(output, `${mode}.json`), JSON.stringify(report, null, 2) + '\n');
  await writeFile(join(output, `${mode}.md`), text);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, text);
  console.log(`已生成 reports/${mode}.md 和 .json；仅报告，不修改正文。`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await run();
