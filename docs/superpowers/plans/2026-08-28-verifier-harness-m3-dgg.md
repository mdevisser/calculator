# Verifier Harness M3 — Goemans' Cost Conjecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `dgg` problem module that verifies claimed counterexamples to Goemans' cost conjecture by exhaustively enumerating every unsplittable routing, and attempt to find a real counterexample instance to test the CONFIRMED path against.

**Architecture:** Exact rational arithmetic (`src/exact/rational.js`, deferred from M1 and now genuinely needed since fractional flows are not integral), a network model with flow validation, a path/routing enumerator that proves its own exhaustiveness, and the problem module joining them. Registers into the existing harness unchanged.

**Tech Stack:** Node 26 (ESM, `"type": "module"`), `node:test`, BigInt. Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-08-28-verifier-harness-design.md`

## What this is, in plain terms

Think of it as order routing. You have one warehouse and several customers, each
wanting a fixed quantity. The routes between them each have a capacity and a cost
per unit.

The **easy version** lets you split a customer's order across several routes — fill
part here, part there. The **hard version** says each customer's whole order must
travel on one single route, all or nothing.

Two questions follow, and they are not the same question:

1. *Can you always do the all-or-nothing version at all?* **Yes** — proved in 1999 by
   Dinitz, Garg and Goemans. You may have to overload some routes, but never by more
   than the size of the biggest single order. **This is a theorem. It was not
   disproved, and this module must never say it was.**
2. *Can you always do it without paying more?* Goemans conjectured yes. **In 2026
   someone found a network where the answer is no** — every all-or-nothing
   arrangement that respects the overload limit costs strictly more than the split
   version. That is the counterexample this module checks.

So a fixture here says: "here is a network where all-or-nothing always costs more."
Our job is to try *every possible* all-or-nothing arrangement and confirm the cheapest
one still costs more than the split solution. "Every possible" is the hard part — if
we cannot prove we tried them all, we must say "don't know" rather than "confirmed".
That is invariant I1, and this is the first module where it actually bites.

## The mathematics, stated once, precisely

Dinitz, Garg and Goemans (1999) **proved**: given a single-source network, terminals `t_i` with demands `d_i`, and a feasible fractional flow `x` meeting those demands, there always exists an *unsplittable* routing `y` — each demand carried on one `s → t_i` path — with `y_a ≤ x_a + D` on every arc, where `D = max_i d_i`. **This theorem is not in question.**

**Goemans' cost conjecture** is the strengthening: that such a routing can additionally satisfy `c·y ≤ c·x`. Rybin's 2026 counterexample refutes it.

A fixture claiming a counterexample therefore asserts: *for this network and cost vector, every congestion-good unsplittable routing costs strictly more than `c·x`.* That is universally quantified over the routing space, so **invariant I1 binds for the first time in this project** — the module must prove it enumerated the whole space or return `INDETERMINATE`.

Two consequences the implementation must respect:
- The congestion bound is **per-arc and relative to `x` itself**. The fractional flow doubles as the capacity vector. It is not a flat budget.
- The DGG theorem gives a free sanity invariant: **at least one congestion-good routing must exist.** If enumeration finds none, our code or the instance is wrong — never a mathematical finding.

## Global Constraints

- **Zero runtime dependencies.** `node:test` and `node:assert/strict` only. No devDependencies.
- **ESM everywhere.** Use `import`, never `require`.
- **BigInt only. No floats anywhere in a verification path.** No `Number`, `parseFloat`, `Math.*` on fixture data. `Number` is permitted only for the presentational `searched` count and for `elapsedMs`, neither of which affects a verdict.
- **Fixture numbers are JSON strings**, never JSON numbers. Rationals are written `"3"` or `"3/4"`.
- **I1** — a claim requiring exhaustive search that was not exhaustively established returns `INDETERMINATE`, never `CONFIRMED`. The runner already enforces a structural backstop; the module must also set `requiresSearch: true` and an honest `exhaustive`.
- **I2** — `source` is mandatory on every fixture.
- **I3** — `REFUTED` means the math says no; `ERROR` means we say no. Malformed fixture data throws `FixtureError`; it must never become `REFUTED`.
- **Never label this result "Dinitz–Garg–Goemans: REFUTED".** The conjecture is Goemans' cost conjecture; the DGG theorem stands.
- **Default search budget** `1_000_000` routings, matching M1's convention.
- **Commit style:** `feat:`, `fix:`, `docs:`, `test:`, `chore:`. One concern per commit.

## Existing interfaces this plan builds on

- `src/exact/integer.js` — `toBigIntStrict(value, field)`, `ipow(base, exponent)`.
- `src/harness/verdict.js` — `VERDICT`, `decide({checks, requiresSearch, exhaustive})`.
- `src/harness/schema.js` — `FixtureError` (with `.code`), `validateFixture`.
- `src/harness/registry.js` — `PROBLEMS`, a `Map` from problem name to module.
- A problem module exports `problem`, `conjecture`, and `verify(fixture)` returning `{checks, requiresSearch, exhaustive, searched, verdict}`.
- `test/harness/artifact.test.js` asserts the committed `results.json` matches a fresh run. **Adding fixtures means regenerating the artifact**, or that test fails.

---

### Task 1: Exact rational arithmetic

**Files:**
- Create: `src/exact/rational.js`
- Test: `test/exact/rational.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `rational(n: bigint, d?: bigint) -> {n, d}` normalized with `d > 0` and `gcd(|n|,d) === 1`; `parseRational(value: string, field: string) -> Rational` accepting `"3"`, `"-3"`, `"3/4"`, `"-3/4"`; `add`, `sub`, `mul` — each `(a, b) -> Rational`; `cmp(a, b) -> -1 | 0 | 1`; `isNegative(a) -> boolean`; `toString(a) -> string`; `ZERO`.

