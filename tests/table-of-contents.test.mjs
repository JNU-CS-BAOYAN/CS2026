import assert from 'node:assert/strict';
import test from 'node:test';
import { tableOfContents } from '../src/lib/table-of-contents.ts';

const heading = (depth, slug) => ({ depth, slug, text: slug });

test('TOC includes six levels, preserves ancestors and resets on sibling transitions', () => {
  const input = [1, 2, 3, 4, 5, 6].map((depth) => heading(depth, `h${depth}`));
  input.push(heading(4, 'another-h4'), heading(2, 'another-h2'), heading(1, 'another-h1'));
  const result = tableOfContents(input);
  assert.equal(result.length, 9);
  assert.deepEqual(result[5].parents, ['h1', 'h2', 'h3', 'h4', 'h5']);
  assert.deepEqual(result[6].parents, ['h1', 'h2', 'h3']);
  assert.deepEqual(result[7].parents, ['h1']);
  assert.deepEqual(result[8].parents, []);
  assert(!Object.hasOwn(input[0], 'parents'));
});

test('TOC retains leading H3 and skipped depths without invented headings', () => {
  const result = tableOfContents([heading(3, 'first'), heading(5, 'deep'), heading(2, 'next'), heading(4, 'child')]);
  assert.deepEqual(result.map((item) => item.parents), [[], ['first'], [], ['next']]);
  assert.deepEqual(tableOfContents([]), []);
});
