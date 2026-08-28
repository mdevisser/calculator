import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNetwork, flowChecks } from '../../../src/problems/dgg/graph.js';
import { FixtureError } from '../../../src/harness/schema.js';
import { toString } from '../../../src/exact/rational.js';

// s -> u -> t1 carrying 3, and s -> t2 carrying 2.
function valid(overrides = {}) {
  return {
    source: 's',
    nodes: ['s', 'u', 't1', 't2'],
    arcs: [
      { from: 's', to: 'u', cost: '1', flow: '3' },
      { from: 'u', to: 't1', cost: '1', flow: '3' },
      { from: 's', to: 't2', cost: '2', flow: '2' },
    ],
    terminals: [
      { node: 't1', demand: '3' },
      { node: 't2', demand: '2' },
    ],
    ...overrides,
  };
}

test('parseNetwork returns nodes, arcs, terminals and the maximum demand', () => {
  const net = parseNetwork(valid());
  assert.equal(net.source, 's');
  assert.equal(net.arcs.length, 3);
  assert.equal(net.terminals.length, 2);
  assert.equal(toString(net.maxDemand), '3');
});

test('a well-formed flow passes every check', () => {
  const checks = flowChecks(parseNetwork(valid()));
  assert.ok(checks.length > 0);
  assert.ok(checks.every((c) => c.pass), JSON.stringify(checks.filter((c) => !c.pass)));
});

test('conservation failure at an internal node is a failed check, not a throw', () => {
  const net = parseNetwork(valid({
    arcs: [
      { from: 's', to: 'u', cost: '1', flow: '3' },
      { from: 'u', to: 't1', cost: '1', flow: '2' },
      { from: 's', to: 't2', cost: '2', flow: '2' },
    ],
    terminals: [{ node: 't1', demand: '2' }, { node: 't2', demand: '2' }],
  }));
  const checks = flowChecks(net);
  const conservation = checks.find((c) => c.name.includes('conserved'));
  assert.equal(conservation.pass, false);
});

test('a terminal receiving the wrong amount is a failed check', () => {
  const net = parseNetwork(valid({ terminals: [{ node: 't1', demand: '4' }, { node: 't2', demand: '2' }] }));
  const checks = flowChecks(net);
  assert.ok(checks.some((c) => !c.pass));
});

test('malformed data throws FixtureError, never returns a verdict', () => {
  assert.throws(() => parseNetwork(null), FixtureError);
  assert.throws(() => parseNetwork(valid({ arcs: 'nope' })), FixtureError);
  assert.throws(() => parseNetwork(valid({ terminals: [] })), FixtureError);
  assert.throws(() => parseNetwork(valid({ source: 'nowhere' })), FixtureError);
  assert.throws(() => parseNetwork(valid({ nodes: ['s'] })), FixtureError, 'arc endpoint not in nodes');
});

test('a JSON number where a string belongs throws FixtureError', () => {
  const data = valid();
  data.arcs[0].flow = 3;
  assert.throws(() => parseNetwork(data), FixtureError);
});

test('a negative flow or demand throws FixtureError', () => {
  assert.throws(() => parseNetwork(valid({
    arcs: [{ from: 's', to: 't1', cost: '1', flow: '-3' }],
    terminals: [{ node: 't1', demand: '3' }],
  })), FixtureError);
  assert.throws(() => parseNetwork(valid({ terminals: [{ node: 't1', demand: '-1' }] })), FixtureError);
});

test('a duplicate terminal throws FixtureError', () => {
  assert.throws(() => parseNetwork(valid({
    terminals: [{ node: 't1', demand: '3' }, { node: 't1', demand: '3' }],
  })), FixtureError);
});