- [ ] **Step 1: Write the failing test**

Create `test/exact/rational.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rational, parseRational, add, sub, mul, cmp, isNegative, toString, ZERO,
} from '../../src/exact/rational.js';

test('rational normalizes sign and common factors', () => {
  assert.deepEqual(rational(6n, 4n), { n: 3n, d: 2n });
  assert.deepEqual(rational(-6n, 4n), { n: -3n, d: 2n });
  assert.deepEqual(rational(6n, -4n), { n: -3n, d: 2n });
  assert.deepEqual(rational(0n, 5n), { n: 0n, d: 1n });
  assert.deepEqual(rational(5n), { n: 5n, d: 1n });
});

test('rational rejects a zero denominator', () => {
  assert.throws(() => rational(1n, 0n), RangeError);
});

test('parseRational accepts integers and fractions', () => {
  assert.deepEqual(parseRational('3', 'x'), { n: 3n, d: 1n });
  assert.deepEqual(parseRational('-3', 'x'), { n: -3n, d: 1n });
  assert.deepEqual(parseRational('3/4', 'x'), { n: 3n, d: 4n });
  assert.deepEqual(parseRational('-6/4', 'x'), { n: -3n, d: 2n });
});

test('parseRational rejects JSON numbers and malformed strings', () => {
  assert.throws(() => parseRational(3, 'x'), TypeError);
  for (const bad of ['', '3/', '/4', '3/0', '1.5', '3 / 4', '03', 'abc', '3/4/5']) {
    assert.throws(() => parseRational(bad, 'data.flow'), RangeError, `should reject ${JSON.stringify(bad)}`);
  }
});

test('parseRational names the offending field', () => {
  assert.throws(() => parseRational('1.5', 'arcs[2].cost'), /arcs\[2\]\.cost/);
});

test('arithmetic is exact', () => {
  const third = parseRational('1/3', 'x');
  const sixth = parseRational('1/6', 'x');
  assert.deepEqual(add(third, sixth), { n: 1n, d: 2n });
  assert.deepEqual(sub(third, sixth), { n: 1n, d: 6n });
  assert.deepEqual(mul(third, sixth), { n: 1n, d: 18n });
  // The float trap: 0.1 + 0.2 !== 0.3 in IEEE754, but must be exact here.
  assert.equal(cmp(add(parseRational('1/10', 'x'), parseRational('2/10', 'x')), parseRational('3/10', 'x')), 0);
});

test('adding thirds three times is exactly one', () => {
  const third = parseRational('1/3', 'x');
  assert.equal(cmp(add(add(third, third), third), parseRational('1', 'x')), 0);
});

test('cmp orders correctly across denominators and signs', () => {
  assert.equal(cmp(parseRational('1/3', 'x'), parseRational('1/2', 'x')), -1);
  assert.equal(cmp(parseRational('1/2', 'x'), parseRational('1/3', 'x')), 1);
  assert.equal(cmp(parseRational('2/4', 'x'), parseRational('1/2', 'x')), 0);
  assert.equal(cmp(parseRational('-1/2', 'x'), parseRational('1/3', 'x')), -1);
});

test('isNegative and ZERO', () => {
  assert.equal(isNegative(parseRational('-1/1000000', 'x')), true);
  assert.equal(isNegative(ZERO), false);
  assert.equal(cmp(ZERO, parseRational('0', 'x')), 0);
});

test('toString round-trips through parseRational', () => {
  for (const v of ['3', '-3', '3/4', '-3/2']) {
    assert.equal(toString(parseRational(v, 'x')), v);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/exact/rational.test.js`
Expected: FAIL — cannot find module `../../src/exact/rational.js`

- [ ] **Step 3: Write the implementation**

Create `src/exact/rational.js`:

```js
// Exact rationals over BigInt. Fractional flows are not integral, and every
// congestion and cost comparison here must be exact — a float would decide a
// verdict by rounding.

const RATIONAL = /^(-?(?:0|[1-9][0-9]*))(?:\/([1-9][0-9]*))?$/;

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) {
    [x, y] = [y, x % y];
  }
  return x;
}

export function rational(n, d = 1n) {
  if (typeof n !== 'bigint' || typeof d !== 'bigint') {
    throw new TypeError('rational: numerator and denominator must be BigInt');
  }
  if (d === 0n) {
    throw new RangeError('rational: denominator must not be zero');
  }
  let num = n;
  let den = d;
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  if (num === 0n) {
    return { n: 0n, d: 1n };
  }
  const g = gcd(num, den);
  return { n: num / g, d: den / g };
}

export const ZERO = rational(0n);

export function parseRational(value, field) {
  if (typeof value !== 'string') {
    throw new TypeError(`${field}: expected a decimal string, got ${typeof value}`);
  }
  const match = RATIONAL.exec(value);
  if (!match) {
    throw new RangeError(
      `${field}: expected an integer or fraction like "3" or "-3/4", got ${JSON.stringify(value)}`,
    );
  }
  return rational(BigInt(match[1]), match[2] === undefined ? 1n : BigInt(match[2]));
}

export function add(a, b) {
  return rational(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function sub(a, b) {
  return rational(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function mul(a, b) {
  return rational(a.n * b.n, a.d * b.d);
}

export function cmp(a, b) {
  const left = a.n * b.d;
  const right = b.n * a.d;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function isNegative(a) {
  return a.n < 0n;
}

export function toString(a) {
  return a.d === 1n ? `${a.n}` : `${a.n}/${a.d}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/exact/rational.test.js`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/exact/rational.js test/exact/rational.test.js
git commit -m "feat: add exact rational arithmetic over BigInt"
```

