import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verify, problem } from '../../src/problems/euler/index.js';
import { VERDICT } from '../../src/harness/verdict.js';
import { FixtureError } from '../../src/harness/schema.js';

const load = async (name) =>
  JSON.parse(await readFile(new URL(`../../fixtures/euler/${name}.json`, import.meta.url), 'utf8'));

test('the module declares its problem name', () => {
  assert.equal(problem, 'euler');
});

test('Lander-Parkin 1966 is confirmed', async () => {
  const result = verify(await load('lander-parkin-1966'));
  assert.equal(result.verdict, VERDICT.CONFIRMED);
  assert.ok(result.checks.every((c) => c.pass));
});

test('Elkies 1988 is confirmed, exactly, past 2^53', async () => {
  const result = verify(await load('elkies-1988'));
  assert.equal(result.verdict, VERDICT.CONFIRMED);
  const equality = result.checks.find((c) => c.name.includes('equals'));
  assert.equal(equality.actual, '180630077292169281088848499041');
});

test('a perturbed term is refuted', async () => {
  const result = verify(await load('negative-perturbed-term'));
  assert.equal(result.verdict, VERDICT.REFUTED);
});

test('a true identity using k terms is refuted, not confirmed', async () => {
  const result = verify(await load('negative-true-but-not-a-counterexample'));
  assert.equal(result.verdict, VERDICT.REFUTED);
  const arithmetic = result.checks.find((c) => c.name.includes('equals'));
  const count = result.checks.find((c) => c.name.includes('fewer than'));
  assert.equal(arithmetic.pass, true, 'the arithmetic is genuinely correct');
  assert.equal(count.pass, false, 'but it uses k terms, so it is not a counterexample');
});

test('verification requires no search, so I1 does not bind', async () => {
  const result = verify(await load('lander-parkin-1966'));
  assert.equal(result.requiresSearch, false);
});

test('an exponent below 3 is refuted, since the conjecture starts at k = 3', async () => {
  const fixture = await load('lander-parkin-1966');
  const result = verify({ ...fixture, data: { k: '2', terms: ['3', '4'], rhs: '5' } });
  assert.equal(result.verdict, VERDICT.REFUTED);
});

// The test above fails two checks at once, so it cannot tell which one produced
// the verdict. This one leaves the exponent check as the only failure: 5^2 = 5^2
// is true arithmetic using fewer than k terms, and k = 2 is simply below the
// range the conjecture speaks about.
test('the exponent check alone refutes k = 2, with every other check passing', async () => {
  const fixture = await load('lander-parkin-1966');
  const result = verify({ ...fixture, data: { k: '2', terms: ['5'], rhs: '5' } });

  assert.equal(result.verdict, VERDICT.REFUTED);
  const exponent = result.checks.find((c) => c.name.includes('exponent'));
  assert.equal(exponent.pass, false, 'k = 2 is below the conjecture range');
  for (const other of result.checks.filter((c) => c !== exponent)) {
    assert.equal(other.pass, true, `${other.name} should pass in isolation`);
  }
});

test('malformed data throws FixtureError rather than returning a verdict', async () => {
  const fixture = await load('lander-parkin-1966');
  assert.throws(() => verify({ ...fixture, data: { k: '5', terms: 'not-an-array', rhs: '144' } }), FixtureError);
  assert.throws(() => verify({ ...fixture, data: { k: '5', terms: [], rhs: '144' } }), FixtureError);
});

test('a numeric k (not a string) is malformed', async () => {
  const fixture = await load('lander-parkin-1966');
  const bad = { ...fixture, data: { k: 5, terms: ['27', '84', '110', '133'], rhs: '144' } };
  assert.throws(() => verify(bad), (e) => e instanceof FixtureError && e.code === 'malformed');
});

test('a non-numeric rhs is malformed', async () => {
  const fixture = await load('lander-parkin-1966');
  const bad = { ...fixture, data: { k: '5', terms: ['27', '84', '110', '133'], rhs: 'abc' } };
  assert.throws(() => verify(bad), (e) => e instanceof FixtureError && e.code === 'malformed');
});

test('a non-numeric term is malformed', async () => {
  const fixture = await load('lander-parkin-1966');
  const bad = { ...fixture, data: { k: '5', terms: ['abc', '84', '110', '133'], rhs: '144' } };
  assert.throws(() => verify(bad), (e) => e instanceof FixtureError && e.code === 'malformed');
});

test('a missing data object is malformed', async () => {
  const fixture = await load('lander-parkin-1966');
  const bad = { ...fixture, data: undefined };
  assert.throws(() => verify(bad), (e) => e instanceof FixtureError && e.code === 'malformed');
});
