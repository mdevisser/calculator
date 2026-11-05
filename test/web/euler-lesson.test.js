import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../../web/lessons/euler-check.js');
const { checkPowerSum } = globalThis;

test('checkPowerSum confirms Lander–Parkin exactly', () => {
  const r = checkPowerSum('5', ['27', '84', '110', '133'], '144');
  assert.deepEqual([r.ok, r.equal, r.lhs, r.rhs], [true, true, 61917364224n, 61917364224n]);
});

test('a perturbed term breaks it', () => {
  assert.equal(checkPowerSum('5', ['28', '84', '110', '133'], '144').equal, false);
});

test('Elkies holds exactly at 23 digits, where doubles cannot tell x+1 from x', () => {
  assert.equal(checkPowerSum('4', ['95800', '217519', '414560'], '422481').equal, true);
  assert.equal(checkPowerSum('4', ['95801', '217519', '414560'], '422481').equal, false);
  assert.equal(422481 ** 4 + 1 === 422481 ** 4, true); // why the page exists
});

for (const [k, terms, rhs] of [
  ['5', [''], '144'], ['5', ['27.5'], '144'], ['5', ['-3'], '144'], ['5', ['1e3'], '144'],
  ['5', ['027'], '144'], ['1', ['3'], '3'], ['0', ['3'], '1'], ['21', ['3'], '3'],
  ['5', ['9'.repeat(41)], '144'], ['5', [], '144'], ['five', ['27'], '144'],
]) {
  test(`rejects ${JSON.stringify([k, terms, rhs])} with a message, never a pass`, () => {
    const r = checkPowerSum(k, terms, rhs);
    assert.equal(r.ok, false);
    assert.equal(typeof r.message, 'string');
  });
}

test('accepts surrounding spaces', () => {
  assert.equal(checkPowerSum(' 5 ', [' 27', '84 ', '110', '133'], ' 144').equal, true);
});

test('page: eight sections in order, key idea pending, scripts in order, no fetch', async () => {
  const html = await readFile(new URL('../../web/lessons/euler.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/<section id="([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['trust', 'question', 'found', 'check', 'key-idea', 'why', 'open', 'sources']);
  assert.match(html, /<section id="key-idea"[^>]*data-pending="session"/);
  assert.match(html, /We'll work this out together in a session\./);
  assert.match(html, /\.\.\/results\.js[\s\S]*\.\.\/lessons\.js[\s\S]*\.\.\/lesson-model\.js[\s\S]*\.\.\/lesson-header\.js/);
  assert.doesNotMatch(html, /fetch\(|type="module"/);
  assert.match(html, /renderLessonHeader\('euler'\)/);
});
