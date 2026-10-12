export interface TocHeading {
  depth: number;
  slug: string;
  text: string;
}

export interface TocItem extends TocHeading {
  parents: string[];
}

/** Include all levels in document order, even before H2 or with skipped depths. */
export function tableOfContents(headings: TocHeading[]): TocItem[] {
  const stack: TocHeading[] = [];
  return headings.filter((heading) => heading.depth >= 1 && heading.depth <= 6).map((heading) => {
    while (stack.length && stack.at(-1)!.depth >= heading.depth) stack.pop();
    const item = { ...heading, parents: stack.map((parent) => parent.slug) };
    stack.push(heading);
    return item;
  });
}
