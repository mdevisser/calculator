import test from 'node:test';
import assert from 'node:assert/strict';
import { verify, scoreRoutings } from '../../../src/problems/dgg/index.js';
import { parseNetwork } from '../../../src/problems/dgg/graph.js';
import { simplePaths, enumerateRoutings } from '../../../src/problems/dgg/enumerate.js';
import { toString } from '../../../src/exact/rational.js';
import { VERDICT } from '../../../src/harness/verdict.js';

// A differential property test. Spec 8 asks for a property test on random small
// networks, but the property it states -- minimum unsplittable cost >= fractional
// cost -- is false for an arbitrary feasible fractional flow. It holds only
// against a MINIMUM-COST fractional flow, and nothing in this repo computes one,
// so asserting it as written would fail on correct code.
//
// What is testable without that machinery is agreement between two independent
// implementations. Everything below the generator is a second, deliberately
// naive verifier written from the definitions: paths by an iterative worklist
// rather than recursive DFS, routings by odometer arithmetic on a counter rather
// than recursion, loads and costs in plain BigInt rather than rationals. It
// imports nothing from src/. If the reference were built on enumerate.js this
// would be a tautology instead of a test.

// ---------------------------------------------------------------------------
// Deterministic generator. Math.random would make this flaky and unreproducible.
// ---------------------------------------------------------------------------

function makeRng(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= (state << 13) >>> 0;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= (state << 5) >>> 0;
    state >>>= 0;
    return state;
  };
}

const upTo = (rng, n) => rng() % n;

// ---------------------------------------------------------------------------
// The independent reference implementation.
// ---------------------------------------------------------------------------

const arcKey = (from, to) => `${from}->${to}`;

// Simple paths by explicit worklist: pop a partial path, extend it by every arc
// leaving its last node that does not revisit a node already on it.
function refPaths(arcs, from, to) {
  const found = [];
  const pending = [[from]];
  while (pending.length > 0) {
    const path = pending.pop();
    const last = path[path.length - 1];
    if (last === to) {
      found.push(path);
      continue;
    }
    for (const arc of arcs) {
      if (arc.from !== last) continue;
      if (path.includes(arc.to)) continue;
      pending.push([...path, arc.to]);
    }
  }
  return found;
}

// Every routing, by treating the routing index as a mixed-radix odometer over
// the per-terminal path lists.
function refScore(arcs, terminals, pathsPerTerminal, maxDemand) {
  const total = pathsPerTerminal.reduce((product, paths) => product * paths.length, 1);
  let goodCount = 0;
  let cheapestGood = null;

  for (let n = 0; n < total; n += 1) {
    const load = new Map(arcs.map((arc) => [arcKey(arc.from, arc.to), 0n]));
    let rest = n;
    for (let i = pathsPerTerminal.length - 1; i >= 0; i -= 1) {
      const options = pathsPerTerminal[i];
      const chosen = options[rest % options.length];
      rest = Math.floor(rest / options.length);
      for (let step = 0; step + 1 < chosen.length; step += 1) {
        const key = arcKey(chosen[step], chosen[step + 1]);
        load.set(key, load.get(key) + terminals[i].demand);
      }
    }

    const congestionGood = arcs.every(
      (arc) => load.get(arcKey(arc.from, arc.to)) <= arc.flow + maxDemand,
    );
    if (!congestionGood) continue;

    goodCount += 1;
    let cost = 0n;
    for (const arc of arcs) {
      cost += arc.cost * load.get(arcKey(arc.from, arc.to));
    }
    if (cheapestGood === null || cost < cheapestGood) cheapestGood = cost;
  }

  return { total, goodCount, cheapestGood };
}

// ---------------------------------------------------------------------------
// Instance generation: a layered DAG whose fractional flow is built by routing
// each demand along one or two real paths, so conservation holds by construction
// and flowChecks always pass. Terminals are sinks, so no two arcs share an
// ordered pair and a path is identified by its node sequence.
// ---------------------------------------------------------------------------

