import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runFixture, runAll } from '../../src/harness/runner.js';
import { VERDICT } from '../../src/harness/verdict.js';

const FIXTURES = fileURLToPath(new URL('../../fixtures', import.meta.url));

function base(overrides = {}) {
  return {
    problem: 'euler',
    candidate: 'x',
    claim: 'c',
    expect: 'CONFIRMED',
    source: { url: 'u', author: 'a', date: 'd', peerReviewed: false },
    data: { k: '5', terms: ['27', '84', '110', '133'], rhs: '144' },
    ...overrides,
  };
}

test('a valid fixture runs and carries its source through', () => {
  const result = runFixture(base(), 'euler/x');
  assert.equal(result.verdict, VERDICT.CONFIRMED);
  assert.equal(result.source.author, 'a');
  assert.equal(typeof result.elapsedMs, 'number');
});

test('I3: a schema violation is ERROR, never REFUTED', () => {
  const fixture = base();
  delete fixture.source;
  const result = runFixture(fixture, 'euler/x');
  assert.equal(result.verdict, VERDICT.ERROR);
  assert.equal(result.reason, 'missing-source');
});

test('I3: malformed problem data is ERROR, never REFUTED', () => {
  const result = runFixture(base({ data: { k: '5', terms: 'nope', rhs: '144' } }), 'euler/x');
  assert.equal(result.verdict, VERDICT.ERROR);
  assert.equal(result.reason, 'malformed');
});

test('an unknown problem name is ERROR', () => {
  const result = runFixture(base({ problem: 'riemann' }), 'riemann/x');
  assert.equal(result.verdict, VERDICT.ERROR);
  assert.equal(result.reason, 'unknown-problem');
});

test('an unsourced fixture is INDETERMINATE with a reason, not an error', () => {
  const fixture = base({ status: 'unsourced', expect: 'INDETERMINATE' });
  delete fixture.data;
  const result = runFixture(fixture, 'euler/x');
  assert.equal(result.verdict, VERDICT.INDETERMINATE);
  assert.equal(result.reason, 'missing-source-data');
});

test('every result records whether it matched its declared expectation', () => {
  const result = runFixture(base({ expect: 'REFUTED' }), 'euler/x');
  assert.equal(result.verdict, VERDICT.CONFIRMED);
  assert.equal(result.expect, 'REFUTED');
  assert.equal(result.asExpected, false);
});

test('runAll reads every fixture on disk and all of them meet expectations', async () => {
  const results = await runAll(FIXTURES);
  assert.ok(results.length >= 4, 'expected at least the four euler fixtures');
  const surprises = results.filter((r) => !r.asExpected);
  assert.deepEqual(surprises, [], `unexpected verdicts: ${JSON.stringify(surprises, null, 2)}`);
});
