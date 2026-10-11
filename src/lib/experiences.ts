import { getCollection, type CollectionEntry } from 'astro:content';
import { gitCollectionTimes } from './git-collection-times';

export type ExperienceEntry = CollectionEntry<'experiences'> & { collectedAt?: Date };

/** Collection time is derived from Git, outside the author's YAML. */
export async function getExperiences(): Promise<ExperienceEntry[]> {
  const entries = await getCollection('experiences');
  const paths = entries.map((entry) => entry.filePath ?? `src/content/experiences/${entry.id}/index.md`);
  const dates = await gitCollectionTimes(paths);
  return entries.map((entry, index) => ({ ...entry, collectedAt: dates.get(paths[index]) }));
}

export function sitePath(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path === '/' ? '/' : path}`;
}

export function experienceSlug(entry: ExperienceEntry) {
  const withoutIndex = entry.id.replace(/\/index$/, '');
  return withoutIndex.split('/').at(-1) ?? withoutIndex;
}

export function experiencePath(entry: ExperienceEntry) {
  return sitePath(`/experiences/${entry.data.applicationYear}/${experienceSlug(entry)}/`);
}

export function sortExperiences(entries: ExperienceEntry[]) {
  return [...entries].sort((a, b) => {
    const yearDiff = b.data.applicationYear - a.data.applicationYear;
    if (yearDiff !== 0) return yearDiff;

    const dateA = a.collectedAt?.valueOf() ?? 0;
    const dateB = b.collectedAt?.valueOf() ?? 0;
    if (dateA !== dateB) return dateB - dateA;

    return experienceSlug(a).localeCompare(experienceSlug(b), 'zh-CN');
  });
}

export function groupByYear(entries: ExperienceEntry[]) {
  return sortExperiences(entries).reduce((groups, entry) => {
    const year = entry.data.applicationYear;
    const group = groups.get(year) ?? [];
    group.push(entry);
    groups.set(year, group);
    return groups;
  }, new Map<number, ExperienceEntry[]>());
}

/** First publication on this site determines the latest collections, independently of application year. */
export function sortByCollectedAt(entries: ExperienceEntry[]) {
  return sortExperiences(entries).sort((a, b) =>
    (b.collectedAt?.valueOf() ?? 0) - (a.collectedAt?.valueOf() ?? 0),
  );
}

