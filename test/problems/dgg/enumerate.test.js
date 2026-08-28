import test from 'node:test';
import assert from 'node:assert/strict';
import { simplePaths, routingCount, enumerateRoutings } from '../../../src/problems/dgg/enumerate.js';

// s -> a -> t and s -> b -> t and s -> t : exactly three simple s-t paths.
const diamond = {
  nodes: ['s', 'a', 'b', 't'],
  source: 's',
  arcs: [
    { from: 's', to: 'a' }, // 0
    { from: 'a', to: 't' }, // 1
    { from: 's', to: 'b' }, // 2
    { from: 'b', to: 't' }, // 3
    { from: 's', to: 't' }, // 4
  ],
};

test('simplePaths finds every simple path and no others', () => {
  const paths = simplePaths(diamond, 's', 't');
  assert.equal(paths.length, 3);
  const asSets = paths.map((p) => p.join(',')).sort();
  assert.deepEqual(asSets, ['0,1', '2,3', '4']);
});

test('simplePaths returns an empty list when the terminal is unreachable', () => {
  assert.deepEqual(simplePaths(diamond, 't', 's'), []);
});

test('simplePaths does not revisit a node, so a cycle cannot loop forever', () => {
  const cyclic = {
    nodes: ['s', 'a', 'b', 't'],
    source: 's',
    arcs: [
      { from: 's', to: 'a' },
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' },
      { from: 'b', to: 't' },
    ],
  };
  const paths = simplePaths(cyclic, 's', 't');
  assert.equal(paths.length, 1);
  assert.deepEqual(paths[0], [0, 1, 3]);
});

test('routingCount is the product of per-terminal path counts', () => {
  assert.equal(routingCount([[[0], [1]], [[2], [3], [4]]]), 6n);
  assert.equal(routingCount([[[0]]]), 1n);
  assert.equal(routingCount([[[0], [1]], []]), 0n);
});

test('enumerateRoutings produces exactly routingCount routings, all distinct', () => {
  const perTerminal = [[[0], [1]], [[2], [3], [4]]];
  const { routings, total, exhaustive } = enumerateRoutings(perTerminal, 1000n);
  assert.equal(total, 6n);
  assert.equal(exhaustive, true);
  assert.equal(routings.length, 6);
  assert.equal(new Set(routings.map((r) => r.join('|'))).size, 6);
});

test('a routing picks exactly one path index per terminal, in range', () => {
  const perTerminal = [[[0], [1]], [[2], [3], [4]]];
  const { routings } = enumerateRoutings(perTerminal, 1000n);
  for (const routing of routings) {
    assert.equal(routing.length, 2);
    assert.ok(routing[0] >= 0 && routing[0] < 2);
    assert.ok(routing[1] >= 0 && routing[1] < 3);
  }
});

test('I1: exceeding the budget enumerates nothing and reports not exhaustive', () => {
  const perTerminal = [[[0], [1]], [[2], [3], [4]]];
  const { routings, total, exhaustive } = enumerateRoutings(perTerminal, 5n);
  assert.equal(total, 6n);
  assert.equal(exhaustive, false);
  assert.deepEqual(routings, []);
});

test('a terminal with no path yields zero routings', () => {
  const { routings, total, exhaustive } = enumerateRoutings([[[0]], []], 1000n);
  assert.equal(total, 0n);
  assert.equal(exhaustive, true);
  assert.deepEqual(routings, []);
});
