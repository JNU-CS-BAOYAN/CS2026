interface FontSubset {
  filename: string;
  ranges: Array<[number, number]>;
}

/** Read the package's unicode-range metadata; never hardcode subset numbers. */
export function fontSubsets(css: string): FontSubset[] {
  return [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(([, face]) => {
    const filename = /url\(['"]?\.\/files\/([^'"\)]+)['"]?\)/.exec(face)?.[1];
    const unicode = /unicode-range:\s*([^;}]+)/i.exec(face)?.[1];
    if (!filename || !unicode) throw new Error('Missing WenKai font source/unicode-range');
    const ranges = unicode.split(',').map((range): [number, number] => {
      const match = /^\s*U\+([\da-f]+)(?:-([\da-f]+))?\s*$/i.exec(range);
      if (!match) throw new Error(`Unsupported font range: ${range}`);
      const from = parseInt(match[1], 16);
      return [from, parseInt(match[2] ?? match[1], 16)];
    });
    return { filename, ranges };
  });
}

export function subsetsForText(subsets: FontSubset[], text: string): string[] {
  // Latin is served by Atkinson; Emoji should not trigger a Chinese font preload.
  const points = [...new Set([...text].map((char) => char.codePointAt(0)!))]
    .filter((point) => (point >= 0x2e80 && point <= 0x9fff) || (point >= 0x20000 && point <= 0x3134f));
  return subsets.filter(({ ranges }) => points.some((point) => ranges.some(([from, to]) => point >= from && point <= to)))
    .map(({ filename }) => filename);
}
