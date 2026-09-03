# Verifier Harness M4 — Jacobian Conjecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `jacobian` problem module that verifies Alpöge's 2026 counterexample to the Jacobian conjecture using exact multivariate polynomial arithmetic.

**Architecture:** Sparse multivariate polynomials over the existing `Rational` type, a symbolic Jacobian matrix and determinant, and a problem module joining them. Registers into the existing harness unchanged. No search — this module resembles `euler` in shape, not `dgg`.

**Tech Stack:** Node 26 (ESM, `"type": "module"`), `node:test`, BigInt. Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-08-28-verifier-harness-design.md`

## What this is, in plain terms

A polynomial map takes three numbers in and gives three numbers out, using only multiplication and addition. The **Jacobian determinant** is a single quantity built from the map's rates of change — think of it as a local scaling factor telling you how much the map stretches or compresses space at a given point.

If that factor is a nonzero *constant* — the same everywhere, never zero — the map never crushes space at any point. It looks, locally, like it should be undoable everywhere. The Jacobian conjecture (Keller, 1939) said that local property forces a global one: such a map must be genuinely reversible.

**In July 2026 that turned out to be false.** Levent Alpöge, using Claude Fable 5, produced a map in three dimensions whose determinant is the constant −2 everywhere, yet which sends **three different points to the same place**. A map that collapses three inputs into one output cannot be undone — given the output, you cannot say which input it came from.

So what this module checks is two things, both of which are ordinary arithmetic once you have exact fractions:

1. The determinant really is the constant −2 — it must survive an enormous cancellation, since a degree-7 map's determinant could in principle be a sprawling polynomial and instead every non-constant piece vanishes.
2. Those three points really are distinct and really do land on the same output.

There is no searching here. Unlike the previous module, we are not claiming something about *every* possible arrangement — we are checking a specific object someone handed us. That makes this module the easy one to get right and the hard one to make interesting.

**What it does not settle:** the conjecture is still open in **two** dimensions. It is only false in three and above.

## The mathematics, stated once, precisely

**The Jacobian conjecture** (over ℂ, characteristic zero): let `F : ℂⁿ → ℂⁿ` be a polynomial map whose Jacobian determinant `det DF` is a nonzero constant. Then `F` is invertible, with a polynomial inverse.

`n = 1` is trivial. **`n = 2` remains open.** Alpöge's counterexample settles `n ≥ 3`, since a counterexample in ℂ³ extends to higher dimensions.

**The counterexample.** With `u = 1 + xy`:

```
F(x, y, z) = ( u³z + y²u(4 + 3xy),
               y + 3x u² z + 3x y²(4 + 3xy),
               2x − 3x²y − x³z )
```

`det DF = −2`, constant. Three distinct points collide:

```
F(0,  0,   −1/4) = F(1, −3/2, 13/2) = F(−1, 3/2, 13/2) = (−1/4, 0, 0)
```

Coefficients are rational, so the same map witnesses the failure over ℚ, ℝ and ℂ.

**All of the above was verified during planning**, not taken from reporting: the three collisions were computed exactly in rational arithmetic, and the expanded term list in Task 4 was checked against the closed form above at 2187 rational points with zero mismatches.

## Global Constraints

- **Zero runtime dependencies.** `node:test` and `node:assert/strict` only. No devDependencies.
- **ESM everywhere.** Use `import`, never `require`.
- **Exact arithmetic only. No float may reach a verdict.** No `Number`, `parseFloat`, `Math.*` on fixture data. Exponents are ordinary small integers and may be `Number`; every *coefficient* and *coordinate* is a `Rational`.
- **Fixture numbers are JSON strings**, never JSON numbers. Rationals are written `"3"`, `"-3"`, or `"-1/4"`.
- **I1** — not binding here. This module performs no search: it sets `requiresSearch: false`, `exhaustive: null`, `searched: null`, `searchState: SEARCH_STATE.NOT_REQUIRED`, exactly as `euler` does.
- **I2** — `source` is mandatory on every fixture.
- **I3** — `REFUTED` means the maths says no; `ERROR` means we say no. Malformed fixture data throws `FixtureError` with code `'malformed'`; it must never become `REFUTED`.
- **Reporting requirement.** The `conjecture` string must state that this refutes the conjecture in **dimensions ≥ 3 only** and that **n = 2 remains open**. A results page reading "Jacobian conjecture: REFUTED" without that qualifier is wrong. This is already recorded in `CLAUDE.md`.
- **Commit style:** `feat:`, `fix:`, `docs:`, `test:`, `chore:`. One concern per commit.

## Existing interfaces this plan builds on

- `src/exact/rational.js` — `rational(n, d?)`, `parseRational(value, field)`, `add`, `sub`, `mul`, `cmp`, `isNegative`, `toString`, `ZERO`. There is no `div` and no `neg`; add them in Task 1 if needed, with tests.
- `src/harness/verdict.js` — `VERDICT`, `SEARCH_STATE` (`NOT_REQUIRED`, `NOT_REACHED`, `COMPLETE`, `CAPPED`), `decide({checks, requiresSearch, exhaustive})`.
- `src/harness/schema.js` — `FixtureError` with `.code`; required source fields `url`, `author`, `date`, `peerReviewed`, plus optional `note`.
- `src/harness/registry.js` — `PROBLEMS`, a `Map` from problem name to module.
- A problem module exports `problem`, `conjecture`, and `verify(fixture)` returning `{checks, requiresSearch, exhaustive, searched, searchState, verdict}`.
- `test/harness/artifact.test.js` asserts the committed `results.json` matches a fresh run. **Adding fixtures means regenerating with `node bin/verify.js --all`**, never a single-fixture run, which overwrites the artifact with one row.

---

### Task 1: Sparse multivariate polynomials

**Files:**
- Create: `src/exact/polynomial.js`
- Test: `test/exact/polynomial.test.js`

**Interfaces:**
- Consumes: `src/exact/rational.js`.
- Produces: `polynomial(terms, arity) -> Poly` where `terms` is an array of `{coeff: Rational, exponents: number[]}`; `parsePolynomial(termList, arity, field) -> Poly` for the fixture JSON form; `addP(a, b)`, `subP(a, b)`, `mulP(a, b)` each `-> Poly`; `differentiate(p, varIndex) -> Poly`; `evaluate(p, point: Rational[]) -> Rational`; `isZero(p) -> boolean`; `isConstant(p) -> boolean`; `constantValue(p) -> Rational` (throws unless constant); `totalDegree(p) -> number`; `termCount(p) -> number`.

Representation: a `Map` keyed by the exponent tuple joined with commas, valued by `Rational`, plus the arity. Zero coefficients are dropped on construction so `isZero` is a size check and equality is structural.

- [ ] **Step 1: Write the failing test**

Create `test/exact/polynomial.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  polynomial, parsePolynomial, addP, subP, mulP, differentiate, evaluate,
  isZero, isConstant, constantValue, totalDegree, termCount,
} from '../../src/exact/polynomial.js';
import { parseRational, toString as rstr } from '../../src/exact/rational.js';

