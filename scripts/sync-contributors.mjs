import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { readContributorSnapshot, refreshContributorSnapshot } from '../src/lib/contributor-sync.mjs';

const cachePath = resolve('.cache/contributors.json');
const { snapshot, results } = await refreshContributorSnapshot(readContributorSnapshot(cachePath), {
  token: process.env.CONTRIBUTORS_TOKEN ?? '',
});
await mkdir(dirname(cachePath), { recursive: true });
await writeFile(`${cachePath}.tmp`, JSON.stringify(snapshot, null, 2) + '\n');
await rename(`${cachePath}.tmp`, cachePath);
for (const { repo, entries, refreshed } of results) {
  console.log(`${repo}：${refreshed ? '已同步' : 'API 暂不可用，沿用已有名单'}，${entries.length} 人。`);
}