---

### Task 2: Network model and fractional flow validation

**Files:**
- Create: `src/problems/dgg/graph.js`
- Test: `test/problems/dgg/graph.test.js`

**Interfaces:**
- Consumes: `parseRational`, `add`, `sub`, `cmp`, `isNegative`, `ZERO`, `toString` (Task 1); `FixtureError` from `src/harness/schema.js`.
- Produces: `parseNetwork(data) -> {nodes: string[], source: string, arcs: Array<{from, to, cost: Rational, flow: Rational}>, terminals: Array<{node: string, demand: Rational}>, maxDemand: Rational}`, throwing `FixtureError` on malformed input; `flowChecks(network) -> Array<{name, pass, expected, actual}>`.

Fixture `data` shape:

```json
{
  "source": "s",
  "nodes": ["s", "u", "t1", "t2"],
  "arcs": [{ "from": "s", "to": "u", "cost": "0", "flow": "5" }],
  "terminals": [{ "node": "t1", "demand": "3" }]
}
```

`flow` is the fractional flow `x_a` on that arc, which is also its capacity for the congestion test. Conservation: every non-source, non-terminal node has equal in and out; the source's net outflow equals total demand; each terminal's net inflow equals its demand.

- [ ] **Step 1: Write the failing test**

Create `test/problems/dgg/graph.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/problems/dgg/graph.test.js`
Expected: FAIL — cannot find module `../../../src/problems/dgg/graph.js`

- [ ] **Step 3: Write the implementation**

Create `src/problems/dgg/graph.js`:

```js
import { parseRational, add, sub, cmp, isNegative, toString, ZERO } from '../../exact/rational.js';
import { FixtureError } from '../../harness/schema.js';

function bad(message) {
  return new FixtureError(message, 'malformed');
}

function requireRational(value, field) {
  try {
    return parseRational(value, field);
  } catch (error) {
    throw bad(error.message);
  }
}

function requireNonNegative(value, field) {
  const r = requireRational(value, field);
  if (isNegative(r)) {
    throw bad(`${field}: must not be negative, got ${toString(r)}`);
  }
  return r;
}

export function parseNetwork(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw bad('data must be an object');
  }
  if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
    throw bad('data.nodes must be a non-empty array');
  }
  if (!data.nodes.every((n) => typeof n === 'string' && n.length > 0)) {
    throw bad('data.nodes must contain only non-empty strings');
  }
  const nodes = new Set(data.nodes);
  if (nodes.size !== data.nodes.length) {
    throw bad('data.nodes must not contain duplicates');
  }
  if (typeof data.source !== 'string' || !nodes.has(data.source)) {
    throw bad(`data.source must be one of data.nodes, got ${JSON.stringify(data.source)}`);
  }
  if (!Array.isArray(data.arcs) || data.arcs.length === 0) {
    throw bad('data.arcs must be a non-empty array');
  }
  if (!Array.isArray(data.terminals) || data.terminals.length === 0) {
    throw bad('data.terminals must be a non-empty array');
  }

  const arcs = data.arcs.map((arc, i) => {
    if (arc === null || typeof arc !== 'object' || Array.isArray(arc)) {
      throw bad(`data.arcs[${i}] must be an object`);
    }
    if (!nodes.has(arc.from)) {
      throw bad(`data.arcs[${i}].from is not in data.nodes: ${JSON.stringify(arc.from)}`);
    }
    if (!nodes.has(arc.to)) {
      throw bad(`data.arcs[${i}].to is not in data.nodes: ${JSON.stringify(arc.to)}`);
    }
    if (arc.from === arc.to) {
      throw bad(`data.arcs[${i}] is a self-loop at ${arc.from}`);
    }
    return {
      from: arc.from,
      to: arc.to,
      cost: requireNonNegative(arc.cost, `data.arcs[${i}].cost`),
      flow: requireNonNegative(arc.flow, `data.arcs[${i}].flow`),
    };
  });

  const seen = new Set();
  const terminals = data.terminals.map((terminal, i) => {
    if (terminal === null || typeof terminal !== 'object' || Array.isArray(terminal)) {
      throw bad(`data.terminals[${i}] must be an object`);
    }
    if (!nodes.has(terminal.node)) {
      throw bad(`data.terminals[${i}].node is not in data.nodes: ${JSON.stringify(terminal.node)}`);
    }
    if (terminal.node === data.source) {
      throw bad(`data.terminals[${i}].node is the source`);
    }
    if (seen.has(terminal.node)) {
      throw bad(`data.terminals[${i}].node is duplicated: ${terminal.node}`);
    }
    seen.add(terminal.node);
    const demand = requireNonNegative(terminal.demand, `data.terminals[${i}].demand`);
    if (cmp(demand, ZERO) === 0) {
      throw bad(`data.terminals[${i}].demand must be positive`);
    }
    return { node: terminal.node, demand };
  });

  const maxDemand = terminals.reduce(
    (best, t) => (cmp(t.demand, best) > 0 ? t.demand : best),
    terminals[0].demand,
  );

  return { nodes: data.nodes, source: data.source, arcs, terminals, maxDemand };
}

export function flowChecks(network) {
  const net = new Map(network.nodes.map((n) => [n, ZERO]));
  for (const arc of network.arcs) {
    net.set(arc.from, sub(net.get(arc.from), arc.flow));
    net.set(arc.to, add(net.get(arc.to), arc.flow));
  }

  const demandOf = new Map(network.terminals.map((t) => [t.node, t.demand]));
  const totalDemand = network.terminals.reduce((sum, t) => add(sum, t.demand), ZERO);

  const offenders = [];
  for (const node of network.nodes) {
    if (node === network.source || demandOf.has(node)) continue;
    if (cmp(net.get(node), ZERO) !== 0) {
      offenders.push(`${node} (net ${toString(net.get(node))})`);
    }
  }

  const sourceNet = net.get(network.source);
  const terminalOffenders = network.terminals
    .filter((t) => cmp(net.get(t.node), t.demand) !== 0)
    .map((t) => `${t.node} (got ${toString(net.get(t.node))}, needs ${toString(t.demand)})`);

  return [
    {
      name: 'flow is conserved at every internal node',
      pass: offenders.length === 0,
      expected: 'net zero at all internal nodes',
      actual: offenders.length === 0 ? 'net zero at all internal nodes' : offenders.join(', '),
    },
    {
      name: 'source emits exactly the total demand',
      pass: cmp(sourceNet, { n: -totalDemand.n, d: totalDemand.d }) === 0,
      expected: `-${toString(totalDemand)}`,
      actual: toString(sourceNet),
    },
    {
      name: 'every terminal receives exactly its demand',
      pass: terminalOffenders.length === 0,
      expected: 'all terminals satisfied',
      actual: terminalOffenders.length === 0 ? 'all terminals satisfied' : terminalOffenders.join(', '),
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/problems/dgg/graph.test.js`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/problems/dgg/graph.js test/problems/dgg/graph.test.js
git commit -m "feat: add dgg network model and fractional flow validation"
```

---

### Task 3: Path and routing enumeration with a provable exhaustiveness invariant

**Files:**
- Create: `src/problems/dgg/enumerate.js`
- Test: `test/problems/dgg/enumerate.test.js`

**Interfaces:**
- Consumes: nothing beyond the network shape from Task 2.
- Produces: `simplePaths(network, from, to) -> number[][]` (arrays of arc indices, no repeated nodes); `routingCount(pathsPerTerminal: number[][][]) -> bigint`; `enumerateRoutings(pathsPerTerminal, budget: bigint) -> {routings: number[][], total: bigint, exhaustive: boolean}`.

**This is where I1 is earned.** `total` is computed independently as the product of per-terminal path counts. The caller asserts `routings.length === Number(total)`. If the product exceeds `budget`, no routings are enumerated and `exhaustive` is `false` — the module must then return `INDETERMINATE`, never `CONFIRMED`.

- [ ] **Step 1: Write the failing test**

Create `test/problems/dgg/enumerate.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/problems/dgg/enumerate.test.js`
Expected: FAIL — cannot find module `../../../src/problems/dgg/enumerate.js`

- [ ] **Step 3: Write the implementation**

Create `src/problems/dgg/enumerate.js`:

```js
// Enumeration is where invariant I1 is earned. `total` is computed independently
// of the enumeration loop so the caller can assert the two agree; a mismatch, or
// a space larger than the budget, means we cannot claim to have checked
// everything and the verdict must degrade to INDETERMINATE.

export function simplePaths(network, from, to) {
  const outgoing = new Map(network.nodes.map((n) => [n, []]));
  network.arcs.forEach((arc, index) => {
    outgoing.get(arc.from).push(index);
  });

  const paths = [];
  const visited = new Set([from]);
  const current = [];

  const walk = (node) => {
    if (node === to) {
      paths.push([...current]);
      return;
    }
    for (const index of outgoing.get(node)) {
      const next = network.arcs[index].to;
      if (visited.has(next)) continue;
      visited.add(next);
      current.push(index);
      walk(next);
      current.pop();
      visited.delete(next);
    }
  };

  if (from !== to) walk(from);
  return paths;
}

export function routingCount(pathsPerTerminal) {
  return pathsPerTerminal.reduce((product, paths) => product * BigInt(paths.length), 1n);
}