const r = (s) => parseRational(s, 'test');
const term = (c, e) => ({ coeff: r(c), exponents: e });

// 3x^2 y + 1, in three variables
const p = () => polynomial([term('3', [2, 1, 0]), term('1', [0, 0, 0])], 3);

test('construction drops zero coefficients', () => {
  const q = polynomial([term('3', [1, 0, 0]), term('0', [0, 1, 0])], 3);
  assert.equal(termCount(q), 1);
  assert.equal(isZero(polynomial([term('0', [0, 0, 0])], 3)), true);
  assert.equal(isZero(polynomial([], 3)), true);
});

test('construction merges like terms rather than keeping duplicates', () => {
  const q = polynomial([term('3', [1, 0, 0]), term('4', [1, 0, 0])], 3);
  assert.equal(termCount(q), 1);
  assert.equal(rstr(evaluate(q, [r('1'), r('0'), r('0')])), '7');
});

test('addition and subtraction are exact and cancel to zero', () => {
  assert.equal(isZero(subP(p(), p())), true);
  const sum = addP(p(), p());
  assert.equal(rstr(evaluate(sum, [r('1'), r('1'), r('0')])), '8');
});

test('multiplication distributes and raises degree', () => {
  const a = polynomial([term('1', [1, 0, 0]), term('1', [0, 0, 0])], 3); // x + 1
  const b = polynomial([term('1', [1, 0, 0]), term('-1', [0, 0, 0])], 3); // x - 1
  const prod = mulP(a, b); // x^2 - 1
  assert.equal(totalDegree(prod), 2);
  assert.equal(rstr(evaluate(prod, [r('3'), r('0'), r('0')])), '8');
  assert.equal(rstr(evaluate(prod, [r('1'), r('0'), r('0')])), '0');
});

test('multiplication by zero gives zero, by one gives the original', () => {
  const zero = polynomial([], 3);
  const one = polynomial([term('1', [0, 0, 0])], 3);
  assert.equal(isZero(mulP(p(), zero)), true);
  assert.equal(termCount(mulP(p(), one)), termCount(p()));
});

test('differentiation applies the power rule per variable', () => {
  // d/dx (3x^2 y + 1) = 6xy ; d/dy = 3x^2 ; d/dz = 0
  const dx = differentiate(p(), 0);
  assert.equal(rstr(evaluate(dx, [r('1'), r('1'), r('0')])), '6');
  const dy = differentiate(p(), 1);
  assert.equal(rstr(evaluate(dy, [r('2'), r('5'), r('0')])), '12');
  assert.equal(isZero(differentiate(p(), 2)), true);
});

test('differentiating a constant gives zero', () => {
  const c = polynomial([term('7', [0, 0, 0])], 3);
  assert.equal(isZero(differentiate(c, 0)), true);
});

test('evaluation is exact at rational points', () => {
  // 3x^2 y + 1 at (1/2, 2/3, 0) = 3 * 1/4 * 2/3 + 1 = 1/2 + 1 = 3/2
  assert.equal(rstr(evaluate(p(), [r('1/2'), r('2/3'), r('0')])), '3/2');
});

test('constant detection and extraction', () => {
  const c = polynomial([term('-2', [0, 0, 0])], 3);
  assert.equal(isConstant(c), true);
  assert.equal(rstr(constantValue(c)), '-2');
  assert.equal(isConstant(polynomial([], 3)), true, 'the zero polynomial is constant');
  assert.equal(rstr(constantValue(polynomial([], 3))), '0');
  assert.equal(isConstant(p()), false);
  assert.throws(() => constantValue(p()), Error);
});

