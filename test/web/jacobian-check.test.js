import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parsePolynomial, evaluate } from '../../src/problems/jacobian/polynomial.js';
import { parseRational, toString } from '../../src/exact/rational.js';

await import('../../web/lessons/jacobian-check.js');
const { MAP, POINTS, parseNumber, imageOf } = globalThis.jacobianCheck;
const fixture = JSON.parse(
  await readFile(new URL('../../fixtures/jacobian/alpoge-2026.json', import.meta.url), 'utf8'),
);
const pretty = (s) => s.replace('-', '−');

test('the page uses exactly the fixture map and points', () => {
  assert.deepEqual(MAP, fixture.data.map);
  assert.deepEqual(POINTS.map((p) => p.name), ['A', 'B', 'C']);
  assert.deepEqual(POINTS.map((p) => p.point), fixture.data.points);
});

for (const { name, point } of [
  { name: 'A', point: ['0', '0', '-1/4'] },
  { name: 'B', point: ['1', '-3/2', '13/2'] },
  { name: 'C', point: ['-1', '3/2', '13/2'] },
]) {
  test(`point ${name} lands on (−1/4, 0, 0) with stretch factor −2`, () => {
    const r = imageOf(point);
    assert.equal(r.ok, true);
    assert.deepEqual(r.image, ['−1/4', '0', '0']);
    assert.equal(r.stretch, '−2');
  });
}

for (const point of [['2', '3', '5'], ['1/2', '-1/3', '7'], ['0', '0', '0'], ['-4/5', '9', '1/7']]) {
  test(`(${point.join(', ')}) agrees with the verifier, stretch −2`, () => {
    const r = imageOf(point);
    const exact = point.map((v, i) => parseRational(v, `p${i}`));
    const expected = fixture.data.map.map((t) =>
      pretty(toString(evaluate(parsePolynomial(t, ['x', 'y', 'z']), exact))));
    assert.deepEqual(r.image, expected);
    assert.equal(r.stretch, '−2');
  });
}

const value = (text) => {
  const r = parseNumber(text, 'x');
  assert.ok(r.value, `${JSON.stringify(text)} should parse: ${r.message}`);
  return `${r.value.n}/${r.value.d}`;
};

test('numbers: fractions, typographic minus, spaces and exact decimals', () => {
  assert.equal(value('13/2'), '13/2');
  assert.equal(value('−3/2'), '-3/2');
  assert.equal(value(' -3 / 2 '), '-3/2');
  assert.equal(value('0.5'), '1/2');
  assert.equal(value('-0.25'), '-1/4');
  assert.equal(value('6/4'), '3/2');
  assert.equal(value('7'), '7/1');
});

for (const bad of ['', 'abc', '1e5', '1/0', '1/2/3', '1'.repeat(31), '--1', '1.', '.5', '½']) {
  test(`bad input ${JSON.stringify(bad)} gets a plain message, no result`, () => {
    const r = parseNumber(bad, 'x');
    assert.equal(r.value, undefined);
    assert.equal(typeof r.message, 'string');
    assert.doesNotMatch(r.message, /✅|❌|counterexample/i);
    const all = imageOf([bad, '0', '0']);
    assert.equal(all.ok, false);
    assert.equal(all.message, r.message);
  });
}

test('dividing by zero says so', () => {
  assert.match(parseNumber('1/0', 'x').message, /divide by zero/);
});
