import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runFixture, runAll } from '../../src/harness/runner.js';
import { VERDICT, SEARCH_STATE } from '../../src/harness/verdict.js';
import { PROBLEMS } from '../../src/harness/registry.js';

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
  // Nothing was searched and nothing was capped: there was no data to search.
  assert.equal(result.searchState, null);
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

// I1 must survive a module that never calls decide(). The runner is the last
// place a verdict passes through, so the invariant is re-derived there too.
test('I1: the runner downgrades a CONFIRMED claim whose search was not exhaustive', (t) => {
  PROBLEMS.set('stub', {
    problem: 'stub',
    conjecture: 'a stub that bypasses decide()',
    verify: () => ({
      checks: [{ name: 'stub', pass: true, expected: '1', actual: '1' }],
      requiresSearch: true,
      exhaustive: undefined,
      searched: 3,
      verdict: VERDICT.CONFIRMED,
    }),
  });
  t.after(() => PROBLEMS.delete('stub'));

  const result = runFixture(base({ problem: 'stub' }), 'stub/x');
  assert.equal(result.verdict, VERDICT.INDETERMINATE);
  assert.equal(result.reason, 'non-exhaustive-search');
  // The downgrade must move the reported search state with it, or the page
  // would show an indeterminate verdict beside whatever the stub claimed.
  assert.equal(result.searchState, SEARCH_STATE.CAPPED);
});

test('the runner leaves an exhaustive CONFIRMED claim alone', (t) => {
  PROBLEMS.set('stub', {
    problem: 'stub',
    conjecture: 'a stub that searched its whole space',
    verify: () => ({
      checks: [{ name: 'stub', pass: true, expected: '1', actual: '1' }],
      requiresSearch: true,
      exhaustive: true,
      searched: 3,
      verdict: VERDICT.CONFIRMED,
    }),
  });
  t.after(() => PROBLEMS.delete('stub'));

  assert.equal(runFixture(base({ problem: 'stub' }), 'stub/x').verdict, VERDICT.CONFIRMED);
});

test('a genuine euler result requires no search and is untouched by the backstop', () => {
  const result = runFixture(base(), 'euler/x');
  assert.equal(result.requiresSearch, false);
  assert.equal(result.searchState, SEARCH_STATE.NOT_REQUIRED);
  assert.equal(result.verdict, VERDICT.CONFIRMED);
  assert.equal(result.reason, undefined);
});

// Spec 7: an unreadable fixture is an ERROR with a reason code, not an abort.
// JSON.parse used to sit outside the per-fixture boundary, so one bad file
// killed the whole run and produced no verdicts at all.
test('an unparseable fixture file is ERROR and the rest of the run still reports', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'fixtures-'));
  await mkdir(path.join(dir, 'euler'));
  await writeFile(path.join(dir, 'euler', 'good.json'), JSON.stringify(base()), 'utf8');
  await writeFile(path.join(dir, 'euler', 'broken.json'), '{ "problem": "euler",', 'utf8');

  const results = await runAll(dir);

  assert.equal(results.length, 2);
  const broken = results.find((r) => r.fixture === 'euler/broken');
  assert.equal(broken.verdict, VERDICT.ERROR);
  assert.equal(broken.reason, 'unreadable');

  const good = results.find((r) => r.fixture === 'euler/good');
  assert.equal(good.verdict, VERDICT.CONFIRMED, 'the readable fixture still reports');
});