test('totalDegree is the largest exponent sum', () => {
  assert.equal(totalDegree(p()), 3);
  assert.equal(totalDegree(polynomial([], 3)), 0);
});

test('parsePolynomial reads the fixture form and rejects malformed input', () => {
  const parsed = parsePolynomial(
    [{ coeff: '3', exponents: [2, 1, 0] }, { coeff: '1', exponents: [0, 0, 0] }],
    3,
    'data.components[0]',
  );
  assert.equal(termCount(parsed), 2);
  assert.throws(() => parsePolynomial('nope', 3, 'f'), Error);
  assert.throws(() => parsePolynomial([{ coeff: 3, exponents: [0, 0, 0] }], 3, 'f'), Error, 'JSON number coefficient');
  assert.throws(() => parsePolynomial([{ coeff: '1', exponents: [0, 0] }], 3, 'f'), Error, 'wrong arity');
  assert.throws(() => parsePolynomial([{ coeff: '1', exponents: [0, -1, 0] }], 3, 'f'), Error, 'negative exponent');
  assert.throws(() => parsePolynomial([{ coeff: '1', exponents: [0, 1.5, 0] }], 3, 'f'), Error, 'non-integer exponent');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/exact/polynomial.test.js`
Expected: FAIL — cannot find module `../../src/exact/polynomial.js`

- [ ] **Step 3: Write the implementation**

Create `src/exact/polynomial.js`:

```js
// Sparse multivariate polynomials over exact rationals. Coefficients are
// Rational; exponents are ordinary non-negative integers. The Jacobian
// determinant of a degree-7 map reaches degree 18 before terms cancel, and the
// whole result depends on that cancellation landing exactly on a constant --
// a float would decide the verdict by rounding.

import { parseRational, add, sub, mul, rational, ZERO, cmp } from './rational.js';

const key = (exponents) => exponents.join(',');
const unkey = (k) => k.split(',').map(Number);

function make(arity) {
  return { arity, terms: new Map() };
}

function accumulate(poly, exponents, coeff) {
  const k = key(exponents);
  const existing = poly.terms.get(k);
  const total = existing === undefined ? coeff : add(existing, coeff);
  if (total.n === 0n) {
    poly.terms.delete(k);
  } else {
    poly.terms.set(k, total);
  }
}

export function polynomial(terms, arity) {
  const poly = make(arity);
  for (const { coeff, exponents } of terms) {
    if (exponents.length !== arity) {
      throw new RangeError(`polynomial: expected ${arity} exponents, got ${exponents.length}`);
    }
    accumulate(poly, exponents, coeff);
  }
  return poly;
}

export function parsePolynomial(termList, arity, field) {
  if (!Array.isArray(termList)) {
    throw new TypeError(`${field}: expected an array of terms, got ${typeof termList}`);
  }
  const terms = termList.map((entry, i) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new TypeError(`${field}[${i}]: expected an object with coeff and exponents`);
    }
    if (!Array.isArray(entry.exponents) || entry.exponents.length !== arity) {
      throw new RangeError(`${field}[${i}].exponents: expected an array of ${arity} integers`);
    }
    for (const e of entry.exponents) {
      if (!Number.isInteger(e) || e < 0) {
        throw new RangeError(`${field}[${i}].exponents: expected non-negative integers, got ${JSON.stringify(entry.exponents)}`);
      }
    }
    return { coeff: parseRational(entry.coeff, `${field}[${i}].coeff`), exponents: entry.exponents };
  });
  return polynomial(terms, arity);
}

export function addP(a, b) {
  const out = make(a.arity);
  for (const [k, c] of a.terms) accumulate(out, unkey(k), c);
  for (const [k, c] of b.terms) accumulate(out, unkey(k), c);
  return out;
}

export function subP(a, b) {
  const out = make(a.arity);
  for (const [k, c] of a.terms) accumulate(out, unkey(k), c);
  for (const [k, c] of b.terms) accumulate(out, unkey(k), rational(-c.n, c.d));
  return out;
}

export function mulP(a, b) {
  const out = make(a.arity);
  for (const [ka, ca] of a.terms) {
    const ea = unkey(ka);
    for (const [kb, cb] of b.terms) {
      const eb = unkey(kb);
      accumulate(out, ea.map((e, i) => e + eb[i]), mul(ca, cb));
    }
  }
  return out;
}

export function differentiate(poly, varIndex) {
  const out = make(poly.arity);
  for (const [k, c] of poly.terms) {
    const e = unkey(k);
    const power = e[varIndex];
    if (power === 0) continue;
    const next = [...e];
    next[varIndex] = power - 1;
    accumulate(out, next, mul(c, rational(BigInt(power))));
  }
  return out;
}

export function evaluate(poly, point) {
  let total = ZERO;
  for (const [k, c] of poly.terms) {
    let value = c;
    unkey(k).forEach((e, i) => {
      for (let n = 0; n < e; n += 1) value = mul(value, point[i]);
    });
    total = add(total, value);
  }
  return total;
}

export function isZero(poly) {
  return poly.terms.size === 0;
}

export function termCount(poly) {
  return poly.terms.size;
}

