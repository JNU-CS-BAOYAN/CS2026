export interface SearchRecord {
  kind: 'experience' | 'page';
  section: string;
  title: string;
  author: string;
  year: number | null;
  undergraduateMajor: string;
  institutions: string[];
  institutionKeywords: string;
  text: string;
  path: string;
}

export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, ' ').trim();
}

export function searchRecords(records: SearchRecord[], query: string) {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];
  const terms = normalized.split(' ');
  return records.filter((item) => {
    const searchable = normalizeSearch(`${item.title} ${item.section} ${item.author} ${item.year ?? ''} ${item.undergraduateMajor} ${item.institutionKeywords} ${item.text}`);
    return terms.every((term) => searchable.includes(term));
  }).sort((a, b) => Number(normalizeSearch(b.title).includes(normalized)) - Number(normalizeSearch(a.title).includes(normalized)));
}

export function searchSnippet(text: string, query: string, length = 180) {
  const source = text.replace(/\s+/g, ' ').trim();
  const terms = normalizeSearch(query).split(' ').filter(Boolean);
  const positions = terms.map((term) => source.toLocaleLowerCase().indexOf(term)).filter((index) => index >= 0);
  const start = positions.length ? Math.max(0, Math.min(...positions) - 55) : 0;
  return `${start > 0 ? '…' : ''}${source.slice(start, start + length)}${start + length < source.length ? '…' : ''}`;
}