function generate(rng) {
  const middles = ['m0', 'm1', 'm2'].slice(0, 1 + upTo(rng, 3));
  const terminals = ['t0', 't1', 't2'].slice(0, 2 + upTo(rng, 2));
  const order = ['s', ...middles, ...terminals];

  const arcs = [];
  for (let i = 0; i < order.length; i += 1) {
    if (terminals.includes(order[i])) continue;
    for (let j = i + 1; j < order.length; j += 1) {
      if (upTo(rng, 100) < 55) {
        arcs.push({ from: order[i], to: order[j], cost: BigInt(upTo(rng, 4)), flow: 0n });
      }
    }
  }

  const demands = terminals.map(() => BigInt(1 + upTo(rng, 4)));
  const paths = terminals.map((t) => refPaths(arcs, 's', t));

  // Unreachable terminals get a direct arc, then their paths are recomputed.
  let patched = false;
  paths.forEach((found, i) => {
    if (found.length === 0) {
      arcs.push({ from: 's', to: terminals[i], cost: BigInt(upTo(rng, 4)), flow: 0n });
      patched = true;
    }
  });
  const pathsPerTerminal = patched ? terminals.map((t) => refPaths(arcs, 's', t)) : paths;

  // Keep every instance small enough to enumerate twice in milliseconds, and
  // large enough to be worth comparing: a one-routing instance agrees with
  // anything.
  const total = pathsPerTerminal.reduce((product, found) => product * found.length, 1);
  if (total < 4 || total > 400 || pathsPerTerminal.some((found) => found.length > 8)) return null;

  const bump = (from, to, amount) => {
    const arc = arcs.find((a) => a.from === from && a.to === to);
    arc.flow += amount;
  };

  terminals.forEach((_, i) => {
    const options = pathsPerTerminal[i];
    const demand = demands[i];
    const first = options[upTo(rng, options.length)];
    // Split across a second path when there is one and the demand allows it,
    // so the fractional flow is genuinely fractional in the splittable sense.
    const split = options.length > 1 && demand > 1n && upTo(rng, 2) === 0;
    const carried = split ? BigInt(1 + upTo(rng, Number(demand) - 1)) : demand;
    for (let step = 0; step + 1 < first.length; step += 1) {
      bump(first[step], first[step + 1], carried);
    }
    if (!split) return;
    const others = options.filter((p) => p !== first);
    const second = others[upTo(rng, others.length)];
    for (let step = 0; step + 1 < second.length; step += 1) {
      bump(second[step], second[step + 1], demand - carried);
    }
  });

  return {
    arcs,
    terminals: terminals.map((node, i) => ({ node, demand: demands[i] })),
    maxDemand: demands.reduce((best, d) => (d > best ? d : best), demands[0]),
    pathsPerTerminal,
    fixture: {
      problem: 'dgg',
      candidate: 'property-instance',
      claim: 'randomly generated instance for the differential property test',
      expect: 'CONFIRMED',
      source: { url: 'generated', author: 'property test', date: '2026-08-28', peerReviewed: false },
      data: {
        source: 's',
        nodes: order,
        arcs: arcs.map((a) => ({
          from: a.from,
          to: a.to,
          cost: a.cost.toString(),
          flow: a.flow.toString(),
        })),
        terminals: terminals.map((node, i) => ({ node, demand: demands[i].toString() })),
      },
    },
  };
}

const canonical = (nodePaths) => nodePaths.map((p) => p.join('>')).sort();

test('dgg agrees with an independent brute-force implementation on random instances', () => {
  const rng = makeRng(20260828);
  let checked = 0;

  for (let attempt = 0; attempt < 400 && checked < 40; attempt += 1) {
    const instance = generate(rng);
    if (instance === null) continue;
    checked += 1;

    const { arcs, terminals, maxDemand, pathsPerTerminal, fixture } = instance;
    const label = JSON.stringify(fixture.data);

    // --- the module's side -------------------------------------------------
    const network = parseNetwork(fixture.data);
    const modulePaths = network.terminals.map((t) => simplePaths(network, network.source, t.node));
    const enumerated = enumerateRoutings(modulePaths, 1000000n);
    const scored = scoreRoutings(network, modulePaths, enumerated.routings);
    const result = verify(fixture);

    // --- the reference's side ----------------------------------------------
    const reference = refScore(arcs, terminals, pathsPerTerminal, maxDemand);
    const refFractional = arcs.reduce((sum, arc) => sum + arc.cost * arc.flow, 0n);

    // Path counts, and the paths themselves, not merely how many there are.
    assert.deepEqual(
      modulePaths.map((paths) => paths.length),
      pathsPerTerminal.map((paths) => paths.length),
      `path counts disagree on ${label}`,
    );
    modulePaths.forEach((paths, i) => {
      const asNodes = paths.map((path) => [
        network.source,
        ...path.map((arcIndex) => network.arcs[arcIndex].to),
      ]);
      assert.deepEqual(canonical(asNodes), canonical(pathsPerTerminal[i]), `paths disagree on ${label}`);
    });

    // Routing totals.
    assert.equal(Number(enumerated.total), reference.total, `routing totals disagree on ${label}`);
    assert.equal(enumerated.routings.length, reference.total, `enumeration is short on ${label}`);
    assert.equal(result.searched, reference.total, `searched count disagrees on ${label}`);

    // Congestion-good counts and the cheapest legal cost.
    assert.ok(reference.goodCount > 0, `no congestion-good routing on ${label}`);
    assert.equal(scored.goodCount, reference.goodCount, `good counts disagree on ${label}`);
    assert.equal(
      toString(scored.cheapestGood),
      String(reference.cheapestGood),
      `cheapest legal cost disagrees on ${label}`,
    );

    // Fractional cost, and the verdict the pair of them implies.
    assert.equal(
      toString(scored.fractionalCost),
      String(refFractional),
      `fractional cost disagrees on ${label}`,
    );
    const costCheck = result.checks.find((c) => c.name.includes('costs more'));
    assert.equal(costCheck.expected, `> ${refFractional}`);
    assert.equal(costCheck.actual, String(reference.cheapestGood));
    assert.equal(
      result.verdict,
      reference.cheapestGood > refFractional ? VERDICT.CONFIRMED : VERDICT.REFUTED,
      `verdict disagrees on ${label}`,
    );
  }

  assert.equal(checked, 40, 'the generator should have produced 40 usable instances');
});
