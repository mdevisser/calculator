import test from 'node:test';
import assert from 'node:assert/strict';
import { verify, scoreRoutings, problem, conjecture } from '../../src/problems/dgg/index.js';
import { parseNetwork } from '../../src/problems/dgg/graph.js';
import { cmp, toString } from '../../src/exact/rational.js';
import { VERDICT } from '../../src/harness/verdict.js';
import { FixtureError } from '../../src/harness/schema.js';

// One terminal, one route, routing cost equal to the fractional cost: the
// conjecture holds here, so a counterexample claim must be REFUTED.
const holds = {
  problem: 'dgg',
  candidate: 'inline',
  claim: 'inline test',
  expect: 'REFUTED',
  source: { url: 'u', author: 'a', date: 'd', peerReviewed: false },
  data: {
    source: 's',
    nodes: ['s', 't1'],
    arcs: [{ from: 's', to: 't1', cost: '1', flow: '3' }],
    terminals: [{ node: 't1', demand: '3' }],
  },
};

test('the module declares its identity and does not mislabel the theorem', () => {
  assert.equal(problem, 'dgg');
  assert.match(conjecture, /Goemans/);
  assert.match(conjecture, /theorem/i);
});

test('an instance where the conjecture holds is REFUTED as a counterexample', () => {
  const result = verify(holds);
  assert.equal(result.verdict, VERDICT.REFUTED);
  const costCheck = result.checks.find((c) => c.name.includes('costs more'));
  assert.equal(costCheck.pass, false);
  assert.equal(costCheck.actual, '3');
  assert.equal(costCheck.expected, '> 3');
});

test('verification requires search and reports exhaustiveness honestly', () => {
  const result = verify(holds);
  assert.equal(result.requiresSearch, true);
  assert.equal(result.exhaustive, true);
  assert.equal(result.searched, 1);
});

test('I1: a budget too small to enumerate is INDETERMINATE, not REFUTED', () => {
  const result = verify({ ...holds, budget: '0' });
  assert.equal(result.verdict, VERDICT.INDETERMINATE);
  assert.equal(result.exhaustive, false);
  assert.equal(result.searched, null);
  // The cost check must be absent, not present-and-failing: "we did not look"
  // is a different statement from "the claim is false".
  assert.equal(result.checks.some((c) => c.name.includes('costs more')), false);
  assert.ok(result.checks.every((c) => c.pass));
});

test('an invalid fractional flow is REFUTED without searching', () => {
  const result = verify({
    ...holds,
    data: { ...holds.data, terminals: [{ node: 't1', demand: '4' }] },
  });
  assert.equal(result.verdict, VERDICT.REFUTED);
  assert.ok(result.checks.some((c) => !c.pass && c.name.includes('terminal')));
  assert.equal(result.searched, null);
});

test('malformed network data throws FixtureError, never returns a verdict', () => {
  assert.throws(() => verify({ ...holds, data: { ...holds.data, arcs: 'nope' } }), FixtureError);
  assert.throws(() => verify({ ...holds, data: null }), FixtureError);
});

test('a budget that is not a non-negative integer string throws FixtureError', () => {
  assert.throws(() => verify({ ...holds, budget: 5 }), FixtureError);
  assert.throws(() => verify({ ...holds, budget: '-1' }), FixtureError);
});

test('scoreRoutings finds the cheapest congestion-good routing and the fractional cost', () => {
  // A unit test of the scorer, NOT a claimed counterexample. Two parallel arcs
  // from s to t1: a cheap one carrying the fractional flow, and a dear one.
  const network = parseNetwork({
    source: 's',
    nodes: ['s', 't1'],
    arcs: [
      { from: 's', to: 't1', cost: '1', flow: '2' },
      { from: 's', to: 't1', cost: '5', flow: '0' },
    ],
    terminals: [{ node: 't1', demand: '2' }],
  });
  const paths = [[[0], [1]]];

  const both = scoreRoutings(network, paths, [[0], [1]]);
  assert.equal(both.goodCount, 2);
  assert.equal(toString(both.fractionalCost), '2');
  assert.equal(toString(both.cheapestGood), '2');

  // Restricted to the dear routing alone, the cheapest congestion-good routing
  // costs more than the fractional flow. That is the shape that drives
  // CONFIRMED, and it is the branch no valid hand-built instance can reach.
  const dear = scoreRoutings(network, paths, [[1]]);
  assert.equal(toString(dear.cheapestGood), '10');
  assert.equal(cmp(dear.cheapestGood, dear.fractionalCost), 1);
});

test('scoreRoutings excludes routings that breach the congestion bound', () => {
  // Demand 1, and a second arc whose fractional flow is 0. The bound is
  // y_a <= x_a + D with D = 1, so a load of 2 on that arc would breach it.
  const network = parseNetwork({
    source: 's',
    nodes: ['s', 't1', 't2'],
    arcs: [
      { from: 's', to: 't1', cost: '1', flow: '1' },
      { from: 's', to: 't2', cost: '1', flow: '1' },
    ],
    terminals: [{ node: 't1', demand: '1' }, { node: 't2', demand: '1' }],
  });
  const paths = [[[0]], [[1]]];
  const scored = scoreRoutings(network, paths, [[0, 0]]);
  assert.equal(scored.goodCount, 1);
  assert.equal(toString(scored.cheapestGood), '2');
});