export function isConstant(poly) {
  if (poly.terms.size === 0) return true;
  if (poly.terms.size > 1) return false;
  return unkey([...poly.terms.keys()][0]).every((e) => e === 0);
}

export function constantValue(poly) {
  if (!isConstant(poly)) {
    throw new Error('constantValue: polynomial is not constant');
  }
  if (poly.terms.size === 0) return ZERO;
  return [...poly.terms.values()][0];
}

export function totalDegree(poly) {
  let best = 0;
  for (const k of poly.terms.keys()) {
    const sum = unkey(k).reduce((a, b) => a + b, 0);
    if (sum > best) best = sum;
  }
  return best;
}
```

Note `cmp` is imported but may be unused; remove the import if so rather than leaving it.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/exact/polynomial.test.js`
Expected: PASS, 11 tests

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test
git add src/exact/polynomial.js test/exact/polynomial.test.js
git commit -m "feat: add exact sparse multivariate polynomials"
```

---

### Task 2: Jacobian matrix and symbolic determinant

**Files:**
- Create: `src/problems/jacobian/matrix.js`
- Test: `test/problems/jacobian/matrix.test.js`

**Interfaces:**
- Consumes: Task 1's polynomial module.
- Produces: `jacobianMatrix(components: Poly[]) -> Poly[][]` where entry `[i][j]` is `∂F_i/∂x_j`; `determinant(matrix: Poly[][]) -> Poly` by cofactor expansion.

The determinant must be computed **symbolically**, on polynomials, not by evaluating at sample points. Sampling could agree at every point you tried and still be wrong; the claim is that the determinant *is* a constant, which is a statement about the polynomial, not about a finite set of its values.

- [ ] **Step 1: Write the failing test**

Create `test/problems/jacobian/matrix.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { jacobianMatrix, determinant } from '../../../src/problems/jacobian/matrix.js';
import {
  polynomial, evaluate, isConstant, constantValue, isZero, totalDegree,
} from '../../../src/exact/polynomial.js';
import { parseRational, toString as rstr } from '../../../src/exact/rational.js';

const r = (s) => parseRational(s, 'test');
const term = (c, e) => ({ coeff: r(c), exponents: e });

test('the Jacobian of the identity map is the identity matrix', () => {
  const id = [
    polynomial([term('1', [1, 0])], 2),
    polynomial([term('1', [0, 1])], 2),
  ];
  const J = jacobianMatrix(id);
  assert.equal(rstr(constantValue(J[0][0])), '1');
  assert.equal(isZero(J[0][1]), true);
  assert.equal(isZero(J[1][0]), true);
  assert.equal(rstr(constantValue(J[1][1])), '1');
  assert.equal(rstr(constantValue(determinant(J))), '1');
});

test('a 2x2 determinant of non-constant entries is computed symbolically', () => {
  // [[x, y], [y, x]] -> x^2 - y^2
  const m = [
    [polynomial([term('1', [1, 0])], 2), polynomial([term('1', [0, 1])], 2)],
    [polynomial([term('1', [0, 1])], 2), polynomial([term('1', [1, 0])], 2)],
  ];
  const d = determinant(m);
  assert.equal(isConstant(d), false);
  assert.equal(totalDegree(d), 2);
  assert.equal(rstr(evaluate(d, [r('3'), r('2')])), '5');
  assert.equal(rstr(evaluate(d, [r('2'), r('2')])), '0');
});

test('a 1x1 determinant is its only entry', () => {
  const m = [[polynomial([term('5', [0])], 1)]];
  assert.equal(rstr(constantValue(determinant(m))), '5');
});

test('a 3x3 determinant expands correctly on a known matrix', () => {
  // Constant matrix [[1,2,3],[4,5,6],[7,8,10]], determinant -3.
  const c = (v) => polynomial([term(v, [0, 0, 0])], 3);
  const m = [
    [c('1'), c('2'), c('3')],
    [c('4'), c('5'), c('6')],
    [c('7'), c('8'), c('10')],
  ];
  assert.equal(rstr(constantValue(determinant(m))), '-3');
});

test('a matrix with two equal rows has zero determinant', () => {
  const c = (v) => polynomial([term(v, [0, 0, 0])], 3);
  const m = [
    [c('1'), c('2'), c('3')],
    [c('1'), c('2'), c('3')],
    [c('7'), c('8'), c('10')],
  ];
  assert.equal(isZero(determinant(m)), true);
});

