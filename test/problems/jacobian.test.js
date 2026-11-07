import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verify, problem, conjecture } from '../../src/problems/jacobian/index.js';
import { jacobianMatrix, determinant3 } from '../../src/problems/jacobian/matrix.js';
import { parsePolynomial, degree } from '../../src/problems/jacobian/polynomial.js';
import { toString } from '../../src/exact/rational.js';
import { VERDICT, SEARCH_STATE } from '../../src/harness/verdict.js';
import { PROBLEMS } from '../../src/harness/registry.js';
import { runFixture } from '../../src/harness/runner.js';

const load = async (name) =>
  JSON.parse(await readFile(new URL(`../../fixtures/jacobian/${name}.json`, import.meta.url), 'utf8'));

const NAMES = [
  'the Jacobian determinant is a constant',
  'the constant is not zero',
  'the points are all different',
  'every point has the same image',
];
const failing = (result) => result.checks.filter((c) => !c.pass).map((c) => NAMES.indexOf(c.name) + 1);

test('the module declares its problem and registers', () => {
  assert.equal(problem, 'jacobian');
  assert.equal(PROBLEMS.get('jacobian').verify, verify);
});

test("Alpöge's map is confirmed: determinant -2, three points to (-1/4, 0, 0)", async () => {
  const result = verify(await load('alpoge-2026'));
  assert.equal(result.verdict, VERDICT.CONFIRMED);
  assert.deepEqual(result.checks.map((c) => c.name), NAMES);
  assert.ok(result.checks.every((c) => c.pass));
  assert.equal(result.checks[0].actual, '-2');
  assert.match(result.checks[3].actual, /\(-1\/4, 0, 0\)/);
  assert.equal(result.requiresSearch, false);
  assert.equal(result.searchState, SEARCH_STATE.NOT_REQUIRED);
});

test('the determinant is exactly the constant -2, cancelled from degree-6 entries', async () => {
  const { data } = await load('alpoge-2026');
  const F = data.map.map((t) => parsePolynomial(t, data.variables));
  const J = jacobianMatrix(F);
  assert.equal(degree(J[0][0]), 6);
  const det = determinant3(J);
  assert.deepEqual([...det].map(([k, r]) => [k, toString(r)]), [['0,0,0', '-2']]);
});

const CONTROLS = {
  'synthetic-fold': [1, 2],
  'negative-zero-determinant': [2],
  'negative-perturbed-point': [4],
  'negative-repeated-point': [3],
};
for (const [name, expected] of Object.entries(CONTROLS)) {
  test(`${name} is refuted on exactly checks ${expected.join(', ')}`, async () => {
    const result = verify(await load(name));
    assert.equal(result.verdict, VERDICT.REFUTED);
    assert.deepEqual(failing(result), expected);
  });
}

test('one changed coefficient breaks the cancellation, reported briefly', async () => {
  const result = verify(await load('negative-changed-coefficient'));
  assert.equal(result.verdict, VERDICT.REFUTED);
  assert.ok(failing(result).includes(1));
  assert.match(result.checks[0].actual, /^not constant: degree \d+, \d+ terms$/);
  assert.ok(result.checks[0].actual.length < 80);
});

test('the conjecture text carries the dimension qualifier', () => {
  assert.match(conjecture, /dimension 3/);
  assert.match(conjecture, /two-dimensional case is still open/);
});

test('every fixture claim on the real map names dimension 3', async () => {
  assert.match((await load('alpoge-2026')).claim, /dimension 3[\s\S]*two-dimensional case is still open/);
});

const broken = async (mutate) => {
  const f = structuredClone(await load('alpoge-2026'));
  mutate(f.data);
  return runFixture(f, 'jacobian/broken');
};
for (const [why, mutate] of [
  ['a typo in the map', (d) => { d.map[0] = '2x'; }],
  ['two variables', (d) => { d.variables = ['x', 'y']; }],
  ['a repeated variable name', (d) => { d.variables = ['x', 'x', 'z']; }],
  ['a point with two coordinates', (d) => { d.points[0] = ['1', '2']; }],
  ['a decimal coordinate', (d) => { d.points[0] = ['0.5', '0', '0']; }],
  ['a single point', (d) => { d.points = [d.points[0]]; }],
  ['two map components', (d) => { d.map = d.map.slice(0, 2); }],
]) {
  test(`${why} is ERROR (malformed), never REFUTED`, async () => {
    const result = await broken(mutate);
    assert.equal(result.verdict, VERDICT.ERROR);
    assert.equal(result.reason, 'malformed');
  });
}
