import assert from 'node:assert/strict';
import test from 'node:test';
import { visibleInstitutions } from '../src/lib/institutions.ts';

test('school preview respects ordered prefix, three schools and fifteen characters', () => {
  assert.deepEqual(visibleInstitutions([]), []);
  assert.deepEqual(visibleInstitutions(['南京大学']), ['南京大学']);
  const short = ['清华大学', '厦门大学', '复旦大学', '东南大学'];
  assert.deepEqual(visibleInstitutions(short), short.slice(0, 3));
  const irokit = ['北京航空航天大学', '北京邮电大学', '华东师范大学', '天津大学', '南京大学', '东南大学', '复旦大学'];
  assert.deepEqual(visibleInstitutions(irokit), irokit.slice(0, 2));
  assert.equal(irokit.length - visibleInstitutions(irokit).length, 5);
  const liwh = ['湖南大学', '南京理工大学', '四川大学', '电子科技大学', '北京理工大学珠海校区', '大连理工大学', '东北大学', '吉林大学', '中南大学', '华南理工大学', '华东师范大学', '南开大学', '山东大学', '天津大学', '重庆大学', '南京航空航天大学'];
  assert.deepEqual(visibleInstitutions(liwh), liwh.slice(0, 3));
  assert.equal(liwh.length - visibleInstitutions(liwh).length, 13);
  const long = '电子科技大学（深圳）高等研究院及其他长名称';
  assert.deepEqual(visibleInstitutions([long, '南京大学']), [long]);
  assert.deepEqual(visibleInstitutions(['123456789012345', '清华大学']), ['123456789012345']);
  assert.deepEqual(short, ['清华大学', '厦门大学', '复旦大学', '东南大学']);
});
