import { parseNetwork, flowChecks } from './graph.js';
import { simplePaths, enumerateRoutings } from './enumerate.js';
import { add, mul, cmp, ZERO, toString } from '../../exact/rational.js';
import { VERDICT, SEARCH_STATE, decide } from '../../harness/verdict.js';
import { FixtureError } from '../../harness/schema.js';

export const problem = 'dgg';

export const conjecture =
  "Goemans' cost conjecture on single-source unsplittable flow. The Dinitz-Garg-Goemans " +
  'theorem (1999) is proven and not in question: given a feasible fractional flow x, an ' +
  'unsplittable routing always exists with y_a <= x_a + D on every arc, where D is the ' +
  'largest single demand. Goemans conjectured that such a routing can also be no more ' +
  'expensive than x. Only that cost strengthening is refuted.';

const DEFAULT_BUDGET = 1000000n;

function readBudget(fixture) {
  if (fixture.budget === undefined) return DEFAULT_BUDGET;
  if (typeof fixture.budget !== 'string' || !/^(0|[1-9][0-9]*)$/.test(fixture.budget)) {
    throw new FixtureError(
      `budget: expected a non-negative integer string, got ${JSON.stringify(fixture.budget)}`,
      'malformed',
    );
  }
  return BigInt(fixture.budget);
}

export function scoreRoutings(network, pathsPerTerminal, routings) {
  const fractionalCost = network.arcs.reduce((sum, arc) => add(sum, mul(arc.cost, arc.flow)), ZERO);

  let cheapestGood = null;
  let goodCount = 0;

  for (const routing of routings) {
    const load = network.arcs.map(() => ZERO);
    routing.forEach((pathIndex, terminalIndex) => {
      const demand = network.terminals[terminalIndex].demand;
      for (const arcIndex of pathsPerTerminal[terminalIndex][pathIndex]) {
        load[arcIndex] = add(load[arcIndex], demand);
      }
    });

    // The congestion bound is per-arc and relative to the fractional flow
    // itself: y_a <= x_a + D. It is not a flat budget.
    const congestionGood = network.arcs.every(
      (arc, i) => cmp(load[i], add(arc.flow, network.maxDemand)) <= 0,
    );
    if (!congestionGood) continue;

    goodCount += 1;
    const cost = network.arcs.reduce((sum, arc, i) => add(sum, mul(arc.cost, load[i])), ZERO);
    if (cheapestGood === null || cmp(cost, cheapestGood) < 0) {
      cheapestGood = cost;
    }
  }

  return { goodCount, cheapestGood, fractionalCost };
}

export function verify(fixture) {
  const network = parseNetwork(fixture && fixture.data);
  const budget = readBudget(fixture);
  const checks = [...flowChecks(network)];

  // Exit 1: an invalid instance is settled before any search. Nothing was
  // capped here and nothing ran out of budget, so it says so: NOT_REACHED, not
  // CAPPED. The two used to be indistinguishable downstream.
  if (checks.some((check) => !check.pass)) {
    return {
      checks,
      requiresSearch: true,
      exhaustive: false,
      searched: null,
      searchState: SEARCH_STATE.NOT_REACHED,
      verdict: VERDICT.REFUTED,
    };
  }

  const pathsPerTerminal = network.terminals.map((t) => simplePaths(network, network.source, t.node));
  const { routings, total, exhaustive } = enumerateRoutings(pathsPerTerminal, budget);
  const enumeratedAll = exhaustive && routings.length === Number(total);

  // Exit 2 (I1): we cannot speak about "every routing" without having seen
  // every routing. Append no further checks -- expressing this as a FAILED
  // check would make decide() return REFUTED, turning "we did not look" into
  // "the claim is false".
  if (!enumeratedAll) {
    return {
      checks,
      requiresSearch: true,
      exhaustive: false,
      searched: null,
      searchState: SEARCH_STATE.CAPPED,
      verdict: decide({ checks, requiresSearch: true, exhaustive: false }),
    };
  }

  const { goodCount, cheapestGood, fractionalCost } = scoreRoutings(network, pathsPerTerminal, routings);

  // Exit 3 (I3): the DGG theorem guarantees a congestion-good routing exists
  // for any feasible fractional flow. Finding none means our enumerator or the
  // instance is wrong -- our failure, so ERROR, never REFUTED.
  if (goodCount === 0) {
    throw new FixtureError(
      'no congestion-good routing exists, which contradicts the Dinitz-Garg-Goemans theorem: ' +
        'the instance or the enumerator is wrong',
      'malformed',
    );
  }

  checks.push({
    name: 'every congestion-good routing costs more than the fractional flow',
    pass: cmp(cheapestGood, fractionalCost) > 0,
    expected: `> ${toString(fractionalCost)}`,
    actual: toString(cheapestGood),
  });

  return {
    checks,
    requiresSearch: true,
    exhaustive: true,
    searched: routings.length,
    searchState: SEARCH_STATE.COMPLETE,
    verdict: decide({ checks, requiresSearch: true, exhaustive: true }),
  };
}
