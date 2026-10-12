import assert from 'node:assert/strict';
import test from 'node:test';
import { fontSubsets, subsetsForText } from '../src/lib/font-ranges.ts';

test('title preloads select the relevant CJK ranges, including supplementary characters, once', () => {
  const css = `@font-face { src: url('./files/a.woff2'); unicode-range: U+4e00-4e03; }
    @font-face { src: url('./files/b.woff2'); unicode-range: U+613f, U+20000-20001; }
    @font-face { src: url('./files/c.woff2'); unicode-range: U+1f300-1f399; }`;
  const subsets = fontSubsets(css);
  assert.deepEqual(subsetsForText(subsets, '愿愿一𠀀🌸ABC'), ['a.woff2', 'b.woff2']);
  assert.deepEqual(subsetsForText(subsets, 'ABC123🌸'), []);
  assert.deepEqual(subsetsForText(subsets, ''), []);
});