export function enumerateRoutings(pathsPerTerminal, budget) {
  const total = routingCount(pathsPerTerminal);

  if (total > budget) {
    return { routings: [], total, exhaustive: false };
  }
  if (total === 0n) {
    return { routings: [], total, exhaustive: true };
  }

  const routings = [];
  const choice = new Array(pathsPerTerminal.length).fill(0);

  const build = (depth) => {
    if (depth === pathsPerTerminal.length) {
      routings.push([...choice]);
      return;
    }
    for (let i = 0; i < pathsPerTerminal[depth].length; i += 1) {
      choice[depth] = i;
      build(depth + 1);
    }
  };

  build(0);
  return { routings, total, exhaustive: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/problems/dgg/enumerate.test.js`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/problems/dgg/enumerate.js test/problems/dgg/enumerate.test.js
git commit -m "feat: add dgg path and routing enumeration with exhaustiveness reporting"
```

---

### Task 4: The dgg problem module

**Files:**
- Create: `src/problems/dgg/index.js`
- Modify: `src/harness/registry.js`
- Test: `test/problems/dgg.test.js`

**Interfaces:**
- Consumes: Tasks 1–3; `decide` and `VERDICT` from `src/harness/verdict.js`; `FixtureError` from `src/harness/schema.js`.
- Produces: module exports `problem: 'dgg'`, `conjecture: string`, `verify(fixture) -> {checks, requiresSearch: true, exhaustive, searched, verdict}`.

Verification procedure: validate the flow; compute `D = maxDemand`; find simple `s → t_i` paths per terminal; enumerate routings within budget; for each routing accumulate `y_a` and reject unless `y_a ≤ x_a + D` on every arc; take the minimum cost among congestion-good routings; the counterexample stands iff that minimum is strictly greater than `c·x`.

The four checks, in order:

1. flow validity (three sub-checks from Task 2, spread inline)
2. **the routing space was enumerated exhaustively** — `routings.length === Number(total)` and `exhaustive`
3. **at least one congestion-good routing exists** — the DGG theorem guarantees this; failure means our code or the instance is wrong
4. **every congestion-good routing costs more than the fractional flow**

- [ ] **Step 1: Write the failing test**

Create `test/problems/dgg.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { verify, problem, conjecture } from '../../src/problems/dgg/index.js';
import { VERDICT } from '../../src/harness/verdict.js';
import { FixtureError } from '../../src/harness/schema.js';

// One terminal, one route, cost matches the fractional flow exactly: the
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
});

test('verification requires search, and reports exhaustiveness honestly', () => {
  const result = verify(holds);
  assert.equal(result.requiresSearch, true);
  assert.equal(result.exhaustive, true);
  assert.equal(result.searched, 1);
});

test('the DGG theorem sanity check passes on a valid instance', () => {
  const result = verify(holds);
  const sanity = result.checks.find((c) => c.name.includes('congestion-good routing exists'));
  assert.equal(sanity.pass, true);
});

test('I1: a budget too small to enumerate yields INDETERMINATE, never CONFIRMED', () => {
  const result = verify({ ...holds, budget: '0' });
  assert.equal(result.verdict, VERDICT.INDETERMINATE);
  assert.equal(result.exhaustive, false);
});

test('an invalid fractional flow fails a check rather than throwing', () => {
  const result = verify({
    ...holds,
    data: { ...holds.data, terminals: [{ node: 't1', demand: '4' }] },
  });
  assert.equal(result.verdict, VERDICT.REFUTED);
  assert.ok(result.checks.some((c) => !c.pass && c.name.includes('terminal')));
});

test('malformed network data throws FixtureError, never returns a verdict', () => {
  assert.throws(() => verify({ ...holds, data: { ...holds.data, arcs: 'nope' } }), FixtureError);
  assert.throws(() => verify({ ...holds, data: null }), FixtureError);
});

test('a fixture whose budget is not a positive integer string throws FixtureError', () => {
  assert.throws(() => verify({ ...holds, budget: 5 }), FixtureError);
  assert.throws(() => verify({ ...holds, budget: '-1' }), FixtureError);
});

test('mechanism test: CONFIRMED when every congestion-good routing costs more', () => {
  // Two terminals sharing a cheap arc whose fractional flow is too small to
  // carry either demand alone once D is added, forcing both onto the dear arc.
  // This exercises the CONFIRMED path. It is NOT a claimed counterexample to
  // Goemans' conjecture -- see fixtures/dgg/ for instances that make that claim.
  const result = verify({
    ...holds,
    expect: 'CONFIRMED',
    data: {
      source: 's',
      nodes: ['s', 'm', 't1'],
      arcs: [
        { from: 's', to: 'm', cost: '1', flow: '1' },
        { from: 'm', to: 't1', cost: '1', flow: '1' },
        { from: 's', to: 't1', cost: '100', flow: '0' },
      ],
      terminals: [{ node: 't1', demand: '1' }],
    },
  });
  assert.equal(result.exhaustive, true);
  assert.ok([VERDICT.CONFIRMED, VERDICT.REFUTED].includes(result.verdict));
});
```

**Note for the implementer:** the final test asserts only that the module runs and reports honestly on that shape, because whether that specific instance is congestion-good depends on arithmetic you should not pre-judge. After implementing, compute the actual verdict, then tighten that final assertion to the exact verdict your implementation produces **and add a comment explaining why that verdict is mathematically correct for that instance**. If you cannot justify it, say so in your report rather than asserting it.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/problems/dgg.test.js`
Expected: FAIL — cannot find module `../../src/problems/dgg/index.js`

- [ ] **Step 3: Write the implementation**

Create `src/problems/dgg/index.js`:

```js
import { parseNetwork, flowChecks } from './graph.js';
import { simplePaths, enumerateRoutings } from './enumerate.js';
import { add, mul, cmp, ZERO, toString } from '../../exact/rational.js';
import { decide } from '../../harness/verdict.js';
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

export function verify(fixture) {
  const network = parseNetwork(fixture && fixture.data);
  const budget = readBudget(fixture);
  const checks = [...flowChecks(network)];

  const pathsPerTerminal = network.terminals.map((t) => simplePaths(network, network.source, t.node));
  const { routings, total, exhaustive } = enumerateRoutings(pathsPerTerminal, budget);

  const enumeratedAll = exhaustive && routings.length === Number(total);
  checks.push({
    name: 'routing space enumerated exhaustively',
    pass: enumeratedAll,
    expected: `${total} routings`,
    actual: exhaustive ? `${routings.length} routings` : `budget ${budget} exceeded`,
  });

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

  // The DGG theorem guarantees a congestion-good routing exists. If none is
  // found on an exhaustively enumerated space, our code or the instance is
  // wrong -- this is never a mathematical finding.
  checks.push({
    name: 'at least one congestion-good routing exists (DGG theorem)',
    pass: !enumeratedAll || goodCount > 0,
    expected: '>= 1',
    actual: enumeratedAll ? `${goodCount}` : 'not established',
  });

  checks.push({
    name: 'every congestion-good routing costs more than the fractional flow',
    pass: enumeratedAll && cheapestGood !== null && cmp(cheapestGood, fractionalCost) > 0,
    expected: `> ${toString(fractionalCost)}`,
    actual: cheapestGood === null ? 'no congestion-good routing' : toString(cheapestGood),
  });

  return {
    checks,
    requiresSearch: true,
    exhaustive: enumeratedAll,
    searched: exhaustive ? routings.length : null,
    verdict: decide({ checks, requiresSearch: true, exhaustive: enumeratedAll }),
  };
}
```

- [ ] **Step 4: Register the module**

Modify `src/harness/registry.js` to import and register `dgg` alongside `euler`:

```js
import * as euler from '../problems/euler/index.js';
import * as dgg from '../problems/dgg/index.js';

// Problem modules register here. Each exports `problem`, `conjecture`, and
// `verify(fixture)`.
export const PROBLEMS = new Map([
  [euler.problem, euler],
  [dgg.problem, dgg],
]);
```

- [ ] **Step 5: Run tests, then tighten the final assertion**

Run: `node --test test/problems/dgg.test.js`
Expected: PASS. Then follow the note in Step 1 — determine the actual verdict of the mechanism test's instance, justify it mathematically, and replace the loose assertion with the exact verdict plus a comment.

- [ ] **Step 6: Run the whole suite**

Run: `node --test`
Expected: PASS, no failures. The artifact test still passes because no fixtures have been added yet.

- [ ] **Step 7: Commit**

```bash
git add src/problems/dgg/index.js src/harness/registry.js test/problems/dgg.test.js
git commit -m "feat: add dgg module verifying Goemans' cost conjecture counterexamples"
```

---

### Task 5: Fixtures and artifact regeneration

**Files:**
- Create: `fixtures/dgg/synthetic-conjecture-holds.json`
- Create: `fixtures/dgg/negative-broken-flow.json`
- Create: `fixtures/dgg/rybin-2026.json`
- Modify: `results.json`, `web/results.js` (regenerated)

**Interfaces:**
- Consumes: the `dgg` module from Task 4.
- Produces: fixtures the results page renders.

- [ ] **Step 1: Write the three fixtures**

`fixtures/dgg/synthetic-conjecture-holds.json` — a valid instance where the cheapest congestion-good routing exactly equals the fractional cost, so the counterexample claim fails. This is the control proving the module does not rubber-stamp:

```json
{
  "problem": "dgg",
  "candidate": "synthetic-conjecture-holds",
  "claim": "control: a valid instance on which Goemans' cost conjecture holds, so no counterexample is present",
  "expect": "REFUTED",
  "source": {
    "url": "https://link.springer.com/article/10.1007/s004930050043",
    "author": "synthetic control, constructed for this repository",
    "date": "2026-08-28",
    "peerReviewed": false
  },
  "data": {
    "source": "s",
    "nodes": ["s", "u", "t1", "t2"],
    "arcs": [
      { "from": "s", "to": "u", "cost": "1", "flow": "3" },
      { "from": "u", "to": "t1", "cost": "1", "flow": "3" },
      { "from": "s", "to": "t2", "cost": "2", "flow": "2" }
    ],
    "terminals": [
      { "node": "t1", "demand": "3" },
      { "node": "t2", "demand": "2" }
    ]
  }
}
```

`fixtures/dgg/negative-broken-flow.json` — conservation deliberately violated, so the flow-validity check fails:

```json
{
  "problem": "dgg",
  "candidate": "negative-broken-flow",
  "claim": "control: the declared fractional flow does not conserve at an internal node",
  "expect": "REFUTED",
  "source": {
    "url": "https://link.springer.com/article/10.1007/s004930050043",
    "author": "negative control, constructed for this repository",
    "date": "2026-08-28",
    "peerReviewed": false
  },
  "data": {
    "source": "s",
    "nodes": ["s", "u", "t1"],
    "arcs": [
      { "from": "s", "to": "u", "cost": "1", "flow": "3" },
      { "from": "u", "to": "t1", "cost": "1", "flow": "2" }
    ],
    "terminals": [{ "node": "t1", "demand": "3" }]
  }
}
```

`fixtures/dgg/rybin-2026.json` — the real counterexample, whose graph we do not have:

```json
{
  "problem": "dgg",
  "candidate": "rybin-2026",
  "claim": "fractional cost 58; every congestion-good unsplittable routing costs at least 60",
  "expect": "INDETERMINATE",
  "status": "unsourced",
  "source": {
    "url": "https://x.com/basedjensen/status/2080020575968543230",
    "author": "Dmitry Rybin with GPT-5.6 Pro",
    "date": "2026-07-22",
    "peerReviewed": false
  }
}
```

- [ ] **Step 2: Run the CLI and inspect**

```bash
node bin/verify.js --all
echo "exit: $?"
```

Expected: the four euler fixtures plus three dgg fixtures. `synthetic-conjecture-holds` and `negative-broken-flow` REFUTED, `rybin-2026` INDETERMINATE with reason `missing-source-data`, and `0 unexpected` with exit `0`.

If `synthetic-conjecture-holds` does not come back REFUTED, do **not** adjust the fixture to make the test pass. Work out why, and report it — an unexpected CONFIRMED there would mean either the module is wrong or you have accidentally constructed a counterexample, and the second would be a genuine finding requiring scrutiny, not a green checkmark.

- [ ] **Step 3: Run the whole suite**

Run: `node --test`
Expected: PASS. The artifact test now requires the regenerated `results.json` from Step 2.

- [ ] **Step 4: Commit**

```bash
git add fixtures/dgg results.json web/results.js
git commit -m "feat: add dgg fixtures with two controls and the unsourced rybin instance"
```

---

### Task 6: Search Juang's parameterized family for a real counterexample

**Files:**
- Create: `scripts/search-juang.js`
- Possibly create: `fixtures/dgg/juang-family-<b>-<m>-<g>.json`
- Modify: `results.json`, `web/results.js` (only if a fixture is added)

**Interfaces:**
- Consumes: `parseNetwork` (Task 2), `verify` (Task 4).
- Produces: a development script; not part of the verification path and not imported by `src/`.

**Background.** A follow-up to Rybin's announcement gave a three-parameter family. It is **unverified secondary material from a social-media post** — treat any hit as a lead requiring confirmation, not as an established result. For integers `b, m, g >= 1` subject to `m <= b - g` and `m(b-m) > (b+m)g`:

- nodes `s, u, v, w, t1, t2, t3`, source `s`
- demands: `t1 = b+m`, `t2 = b`, `t3 = b+m`, so `D = b+m`
- arcs, with `flow` equal to the stated capacity, and cost `0` unless given:

| arc | flow | cost |
|---|---|---|
| `s→t1` | `b` | `b` |
| `s→t2` | `m+g` | `b+m` |
| `s→u` | `2b+m-g` | 0 |
| `u→v` | `b+m-g` | 0 |
| `u→t3` | `b` | `b` |
| `v→t1` | `m` | 0 |
| `v→w` | `b-g` | 0 |
| `w→t2` | `b-m-g` | 0 |
| `w→t3` | `m` | 0 |

The stated fractional cost is `2b² + (b+m)(m+g)`. Conservation checks out by hand at every node, and the cost formula matches the three priced arcs, so the family is at least internally consistent.

- [ ] **Step 1: Write the search script**

Create `scripts/search-juang.js`:

```js
#!/usr/bin/env node
// Development script, not part of the verification path. Sweeps the Juang
// parameterization looking for an instance where every congestion-good routing
// costs more than the fractional flow. Any hit is a lead to confirm, not a result.
import { verify } from '../src/problems/dgg/index.js';

const LIMIT = Number(process.argv[2] ?? 12);

function instance(b, m, g) {
  const r = (v) => `${v}`;
  return {
    source: 's',
    nodes: ['s', 'u', 'v', 'w', 't1', 't2', 't3'],
    arcs: [
      { from: 's', to: 't1', cost: r(b), flow: r(b) },
      { from: 's', to: 't2', cost: r(b + m), flow: r(m + g) },
      { from: 's', to: 'u', cost: '0', flow: r(2 * b + m - g) },
      { from: 'u', to: 'v', cost: '0', flow: r(b + m - g) },
      { from: 'u', to: 't3', cost: r(b), flow: r(b) },
      { from: 'v', to: 't1', cost: '0', flow: r(m) },
      { from: 'v', to: 'w', cost: '0', flow: r(b - g) },
      { from: 'w', to: 't2', cost: '0', flow: r(b - m - g) },
      { from: 'w', to: 't3', cost: '0', flow: r(m) },
    ],
    terminals: [
      { node: 't1', demand: r(b + m) },
      { node: 't2', demand: r(b) },
      { node: 't3', demand: r(b + m) },
    ],
  };
}

const shell = {
  problem: 'dgg', candidate: 'sweep', claim: 'sweep', expect: 'CONFIRMED',
  source: { url: 'u', author: 'a', date: 'd', peerReviewed: false },
};

let tried = 0;
const hits = [];
const skipped = [];

for (let b = 1; b <= LIMIT; b += 1) {
  for (let m = 1; m <= b; m += 1) {
    for (let g = 1; g <= b; g += 1) {
      if (m > b - g) continue;
      if (m * (b - m) <= (b + m) * g) continue;
      if (b - m - g < 0) continue;
      tried += 1;
      let result;
      try {
        result = verify({ ...shell, data: instance(b, m, g) });
      } catch (error) {
        skipped.push({ b, m, g, error: error.message });
        continue;
      }
      const failed = result.checks.filter((c) => !c.pass).map((c) => c.name);
      if (result.verdict === 'CONFIRMED') {
        hits.push({ b, m, g, searched: result.searched, checks: result.checks });
        console.log(`HIT  b=${b} m=${m} g=${g}  routings=${result.searched}`);
      } else {
        console.log(`     b=${b} m=${m} g=${g}  ${result.verdict}  failed: ${failed.join('; ') || 'none'}`);
      }
    }
  }
}

console.log(`\ntried ${tried} parameter triples, ${hits.length} hits, ${skipped.length} skipped`);
for (const s of skipped) console.log(`  skipped b=${s.b} m=${s.m} g=${s.g}: ${s.error}`);
if (hits.length > 0) {
  const best = hits.reduce((a, x) => (x.searched < a.searched ? x : a));
  console.log(`\nsmallest hit: b=${best.b} m=${best.m} g=${best.g}`);
  console.log(JSON.stringify(best.checks, null, 2));
}
```

- [ ] **Step 2: Run the sweep**

```bash
node scripts/search-juang.js 12
```

Record the complete output in your report, including the case where there are zero hits. A clean zero-hit run is a real result about the family as transcribed, not a failure.

- [ ] **Step 3: Act on the outcome**

**If there are one or more hits:** take the smallest by routing count and add it as `fixtures/dgg/juang-family-<b>-<m>-<g>.json` with `expect: "CONFIRMED"`, and a `source` block whose `author` states plainly that it was derived from an unverified social-media parameterization and confirmed locally by exhaustive enumeration, with `peerReviewed: false`. Add a test in `test/problems/dgg.test.js` loading that fixture and asserting `CONFIRMED`, `exhaustive: true`, and that the cost check passed. Regenerate the artifacts and commit.

**If there are zero hits:** add nothing to `fixtures/`. Instead record in your report what the sweep covered and what the failing checks were, and leave the mechanism test from Task 4 as the CONFIRMED coverage. Then append a short section to `docs/superpowers/specs/2026-08-28-verifier-harness-design.md` under §6 noting that the Juang parameterization as transcribed yielded no counterexample over the swept range, so it either differs from Rybin's construction or the transcription is incomplete — which raises the priority of sourcing the original instance for M5.

Either way, do not adjust the family's arithmetic to manufacture a hit.

- [ ] **Step 4: Run the whole suite and commit**

```bash
node --test
node bin/verify.js --all; echo "exit: $?"
git status --short
```

Commit the script, and the fixture and doc change if either applies. Use separate commits for the script and any fixture.

---

## Self-Review

**Spec coverage.** Spec §5 v2 `dgg/` — Tasks 2, 3, 4 cover the four-step procedure, with exhaustiveness as a computed invariant in Task 3 and asserted in Task 4. §4 I1 — Task 3's budget path and Task 4's `requiresSearch: true`, tested in both. §4 I2 — every fixture in Task 5 carries `source`; the harness enforces it. §4 I3 — malformed data throws `FixtureError` in Tasks 2 and 4, tested in both. §6 sourcing risk — Task 5's `rybin-2026` is `status: "unsourced"`, and Task 6 attempts to close the gap. §8 property test — the DGG-theorem sanity check in Task 4 is the property invariant for this module: a valid instance must always admit a congestion-good routing, and a violation indicts the enumerator rather than the conjecture. **`exact/rational.js` deferred from M1 lands in Task 1**, closing that debt.

**Placeholder scan.** No TBDs. Task 6's branch on the sweep outcome is a genuine conditional with both branches fully specified, not a deferral. Task 4 Step 5 asks the implementer to tighten one assertion after computing a value I deliberately did not pre-judge, with instructions to report rather than assert if they cannot justify it.

**Type consistency.** `parseRational(value, field)`, `add/sub/mul(a, b)`, `cmp(a, b)`, `toString(a)` are used with those signatures in Tasks 2 and 4. `parseNetwork(data)` returns the shape Task 3's `simplePaths(network, from, to)` reads (`nodes`, `arcs` with `from`/`to`) and Task 4 destructures (`terminals`, `maxDemand`, `source`). `enumerateRoutings(pathsPerTerminal, budget)` returns `{routings, total, exhaustive}`, consumed under those names in Task 4. `FixtureError` codes stay within the set the harness already knows (`malformed`), so no runner change is needed. The result shape matches what `runner.js` spreads and `report.js`/`web/index.html` render, including `searched` as a `Number` or `null`.

**One note for the executor.** `results.json` is asserted to match a fresh run by `test/harness/artifact.test.js`. Any task that adds a fixture must regenerate it with `node bin/verify.js --all` before committing, or the suite fails. This bites in Tasks 5 and 6.
