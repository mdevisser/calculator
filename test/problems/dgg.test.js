import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
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

// Shared fixture for the breach tests below: two terminals can each reach
// their own node either through a shared trunk arc (s->m) with zero flow, or
// through their own direct arc that already carries their fractional share.
// Routing both terminals over the trunk loads it with the sum of both
// demands, which exceeds the trunk's congestion bound (flow 0 + maxDemand 1);
// routing them over their direct arcs never touches the trunk at all.
const breachNetwork = parseNetwork({
  source: 's',
  nodes: ['s', 'm', 't1', 't2'],
  arcs: [
    { from: 's', to: 'm', cost: '1', flow: '0' }, // 0: shared trunk
    { from: 'm', to: 't1', cost: '1', flow: '1' }, // 1
    { from: 'm', to: 't2', cost: '1', flow: '1' }, // 2
    { from: 's', to: 't1', cost: '1', flow: '1' }, // 3: t1's direct arc
    { from: 's', to: 't2', cost: '1', flow: '1' }, // 4: t2's direct arc
  ],
  terminals: [{ node: 't1', demand: '1' }, { node: 't2', demand: '1' }],
});
const breachPaths = [
  [[0, 1], [3]], // t1: via the trunk, or direct
  [[0, 2], [4]], // t2: via the trunk, or direct
];

test('scoreRoutings excludes routings that breach the congestion bound', () => {
  // Routing [0, 0] sends both terminals over the shared trunk: load 2 against
  // a bound of flow(0) + maxDemand(1) = 1 on arc 0, a genuine breach.
  // Routing [1, 1] sends both over their own direct arcs and never loads the
  // trunk, so it is genuinely congestion-good.
  const scored = scoreRoutings(breachNetwork, breachPaths, [[0, 0], [1, 1]]);
  assert.equal(scored.goodCount, 1);
  assert.equal(toString(scored.cheapestGood), '2');
});

test('scoreRoutings reports no good routing as goodCount 0 and cheapestGood null', () => {
  // The same breaching routing as above, offered alone: nothing survives.
  const scored = scoreRoutings(breachNetwork, breachPaths, [[0, 0]]);
  assert.equal(scored.goodCount, 0);
  assert.equal(scored.cheapestGood, null);
});

test('scoreRoutings sums, rather than overwrites, demand contributions on a shared arc', () => {
  // Two terminals with DIFFERENT demands both routed through a shared trunk
  // arc. The trunk's flow is set to exactly the sum of the two demands, so a
  // correct (summing) implementation reproduces the fractional cost exactly;
  // an implementation that overwrites instead of accumulates undercounts the
  // trunk's load by whichever demand was applied first, understating the cost.
  const network = parseNetwork({
    source: 's',
    nodes: ['s', 'm', 't1', 't2'],
    arcs: [
      { from: 's', to: 'm', cost: '1', flow: '3' }, // 0: trunk, shared by both
      { from: 'm', to: 't1', cost: '1', flow: '1' }, // 1
      { from: 'm', to: 't2', cost: '1', flow: '2' }, // 2
    ],
    terminals: [{ node: 't1', demand: '1' }, { node: 't2', demand: '2' }],
  });
  const paths = [
    [[0, 1]], // t1: only route is via the trunk
    [[0, 2]], // t2: only route is via the trunk
  ];

  const scored = scoreRoutings(network, paths, [[0, 0]]);
  assert.equal(scored.goodCount, 1);
  // Trunk load must be 1 + 2 = 3, matching its flow, for a cost of 6.
  // Overwriting (last write wins, t2's demand of 2) would give a trunk load
  // of 2 and a cost of 5 instead.
  assert.equal(toString(scored.cheapestGood), '6');
});

// A genuine hit found by scripts/search-juang.js sweeping an unverified
// three-parameter family from a social-media follow-up to Rybin's
// announcement. This is a lead confirmed locally by exhaustive enumeration,
// not an established result -- see the fixture's source block.
test('juang-family-7-2-1: a swept instance is CONFIRMED by exhaustive enumeration', async () => {
  const fixturePath = fileURLToPath(
    new URL('../../fixtures/dgg/juang-family-7-2-1.json', import.meta.url),
  );
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));

  const result = verify(fixture);

  assert.equal(result.verdict, VERDICT.CONFIRMED);
  assert.equal(result.exhaustive, true);
  const costCheck = result.checks.find((c) => c.name.includes('costs more'));
  assert.ok(costCheck);
  assert.equal(costCheck.pass, true);
});
