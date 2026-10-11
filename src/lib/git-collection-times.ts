import { execFile } from 'node:child_process';
import { relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
let snapshot: { key: string; dates: Promise<Map<string, Date>> } | undefined;

async function git(args: string[], cwd: string) {
  const { stdout } = await exec('git', args, {
    cwd, encoding: 'utf8', timeout: 10000, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
  });
  return stdout.trim();
}

async function readHistory(root: string, revision: string) {
  // Scan actual additions and renames. --follow also tracks copies, which can wrongly
  // give a new, similar submission another article's original collection date.
  const history = await git([
    'log', '--first-parent', '--reverse', '--format=%x00@%ct%x00',
    '--name-status', '-z', '--find-renames', '--diff-filter=AR', revision,
  ], root);
  const parts = history.split('\0');
  const dates = new Map<string, Date>();
  let date: Date | undefined;
  for (let index = 0; index < parts.length; index++) {
    const token = parts[index].trim();
    const timestamp = /^@(\d+)$/.exec(token);
    if (timestamp) date = new Date(Number(timestamp[1]) * 1000);
    else if (token === 'A' && date) {
      const path = parts[++index];
      if (!dates.has(path)) dates.set(path, date);
    } else if (/^R\d+$/.test(token) && date) {
      const oldPath = parts[++index];
      const newPath = parts[++index];
      dates.set(newPath, dates.get(oldPath) ?? date);
      dates.delete(oldPath);
    }
  }
  return dates;
}

/** Build metadata only: first introduction to main, following renames and merge commits. */
export async function gitCollectionTimes(filePaths: string[], cwd = process.cwd()) {
  let root: string;
  try {
    root = await git(['rev-parse', '--show-toplevel'], cwd);
  } catch (error) {
    const failure = error as { code?: string; stderr?: string };
    if (failure.code === 'ENOENT' || failure.stderr?.includes('not a git repository')) return new Map<string, Date>();
    throw error;
  }

  let revision: string;
  try {
    revision = await git(['rev-parse', '--verify', 'refs/heads/main'], root);
  } catch {
    // CI may check out main at a detached HEAD; a fresh repository has no commits yet.
    try { revision = await git(['rev-parse', '--verify', 'HEAD'], root); }
    catch { return new Map<string, Date>(); }
  }
  if (await git(['rev-parse', '--is-shallow-repository'], root) === 'true') {
    throw new Error('收录时间需要完整 Git 历史：请运行 git fetch --unshallow，CI checkout 使用 fetch-depth: 0。');
  }

  const key = `${root}:${revision}`;
  if (snapshot?.key !== key) snapshot = { key, dates: readHistory(root, revision) };
  const history = await snapshot.dates;
  const dates = filePaths.map((filePath) => {
    const path = relative(root, resolve(cwd, filePath)).split(sep).join('/');
    if (path.startsWith('../')) throw new Error(`文章路径不在 Git 仓库内：${filePath}`);
    return [filePath, history.get(path)] as const;
  });
  return new Map(dates.filter((item): item is readonly [string, Date] => item[1] !== undefined));
}
