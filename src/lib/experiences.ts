import type { CollectionEntry } from 'astro:content';

export type ExperienceEntry = CollectionEntry<'experiences'>;

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

    const dateA = a.data.publishedAt?.valueOf() ?? 0;
    const dateB = b.data.publishedAt?.valueOf() ?? 0;
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
export function sortByPublishedAt(entries: ExperienceEntry[]) {
  return sortExperiences(entries).sort((a, b) =>
    (b.data.publishedAt?.valueOf() ?? 0) - (a.data.publishedAt?.valueOf() ?? 0),
  );
}

