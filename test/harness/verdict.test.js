import test from 'node:test';
import assert from 'node:assert/strict';
import { VERDICT, decide } from '../../src/harness/verdict.js';

const passing = [{ pass: true }, { pass: true }];
const mixed = [{ pass: true }, { pass: false }];

test('all checks passing with no search required is CONFIRMED', () => {
  assert.equal(decide({ checks: passing }), VERDICT.CONFIRMED);
});

test('any failing check is REFUTED', () => {
  assert.equal(decide({ checks: mixed }), VERDICT.REFUTED);
});

test('I1: a search-requiring claim that was not exhaustive is INDETERMINATE', () => {
  assert.equal(
    decide({ checks: passing, requiresSearch: true, exhaustive: false }),
    VERDICT.INDETERMINATE,
  );
});

// The safe default is load-bearing, not decorative: flipping `exhaustive` to
// default true must break something.
test('I1: omitting exhaustive on a search-requiring claim is INDETERMINATE', () => {
  assert.equal(decide({ checks: passing, requiresSearch: true }), VERDICT.INDETERMINATE);
});

test('I1: a search-requiring claim that was exhaustive may be CONFIRMED', () => {
  assert.equal(
    decide({ checks: passing, requiresSearch: true, exhaustive: true }),
    VERDICT.CONFIRMED,
  );
});

test('a failing check beats an incomplete search', () => {
  assert.equal(
    decide({ checks: mixed, requiresSearch: true, exhaustive: false }),
    VERDICT.REFUTED,
  );
});

test('an empty check list is never CONFIRMED', () => {
  assert.equal(decide({ checks: [] }), VERDICT.INDETERMINATE);
});
