import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseDocument } from 'yaml';

// Fixed migration exceptions. A new submission to 2025 still follows the new rule.
const legacyArticles = new Set([
  'ccandtt-yt', 'eternity-yt', 'feather1023-yt', 'haatohaaton-yt',
  'irokit-yt', 'kikinvb-yt', 'klein-sc', 'klein-yt', 'le-yt',
  'leo-sc', 'leo-yt', 'liwh-yt', 'lomig-sc', 'lomig-yt', 'lulu-sc',
  'lulu-yt', 'mkk-sc', 'pingpig-sc', 'pingpig-yt', 'pinrinko-yt',
  'vegetable-yt', 'xxy-sc', 'xxy-yt', 'yuzi-yt',
].map((id) => `2025/${id}/index.md`));
const fields = new Set([
  'title', 'author', 'applicationYear', 'undergraduateMajor',
  'institutions', 'cover', 'sourceUrl', 'finalDestination',
]);

export async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
}

export async function checkContent(root = process.cwd()) {
  const errors = [];
  const content = join(root, 'src/content/experiences');
  const allFiles = await filesUnder(content);
  const files = allFiles.filter((file) => /\.md$/i.test(file));
  const folders = new Set(allFiles.map((file) => relative(content, file).split(sep)).filter((parts) => parts.length >= 3).map((parts) => parts.slice(0, 2).join('/')));
  for (const folder of folders) {
    if (!allFiles.includes(join(content, folder, 'index.md'))) errors.push(`src/content/experiences/${folder}: 缺少 index.md；文件名必须完全小写，不能只提交图片或附件。`);
  }
  const routes = new Map();
  let articles = 0;
  for (const file of files) {
    const path = relative(content, file).split(sep).join('/');
    const parts = path.split('/');
    if (parts.length <= 2 && parts.at(-1) === 'README.md') continue;
    // Article attachments can themselves be Markdown; they aren't submissions.
    if (parts.slice(2).some((part) => part === 'asset' || part === 'assets')) continue;
    const report = (message) => errors.push(`src/content/experiences/${path}: ${message}`);
    if (!/^\d{4}\/[^/]+\/index\.md$/.test(path)) {
      report('文章必须位于 <年份>/<author>/index.md；说明附件请放入 asset/ 或 assets/。');
      continue;
    }
    articles++;
    const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(await readFile(file, 'utf8'));
    if (!match) { report('缺少 YAML 文件头。'); continue; }
    const doc = parseDocument(match[1]);
    if (doc.errors.length) {
      report(`YAML 无效：${doc.errors.map((error) => error.message).join('; ')}`);
      continue;
    }
    const data = doc.toJS({ maxAliasCount: 100 });
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      report('YAML 文件头必须是字段对象。'); continue;
    }
    for (const key of Object.keys(data)) if (!fields.has(key)) report(`未知字段 ${key}，请使用投稿模板中的八个字段。`);
    for (const key of ['title', 'author']) {
      if (typeof data[key] !== 'string' || !data[key].trim()) report(`${key} 必须是非空文字。`);
    }
    if (!Number.isInteger(data.applicationYear) || data.applicationYear < 2000 || data.applicationYear > 2100) report('applicationYear 必须是 2000–2100 的整数。');
    if (String(data.applicationYear) !== parts[0]) report('applicationYear 与年份目录不一致。');
    if (!legacyArticles.has(path)) {
      if (typeof data.author !== 'string' || !/^[a-z0-9-]+$/.test(data.author)) report('author 只允许小写英文字母、数字和连字符。');
      if (data.author !== parts[1]) report('目录名必须与 author 完全相同。');
    }
    for (const key of ['undergraduateMajor', 'finalDestination', 'sourceUrl', 'cover']) {
      if (Object.hasOwn(data, key) && (typeof data[key] !== 'string' || !data[key].trim())) report(`${key} 已填写时必须是非空文字；不使用请删除该字段。`);
    }
    if (Object.hasOwn(data, 'institutions') && (!Array.isArray(data.institutions) || data.institutions.some((name) => typeof name !== 'string' || !name.trim()))) report('institutions 必须是院校全称的文字数组，可为空数组。');
    if (typeof data.sourceUrl === 'string') {
      try {
        const url = new URL(data.sourceUrl);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch { report('sourceUrl 必须是完整的 HTTP/HTTPS URL。'); }
    }
    if (typeof data.cover === 'string' && data.cover.trim()) {
      const target = resolve(dirname(file), data.cover);
      if (/^(?:[a-z]+:|\/)/i.test(data.cover) || relative(root, target).startsWith(`..${sep}`)) report('cover 必须是仓库内的相对图片路径。');
      else if (!/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(target) || !await stat(target).then((s) => s.isFile(), () => false)) report(`封面图片不存在或格式不支持：${data.cover}`);
    }
    const route = `/experiences/${data.applicationYear}/${parts[1].toLowerCase()}/`;
    if (routes.has(route)) report(`文章路由冲突：${routes.get(route)}。`);
    routes.set(route, path);
    const redirect = join(root, 'public/experiences', parts[0], parts[1], 'index.html');
    if (await stat(redirect).then((s) => s.isFile(), () => false)) report('文章地址与 public 中的旧地址跳转页冲突。');
  }
  return { errors, articles };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { errors, articles } = await checkContent();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`内容检查通过：${articles} 篇文章。`);
}