test('a shear map has constant determinant 1 despite non-constant entries', () => {
  // F(x, y) = (x + y^2, y). dF1/dy = 2y is not constant, but det is.
  const F = [
    polynomial([term('1', [1, 0]), term('1', [0, 2])], 2),
    polynomial([term('1', [0, 1])], 2),
  ];
  const J = jacobianMatrix(F);
  assert.equal(isConstant(J[0][1]), false, 'the off-diagonal entry varies');
  const d = determinant(J);
  assert.equal(isConstant(d), true, 'yet the determinant is constant');
  assert.equal(rstr(constantValue(d)), '1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/problems/jacobian/matrix.test.js`
Expected: FAIL — cannot find module `../../../src/problems/jacobian/matrix.js`

- [ ] **Step 3: Write the implementation**

Create `src/problems/jacobian/matrix.js`:

```js
import { differentiate, mulP, addP, subP, polynomial } from '../../exact/polynomial.js';

// J[i][j] = d(F_i)/d(x_j)
export function jacobianMatrix(components) {
  const arity = components[0].arity;
  return components.map((component) => {
    const row = [];
    for (let j = 0; j < arity; j += 1) {
      row.push(differentiate(component, j));
    }
    return row;
  });
}

// Cofactor expansion along the first row. The determinant is computed on
// polynomials, never on sampled values: the claim is that it IS a constant,
// which is a statement about the polynomial, not about finitely many of its
// values.
export function determinant(matrix) {
  const n = matrix.length;
  if (n === 1) return matrix[0][0];

  const arity = matrix[0][0].arity;
  let total = polynomial([], arity);

  for (let j = 0; j < n; j += 1) {
    const minor = matrix.slice(1).map((row) => row.filter((_, col) => col !== j));
    const cofactor = mulP(matrix[0][j], determinant(minor));
    total = j % 2 === 0 ? addP(total, cofactor) : subP(total, cofactor);
  }

  return total;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/problems/jacobian/matrix.test.js`
Expected: PASS, 6 tests

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test
git add src/problems/jacobian/matrix.js test/problems/jacobian/matrix.test.js
git commit -m "feat: add symbolic jacobian matrix and determinant"
```

---

### Task 3: The jacobian problem module

**Files:**
- Create: `src/problems/jacobian/index.js`
- Modify: `src/harness/registry.js`
- Test: `test/problems/jacobian.test.js`

**Interfaces:**
- Consumes: Tasks 1 and 2; `VERDICT`, `SEARCH_STATE`, `decide` from `src/harness/verdict.js`; `FixtureError` from `src/harness/schema.js`.
- Produces: module exports `problem: 'jacobian'`, `conjecture: string`, `verify(fixture)`.

Fixture `data` shape:

```json
{
  "arity": 3,
  "variables": ["x", "y", "z"],
  "components": [[{ "coeff": "1", "exponents": [0, 0, 1] }], [], []],
  "determinant": "-2",
  "collision": [["0", "0", "-1/4"], ["1", "-3/2", "13/2"]]
}
```

The five checks, in order:

1. **the Jacobian determinant is constant** — the whole point; a degree-7 map's determinant could be sprawling, and every non-constant term must cancel
2. **that constant is nonzero** — a zero determinant means the map degenerates and the conjecture says nothing about it
3. **the determinant equals the declared value** — anchors the fixture to its published claim
4. **the declared points are pairwise distinct** — two copies of one point is not a collision
5. **all declared points share one image** — this is what makes the map non-invertible

Malformed data throws `FixtureError`; a well-formed claim that simply fails returns failed checks.

- [ ] **Step 1: Write the failing test**

Create `test/problems/jacobian.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { verify, problem, conjecture } from '../../src/problems/jacobian/index.js';
import { VERDICT, SEARCH_STATE } from '../../src/harness/verdict.js';
import { FixtureError } from '../../src/harness/schema.js';

// A shear map: F(x, y) = (x + y^2, y). Determinant is the constant 1, and it
// IS invertible, so it is not a counterexample -- the collision check fails.
const shear = {
  problem: 'jacobian',
  candidate: 'inline',
  claim: 'inline test',
  expect: 'REFUTED',
  source: { url: 'u', author: 'a', date: 'd', peerReviewed: false },
  data: {
    arity: 2,
    variables: ['x', 'y'],
    components: [
      [{ coeff: '1', exponents: [1, 0] }, { coeff: '1', exponents: [0, 2] }],
      [{ coeff: '1', exponents: [0, 1] }],
    ],
    determinant: '1',
    collision: [['0', '0'], ['1', '1']],
  },
};

test('the module declares its identity and carries the dimension qualifier', () => {
  assert.equal(problem, 'jacobian');
  assert.match(conjecture, /dimensions?\s*(>=|≥)\s*3/i);
  assert.match(conjecture, /two dimensions|n\s*=\s*2/i);
  assert.match(conjecture, /open/i);
});

test('an invertible map is REFUTED as a counterexample', () => {
  const result = verify(shear);
  assert.equal(result.verdict, VERDICT.REFUTED);
  const constant = result.checks.find((c) => c.name.includes('constant'));
  assert.equal(constant.pass, true, 'its determinant really is constant');
  const collide = result.checks.find((c) => c.name.includes('same image'));
  assert.equal(collide.pass, false, 'but the points do not collide');
});

test('the module performs no search and says so', () => {
  const result = verify(shear);
  assert.equal(result.requiresSearch, false);
  assert.equal(result.exhaustive, null);
  assert.equal(result.searched, null);
  assert.equal(result.searchState, SEARCH_STATE.NOT_REQUIRED);
});

test('a non-constant determinant fails the constancy check', () => {
  // F(x, y) = (x^2, y): determinant is 2x, not constant.
  const result = verify({
    ...shear,
    data: {
      ...shear.data,
      components: [
        [{ coeff: '1', exponents: [2, 0] }],
        [{ coeff: '1', exponents: [0, 1] }],
      ],
      determinant: '2',
    },
  });
  assert.equal(result.verdict, VERDICT.REFUTED);
  assert.equal(result.checks.find((c) => c.name.includes('constant')).pass, false);
});

test('a zero determinant fails the nonzero check', () => {
  // F(x, y) = (x, x): determinant is 0.
  const result = verify({
    ...shear,
    data: {
      ...shear.data,
      components: [
        [{ coeff: '1', exponents: [1, 0] }],
        [{ coeff: '1', exponents: [1, 0] }],
      ],
      determinant: '0',
    },
  });
  assert.equal(result.verdict, VERDICT.REFUTED);
  assert.equal(result.checks.find((c) => c.name.includes('nonzero')).pass, false);
});

test('a determinant disagreeing with the declared value fails', () => {
  const result = verify({ ...shear, data: { ...shear.data, determinant: '-2' } });
  assert.equal(result.verdict, VERDICT.REFUTED);
  const declared = result.checks.find((c) => c.name.includes('declared'));
  assert.equal(declared.pass, false);
  assert.equal(declared.expected, '-2');
  assert.equal(declared.actual, '1');
});

test('duplicate collision points fail the distinctness check', () => {
  const result = verify({ ...shear, data: { ...shear.data, collision: [['1', '1'], ['1', '1']] } });
  assert.equal(result.verdict, VERDICT.REFUTED);
  assert.equal(result.checks.find((c) => c.name.includes('distinct')).pass, false);
});

test('malformed data throws FixtureError, never returns a verdict', () => {
  assert.throws(() => verify({ ...shear, data: null }), FixtureError);
  assert.throws(() => verify({ ...shear, data: { ...shear.data, components: 'nope' } }), FixtureError);
  assert.throws(() => verify({ ...shear, data: { ...shear.data, arity: 5 } }), FixtureError,
    'arity disagreeing with the component count');
  assert.throws(() => verify({ ...shear, data: { ...shear.data, collision: [['1', '1']] } }), FixtureError,
    'fewer than two points is not a collision claim');
  assert.throws(() => verify({ ...shear, data: { ...shear.data, collision: [['1'], ['1', '1']] } }), FixtureError,
    'a point of the wrong arity');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/problems/jacobian.test.js`
Expected: FAIL — cannot find module `../../src/problems/jacobian/index.js`

- [ ] **Step 3: Write the implementation**

Create `src/problems/jacobian/index.js`:

```js
import { jacobianMatrix, determinant } from './matrix.js';
import {
  parsePolynomial, evaluate, isConstant, constantValue, isZero, totalDegree,
} from '../../exact/polynomial.js';
import { parseRational, cmp, toString as rstr, ZERO } from '../../exact/rational.js';
import { SEARCH_STATE, decide } from '../../harness/verdict.js';
import { FixtureError } from '../../harness/schema.js';

export const problem = 'jacobian';

export const conjecture =
  'The Jacobian conjecture (Keller, 1939): a polynomial map from n-dimensional complex ' +
  'space to itself whose Jacobian determinant is a nonzero constant must have a ' +
  'polynomial inverse. Alpoge (2026) refutes it in dimensions >= 3, exhibiting a ' +
  'degree-7 map in three variables with constant determinant -2 that sends three ' +
  'distinct points to the same image. The conjecture remains OPEN in two dimensions, ' +
  'and is trivial in one.';

function bad(message) {
  return new FixtureError(message, 'malformed');
}

function parseData(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw bad('data must be an object');
  }
  const { arity } = data;
  if (!Number.isInteger(arity) || arity < 1) {
    throw bad(`data.arity must be a positive integer, got ${JSON.stringify(arity)}`);
  }
  if (!Array.isArray(data.components) || data.components.length !== arity) {
    throw bad(`data.components must be an array of ${arity} term lists`);
  }
  let components;
  try {
    components = data.components.map((c, i) => parsePolynomial(c, arity, `data.components[${i}]`));
  } catch (error) {
    throw bad(error.message);
  }

  if (!Array.isArray(data.collision) || data.collision.length < 2) {
    throw bad('data.collision must list at least two points');
  }
  const collision = data.collision.map((point, i) => {
    if (!Array.isArray(point) || point.length !== arity) {
      throw bad(`data.collision[${i}] must be an array of ${arity} coordinates`);
    }
    try {
      return point.map((c, j) => parseRational(c, `data.collision[${i}][${j}]`));
    } catch (error) {
      throw bad(error.message);
    }
  });

  let declared;
  try {
    declared = parseRational(data.determinant, 'data.determinant');
  } catch (error) {
    throw bad(error.message);
  }

  return { arity, components, collision, declared };
}

const samePoint = (a, b) => a.every((c, i) => cmp(c, b[i]) === 0);

export function verify(fixture) {
  const { components, collision, declared } = parseData(fixture && fixture.data);

  const det = determinant(jacobianMatrix(components));
  const constant = isConstant(det);
  const value = constant ? constantValue(det) : null;

  const images = collision.map((point) => components.map((c) => evaluate(c, point)));

  let distinct = true;
  for (let i = 0; i < collision.length && distinct; i += 1) {
    for (let j = i + 1; j < collision.length; j += 1) {
      if (samePoint(collision[i], collision[j])) { distinct = false; break; }
    }
  }

  const shared = images.every((image) => samePoint(image, images[0]));

  const checks = [
    {
      name: 'the Jacobian determinant is constant',
      pass: constant,
      expected: 'a constant polynomial',
      actual: constant ? rstr(value) : `degree ${totalDegree(det)} polynomial`,
    },
    {
      name: 'the constant is nonzero',
      pass: constant && !isZero(det),
      expected: '!= 0',
      actual: constant ? rstr(value) : 'not constant',
    },
    {
      name: 'the determinant equals the declared value',
      pass: constant && cmp(value, declared) === 0,
      expected: rstr(declared),
      actual: constant ? rstr(value) : 'not constant',
    },
    {
      name: 'the collision points are pairwise distinct',
      pass: distinct,
      expected: `${collision.length} distinct points`,
      actual: distinct ? `${collision.length} distinct points` : 'a repeated point',
    },
    {
      name: 'every collision point has the same image',
      pass: shared,
      expected: `all images equal (${images[0].map(rstr).join(', ')})`,
      actual: images.map((image) => `(${image.map(rstr).join(', ')})`).join(' vs '),
    },
  ];

  return {
    checks,
    requiresSearch: false,
    exhaustive: null,
    searched: null,
    searchState: SEARCH_STATE.NOT_REQUIRED,
    verdict: decide({ checks, requiresSearch: false }),
  };
}
```

Note `ZERO` is imported but may be unused; remove it if so.

- [ ] **Step 4: Register the module**

Modify `src/harness/registry.js`, keeping `euler` and `dgg`:

```js
import * as euler from '../problems/euler/index.js';
import * as dgg from '../problems/dgg/index.js';
import * as jacobian from '../problems/jacobian/index.js';

// Problem modules register here. Each exports `problem`, `conjecture`, and
// `verify(fixture)`.
export const PROBLEMS = new Map([
  [euler.problem, euler],
  [dgg.problem, dgg],
  [jacobian.problem, jacobian],
]);
```

- [ ] **Step 5: Run the tests, then the whole suite, and commit**

```bash
node --test test/problems/jacobian.test.js
node --test
git add src/problems/jacobian/index.js src/harness/registry.js test/problems/jacobian.test.js
git commit -m "feat: add jacobian module verifying the 2026 counterexample"
```

---

### Task 4: Fixtures, anchor test, and artifact regeneration

**Files:**
- Create: `fixtures/jacobian/alpoge-2026.json`
- Create: `fixtures/jacobian/negative-perturbed-coefficient.json`
- Create: `fixtures/jacobian/negative-not-a-collision.json`
- Modify: `test/problems/jacobian.test.js` (add the anchor test)
- Modify: `results.json`, `web/results.js` (regenerated)

**Interfaces:**
- Consumes: Task 3's module.
- Produces: the fixtures the results page renders.

**The expanded map.** The published closed form, with `u = 1 + xy`, expands to the terms below. **This expansion was verified during planning against the closed form at 2187 rational points with zero mismatches** — transcribe it exactly and do not re-derive it.

```
F1 = z + 3xyz + 3x²y²z + x³y³z + 4y² + 7xy³ + 3x²y⁴
F2 = y + 3xz + 6x²yz + 3x³y²z + 12xy² + 9x²y³
F3 = 2x − 3x²y − x³z
```

- [ ] **Step 1: Write the real fixture**

Create `fixtures/jacobian/alpoge-2026.json`. Exponents are `[x, y, z]`:

```json
{
  "problem": "jacobian",
  "candidate": "alpoge-2026",
  "claim": "a degree-7 polynomial map in three variables with constant Jacobian determinant -2 that sends three distinct points to (-1/4, 0, 0), refuting the Jacobian conjecture in dimensions >= 3",
  "expect": "CONFIRMED",
  "source": {
    "url": "https://terrytao.wordpress.com/2026/07/21/a-digestion-of-the-jacobian-conjecture-counterexample/",
    "author": "Levent Alpoge with Claude Fable 5; write-up by Terence Tao",
    "date": "2026-07-21",
    "peerReviewed": false,
    "note": "Announced on social media in July 2026 and not yet refereed. The map here is the published closed form F = (u^3 z + y^2 u (4+3xy), y + 3x u^2 z + 3x y^2 (4+3xy), 2x - 3x^2 y - x^3 z) with u = 1+xy, expanded into terms; the expansion was checked against the closed form at 2187 rational points before it was committed. The conjecture remains open in two dimensions."
  },
  "data": {
    "arity": 3,
    "variables": ["x", "y", "z"],
    "components": [
      [
        { "coeff": "1", "exponents": [0, 0, 1] },
        { "coeff": "3", "exponents": [1, 1, 1] },
        { "coeff": "3", "exponents": [2, 2, 1] },
        { "coeff": "1", "exponents": [3, 3, 1] },
        { "coeff": "4", "exponents": [0, 2, 0] },
        { "coeff": "7", "exponents": [1, 3, 0] },
        { "coeff": "3", "exponents": [2, 4, 0] }
      ],
      [
        { "coeff": "1", "exponents": [0, 1, 0] },
        { "coeff": "3", "exponents": [1, 0, 1] },
        { "coeff": "6", "exponents": [2, 1, 1] },
        { "coeff": "3", "exponents": [3, 2, 1] },
        { "coeff": "12", "exponents": [1, 2, 0] },
        { "coeff": "9", "exponents": [2, 3, 0] }
      ],
      [
        { "coeff": "2", "exponents": [1, 0, 0] },
        { "coeff": "-3", "exponents": [2, 1, 0] },
        { "coeff": "-1", "exponents": [3, 0, 1] }
      ]
    ],
    "determinant": "-2",
    "collision": [
      ["0", "0", "-1/4"],
      ["1", "-3/2", "13/2"],
      ["-1", "3/2", "13/2"]
    ]
  }
}
```

- [ ] **Step 2: Write the two negative controls**

`fixtures/jacobian/negative-perturbed-coefficient.json` — the same map with the `3x²y⁴` coefficient changed from `3` to `4`, which destroys the cancellation so the determinant is no longer constant. Copy the fixture above, change that one coefficient, set `"expect": "REFUTED"`, set the candidate name, and write a `claim` saying it is a control derived from Alpoge's map with one coefficient perturbed. Keep the `source` block, with an author naming it a negative control.

`fixtures/jacobian/negative-not-a-collision.json` — the unmodified map, but with the third collision point replaced by `["1", "0", "0"]`, which does not share the image. Same treatment: `"expect": "REFUTED"`, control naming, honest source.

**If either control comes back CONFIRMED, stop and report.** Do not adjust it until it goes green — a control that passes means the check it targets is inert.

- [ ] **Step 3: Add the anchor test**

Append to `test/problems/jacobian.test.js`. This ties the committed term list to the published data, so a transcription slip in the fixture cannot pass unnoticed:

```js
import { readFile } from 'node:fs/promises';
import { parsePolynomial, evaluate } from '../../src/exact/polynomial.js';
import { parseRational, toString as rstr2 } from '../../src/exact/rational.js';

test('the committed map reproduces the published image at all three points', async () => {
  const fixture = JSON.parse(
    await readFile(new URL('../../fixtures/jacobian/alpoge-2026.json', import.meta.url), 'utf8'),
  );
  const components = fixture.data.components.map((c, i) => parsePolynomial(c, 3, `c${i}`));
  for (const point of fixture.data.collision) {
    const at = point.map((v, j) => parseRational(v, `p${j}`));
    const image = components.map((c) => rstr2(evaluate(c, at)));
    assert.deepEqual(image, ['-1/4', '0', '0'], `at (${point.join(', ')})`);
  }
});

test('the committed map has degree 7, as published', async () => {
  const fixture = JSON.parse(
    await readFile(new URL('../../fixtures/jacobian/alpoge-2026.json', import.meta.url), 'utf8'),
  );
  const degrees = fixture.data.components
    .map((c, i) => parsePolynomial(c, 3, `c${i}`))
    .map((p) => Math.max(0, ...[...p.terms.keys()].map((k) => k.split(',').reduce((a, b) => a + Number(b), 0))));
  assert.equal(Math.max(...degrees), 7);
});
```

If reaching into `p.terms` from a test reads badly, use the exported `totalDegree` instead — it is public and does the same job.

- [ ] **Step 4: Run the CLI and confirm**

```bash
node bin/verify.js --all
echo "exit: $?"
```

Expected: eleven fixtures — four euler, four dgg, three jacobian — with `alpoge-2026` CONFIRMED, both jacobian controls REFUTED, and `0 unexpected` with exit `0`.

Read `results.json` and `web/results.js` back and confirm both hold eleven rows and agree. Run `--all` twice and confirm the tree stays clean.

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test
git add fixtures/jacobian test/problems/jacobian.test.js results.json web/results.js
git commit -m "feat: add jacobian fixtures including the verified alpoge counterexample"
```

---

## Self-Review

**Spec coverage.** §5 v3 `jacobian/` — Tasks 1-3 implement the four-step procedure (sparse polynomials, formal differentiation, symbolic determinant, exact evaluation at the collision points), Task 4 supplies the data. §4 I1 — not binding; the module sets `requiresSearch: false` and `SEARCH_STATE.NOT_REQUIRED`, asserted in Task 3. §4 I2 — every fixture carries `source`; the harness enforces it. §4 I3 — malformed data throws `FixtureError` in Tasks 1, 2 and 3, asserted in Task 3. §5's reporting requirement — the `conjecture` string must carry the dimensions ≥ 3 qualifier and the open n = 2 case, asserted by a test in Task 3. **§6's sourcing risk no longer applies to this module**: the map became public in Tao's July 2026 write-up and is verified here, so unlike `rybin-2026` this fixture ships with real data.

**Placeholder scan.** No TBDs. Task 4 Step 2 describes the two controls by the exact edit to make rather than repeating the whole JSON, which is a deliberate exception to the no-"similar to Task N" rule: the controls are the real fixture with one field changed, and repeating 60 lines of term list twice would invite a divergence between them.

**Type consistency.** `polynomial(terms, arity)`, `parsePolynomial(list, arity, field)`, `evaluate(p, point)`, `differentiate(p, i)`, `isConstant`, `constantValue`, `totalDegree`, `isZero` are used with those signatures in Tasks 2 and 3. `jacobianMatrix(components) -> Poly[][]` and `determinant(matrix) -> Poly` match their Task 3 call sites. The returned verdict shape matches what `runner.js` spreads and `report.js` and `web/index.html` render, including `searchState` from the M3 contract addition.

**One note for the executor.** Adding fixtures means `results.json` must be regenerated with `node bin/verify.js --all` or `test/harness/artifact.test.js` fails. Never regenerate with a single-fixture run: it overwrites the artifact with one row, which has already shipped a broken artifact once in this project.
