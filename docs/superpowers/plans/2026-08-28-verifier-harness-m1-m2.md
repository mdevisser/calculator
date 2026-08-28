# Verifier Harness M1–M2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an exact-arithmetic verifier that confirms or refutes published mathematical counterexamples, prove it on Euler's sum of powers conjecture, and publish the verdicts to a static page.

**Architecture:** A thin exact-integer core, a harness that validates fixtures and decides verdicts, and one problem module (`euler`). Node computes and writes results; a zero-build static page renders them. Every problem module exports exactly one function, `verify(fixture) -> result`.

**Tech Stack:** Node 26 (ESM, `"type": "module"`), `node:test`, BigInt. Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-08-28-verifier-harness-design.md`

## Global Constraints

- **Zero runtime dependencies.** `node:test` and `node:assert/strict` only. No devDependencies either.
- **ESM everywhere.** `package.json` sets `"type": "module"`. Use `import`, never `require`.
- **BigInt only. No floats anywhere in a verification path.** No `Number`, `parseInt`, `parseFloat`, `Math.*` on fixture data.
- **Fixture integers are JSON strings, not JSON numbers.** JSON numbers lose precision above `2^53`; `20615673^4` is `1.8e29`. Parsing goes through `toBigIntStrict`.
- **I1** — a claim requiring exhaustive search that was not exhaustively established returns `INDETERMINATE`, never `CONFIRMED`.
- **I2** — `source` is mandatory on every fixture. A fixture without it fails validation.
- **I3** — `REFUTED` means the math says no; `ERROR` means we say no. A schema violation or internal exception must never render as `REFUTED`.
- **Commit style:** `feat:`, `fix:`, `docs:`, `test:`, `chore:`. One concern per commit.

## Two deviations from the spec, deliberate

1. **`src/exact/rational.js` is deferred to M3.** The spec lists it in M1, but Euler needs only BigInt integers — building a rational class with no consumer is speculative. M1 builds `src/exact/integer.js` instead. DGG introduces rationals when it actually needs them.
2. **The report writes `web/results.js` in addition to `results.json`.** Browsers block `fetch()` from `file://` origins, so a page that fetches JSON would not open by double-clicking — contradicting the "no build step, just open it" property. `results.js` assigns `globalThis.RESULTS`, loads via a plain `<script>` tag, and works from both `file://` and a server. `results.json` remains the canonical artifact.

---

### Task 1: Exact integer core

**Files:**
- Create: `package.json`
- Create: `src/exact/integer.js`
- Create: `.gitignore` (append)
- Test: `test/exact/integer.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `toBigIntStrict(value: string, field: string) -> bigint` (throws `TypeError`/`RangeError`); `ipow(base: bigint, exponent: bigint) -> bigint` (throws `TypeError`/`RangeError`).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "calculator",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Exact-arithmetic verification of published mathematical counterexamples",
  "scripts": {
    "test": "node --test",
    "verify": "node bin/verify.js"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `test/exact/integer.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { toBigIntStrict, ipow } from '../../src/exact/integer.js';

test('toBigIntStrict parses a decimal string', () => {
  assert.equal(toBigIntStrict('27', 'data.k'), 27n);
});

test('toBigIntStrict rejects JSON numbers, which lose precision above 2^53', () => {
  assert.throws(() => toBigIntStrict(27, 'data.k'), TypeError);
});

test('toBigIntStrict rejects zero, negatives, leading zeros, and decimals', () => {
  for (const bad of ['0', '-5', '007', '1.5', '', ' 27', '1e5']) {
    assert.throws(() => toBigIntStrict(bad, 'data.k'), RangeError, `should reject ${JSON.stringify(bad)}`);
  }
});

test('toBigIntStrict names the offending field in the message', () => {
  assert.throws(() => toBigIntStrict('0', 'data.terms[2]'), /data\.terms\[2\]/);
});

test('ipow computes exact powers', () => {
  assert.equal(ipow(2n, 10n), 1024n);
  assert.equal(ipow(144n, 5n), 61917364224n);
});

test('ipow stays exact far beyond 2^53', () => {
  // Elkies 1988. As a float this rounds and the verification would pass
  // for the wrong reason.
  assert.equal(ipow(20615673n, 4n), 180630077292169281088848499041n);
});

test('ipow rejects negative exponents and non-BigInt arguments', () => {
  assert.throws(() => ipow(2n, -1n), RangeError);
  assert.throws(() => ipow(2, 10n), TypeError);
  assert.throws(() => ipow(2n, 10), TypeError);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test test/exact/integer.test.js`
Expected: FAIL — cannot find module `../../src/exact/integer.js`

- [ ] **Step 4: Write the implementation**

Create `src/exact/integer.js`:

```js
// Fixture integers arrive as decimal strings. JSON numbers are IEEE doubles and
// lose precision above 2^53, and every verdict here turns on exact equality.

const POSITIVE_DECIMAL = /^[1-9][0-9]*$/;

export function toBigIntStrict(value, field) {
  if (typeof value !== 'string') {
    throw new TypeError(`${field}: expected a decimal string, got ${typeof value}`);
  }
  if (!POSITIVE_DECIMAL.test(value)) {
    throw new RangeError(
      `${field}: expected a positive integer with no leading zeros, got ${JSON.stringify(value)}`,
    );
  }
  return BigInt(value);
}

export function ipow(base, exponent) {
  if (typeof base !== 'bigint' || typeof exponent !== 'bigint') {
    throw new TypeError('ipow: base and exponent must both be BigInt');
  }
  if (exponent < 0n) {
    throw new RangeError('ipow: negative exponents do not yield integers');
  }
  return base ** exponent;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/exact/integer.test.js`
Expected: PASS, 7 tests

- [ ] **Step 6: Append to `.gitignore`**

```
node_modules/
```

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore src/exact/integer.js test/exact/integer.test.js
git commit -m "feat: add exact integer core with strict BigInt parsing"
```

---

### Task 2: Verdict contract and the I1 guard

**Files:**
- Create: `src/harness/verdict.js`
- Test: `test/harness/verdict.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `VERDICT` (frozen object with `CONFIRMED`, `REFUTED`, `INDETERMINATE`, `ERROR` string constants); `decide({ checks: Array<{pass: boolean}>, requiresSearch?: boolean, exhaustive?: boolean }) -> string`.

I1 lives in exactly one function so it is testable in isolation and cannot be forgotten by a problem module.

- [ ] **Step 1: Write the failing test**

Create `test/harness/verdict.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/harness/verdict.test.js`
Expected: FAIL — cannot find module `../../src/harness/verdict.js`

- [ ] **Step 3: Write the implementation**

Create `src/harness/verdict.js`:

```js
export const VERDICT = Object.freeze({
  CONFIRMED: 'CONFIRMED',
  REFUTED: 'REFUTED',
  INDETERMINATE: 'INDETERMINATE',
  ERROR: 'ERROR',
});

// I1 lives here and nowhere else: a claim whose confirmation requires
// exhausting a space is never CONFIRMED on an incomplete search. A module
// that forgets to set `exhaustive` gets INDETERMINATE, which is the safe
// direction to fail.
export function decide({ checks, requiresSearch = false, exhaustive = false }) {
  if (checks.some((check) => !check.pass)) {
    return VERDICT.REFUTED;
  }
  if (checks.length === 0) {
    return VERDICT.INDETERMINATE;
  }
  if (requiresSearch && !exhaustive) {
    return VERDICT.INDETERMINATE;
  }
  return VERDICT.CONFIRMED;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/harness/verdict.test.js`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/harness/verdict.js test/harness/verdict.test.js
git commit -m "feat: add verdict contract enforcing the exhaustiveness invariant"
```

---

### Task 3: Fixture schema validation

**Files:**
- Create: `src/harness/schema.js`
- Test: `test/harness/schema.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `FixtureError` (an `Error` subclass with a `.code` string); `validateFixture(raw: unknown) -> object` (returns the fixture unchanged, throws `FixtureError` otherwise). Codes: `malformed`, `missing-field`, `missing-source`, `bad-expect`.

Fixtures declare what verdict they expect, which makes negative controls self-checking and turns `--all` into a regression suite.

- [ ] **Step 1: Write the failing test**

Create `test/harness/schema.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFixture, FixtureError } from '../../src/harness/schema.js';

function valid(overrides = {}) {
  return {
    problem: 'euler',
    candidate: 'example',
    claim: 'a k-th power is the sum of fewer than k k-th powers',
    expect: 'CONFIRMED',
    source: {
      url: 'https://example.org/paper',
      author: 'L. J. Lander and T. R. Parkin',
      date: '1966-01-01',
      peerReviewed: true,
    },
    data: { k: '5', terms: ['27'], rhs: '144' },
    ...overrides,
  };
}

test('a well-formed fixture validates and is returned unchanged', () => {
  const fixture = valid();
  assert.equal(validateFixture(fixture), fixture);
});

test('non-objects are malformed', () => {
  for (const bad of [null, 'x', 42, []]) {
    assert.throws(() => validateFixture(bad), (e) => e instanceof FixtureError && e.code === 'malformed');
  }
});

test('missing problem, candidate, or claim is missing-field', () => {
  for (const field of ['problem', 'candidate', 'claim']) {
    const fixture = valid();
    delete fixture[field];
    assert.throws(() => validateFixture(fixture), (e) => e.code === 'missing-field', field);
  }
});

test('I2: a fixture without source is rejected', () => {
  const fixture = valid();
  delete fixture.source;
  assert.throws(() => validateFixture(fixture), (e) => e.code === 'missing-source');
});

test('I2: every source subfield is required', () => {
  for (const field of ['url', 'author', 'date', 'peerReviewed']) {
    const fixture = valid();
    delete fixture.source[field];
    assert.throws(() => validateFixture(fixture), (e) => e.code === 'missing-source', field);
  }
});

test('source.peerReviewed must be a boolean, not a string', () => {
  assert.throws(
    () => validateFixture(valid({ source: { url: 'u', author: 'a', date: 'd', peerReviewed: 'no' } })),
    (e) => e.code === 'missing-source',
  );
});

test('expect must be a real verdict name', () => {
  assert.throws(() => validateFixture(valid({ expect: 'MAYBE' })), (e) => e.code === 'bad-expect');
  assert.throws(() => validateFixture(valid({ expect: undefined })), (e) => e.code === 'bad-expect');
});

test('an unsourced fixture may omit data', () => {
  const fixture = valid({ status: 'unsourced', expect: 'INDETERMINATE' });
  delete fixture.data;
  assert.equal(validateFixture(fixture), fixture);
});

test('a sourced fixture must carry data', () => {
  const fixture = valid();
  delete fixture.data;
  assert.throws(() => validateFixture(fixture), (e) => e.code === 'missing-field');
});

test('an unknown status is malformed', () => {
  assert.throws(() => validateFixture(valid({ status: 'draft' })), (e) => e.code === 'malformed');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/harness/schema.test.js`
Expected: FAIL — cannot find module `../../src/harness/schema.js`

- [ ] **Step 3: Write the implementation**

Create `src/harness/schema.js`:

```js
import { VERDICT } from './verdict.js';

export class FixtureError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'FixtureError';
    this.code = code;
  }
}

const REQUIRED_TOP = ['problem', 'candidate', 'claim'];
const REQUIRED_SOURCE = ['url', 'author', 'date'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateFixture(raw) {
  if (!isPlainObject(raw)) {
    throw new FixtureError('fixture must be a JSON object', 'malformed');
  }

  for (const field of REQUIRED_TOP) {
    if (typeof raw[field] !== 'string' || raw[field].length === 0) {
      throw new FixtureError(`missing required field: ${field}`, 'missing-field');
    }
  }

  if (!Object.values(VERDICT).includes(raw.expect)) {
    throw new FixtureError(
      `expect must be one of ${Object.values(VERDICT).join(', ')}, got ${JSON.stringify(raw.expect)}`,
      'bad-expect',
    );
  }

  // I2: provenance is mandatory. Both headline results are unrefereed posts,
  // and a verdict shown without its source is the failure mode this prevents.
  if (!isPlainObject(raw.source)) {
    throw new FixtureError('missing required field: source', 'missing-source');
  }
  for (const field of REQUIRED_SOURCE) {
    if (typeof raw.source[field] !== 'string' || raw.source[field].length === 0) {
      throw new FixtureError(`missing required field: source.${field}`, 'missing-source');
    }
  }
  if (typeof raw.source.peerReviewed !== 'boolean') {
    throw new FixtureError('source.peerReviewed must be a boolean', 'missing-source');
  }

  if (raw.status !== undefined && raw.status !== 'unsourced') {
    throw new FixtureError(`unknown status: ${JSON.stringify(raw.status)}`, 'malformed');
  }

  if (raw.status !== 'unsourced' && !isPlainObject(raw.data)) {
    throw new FixtureError('missing required field: data', 'missing-field');
  }

  return raw;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/harness/schema.test.js`
Expected: PASS, 10 tests

- [ ] **Step 5: Commit**

```bash
git add src/harness/schema.js test/harness/schema.test.js
git commit -m "feat: add fixture schema validation with mandatory provenance"
```

---

### Task 4: The Euler problem module and its fixtures

**Files:**
- Create: `src/problems/euler/index.js`
- Create: `fixtures/euler/lander-parkin-1966.json`
- Create: `fixtures/euler/elkies-1988.json`
- Create: `fixtures/euler/negative-perturbed-term.json`
- Create: `fixtures/euler/negative-true-but-not-a-counterexample.json`
- Test: `test/problems/euler.test.js`

**Interfaces:**
- Consumes: `toBigIntStrict`, `ipow` from Task 1; `VERDICT`, `decide` from Task 2; `FixtureError` from Task 3.
- Produces: module exports `problem: 'euler'`, `conjecture: string`, and `verify(fixture) -> { checks, requiresSearch, exhaustive, searched, verdict }`.

Euler's conjecture (1769): no `k`-th power is the sum of fewer than `k` positive `k`-th powers. Verifying an exhibited counterexample needs no search, so `requiresSearch` is `false` and I1 does not bind.

- [ ] **Step 1: Write the four fixtures**

`fixtures/euler/lander-parkin-1966.json`:

```json
{
  "problem": "euler",
  "candidate": "lander-parkin-1966",
  "claim": "27^5 + 84^5 + 110^5 + 133^5 = 144^5, four fifth powers summing to a fifth power",
  "expect": "CONFIRMED",
  "source": {
    "url": "https://www.ams.org/journals/bull/1966-72-06/S0002-9904-1966-11654-3/",
    "author": "L. J. Lander and T. R. Parkin",
    "date": "1966-10-01",
    "peerReviewed": true
  },
  "data": { "k": "5", "terms": ["27", "84", "110", "133"], "rhs": "144" }
}
```

`fixtures/euler/elkies-1988.json`:

```json
{
  "problem": "euler",
  "candidate": "elkies-1988",
  "claim": "2682440^4 + 15365639^4 + 18796760^4 = 20615673^4, three fourth powers summing to a fourth power",
  "expect": "CONFIRMED",
  "source": {
    "url": "https://www.ams.org/journals/mcom/1988-51-184/S0025-5718-1988-0930224-9/",
    "author": "Noam D. Elkies",
    "date": "1988-10-01",
    "peerReviewed": true
  },
  "data": { "k": "4", "terms": ["2682440", "15365639", "18796760"], "rhs": "20615673" }
}
```

`fixtures/euler/negative-perturbed-term.json` — the Lander–Parkin identity with `27` changed to `28`. If this returns anything but `REFUTED`, the equality check is inert:

```json
{
  "problem": "euler",
  "candidate": "negative-perturbed-term",
  "claim": "control: Lander-Parkin with one term perturbed, so the identity is false",
  "expect": "REFUTED",
  "source": {
    "url": "https://www.ams.org/journals/bull/1966-72-06/S0002-9904-1966-11654-3/",
    "author": "negative control, derived from Lander and Parkin 1966",
    "date": "2026-08-28",
    "peerReviewed": false
  },
  "data": { "k": "5", "terms": ["28", "84", "110", "133"], "rhs": "144" }
}
```

`fixtures/euler/negative-true-but-not-a-counterexample.json` — `3^3 + 4^3 + 5^3 = 6^3` is a true identity, but it uses `k` terms rather than fewer than `k`, so it does not contradict the conjecture. This control catches a verifier that checks only the arithmetic:

```json
{
  "problem": "euler",
  "candidate": "negative-true-but-not-a-counterexample",
  "claim": "control: 3^3 + 4^3 + 5^3 = 6^3 is true but uses k terms, not fewer than k",
  "expect": "REFUTED",
  "source": {
    "url": "https://en.wikipedia.org/wiki/Euler%27s_sum_of_powers_conjecture",
    "author": "negative control, classical identity",
    "date": "2026-08-28",
    "peerReviewed": false
  },
  "data": { "k": "3", "terms": ["3", "4", "5"], "rhs": "6" }
}
```

- [ ] **Step 2: Write the failing test**

Create `test/problems/euler.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verify, problem } from '../../src/problems/euler/index.js';
import { VERDICT } from '../../src/harness/verdict.js';
import { FixtureError } from '../../src/harness/schema.js';

const load = async (name) =>
  JSON.parse(await readFile(new URL(`../../fixtures/euler/${name}.json`, import.meta.url), 'utf8'));

test('the module declares its problem name', () => {
  assert.equal(problem, 'euler');
});

test('Lander-Parkin 1966 is confirmed', async () => {
  const result = verify(await load('lander-parkin-1966'));
  assert.equal(result.verdict, VERDICT.CONFIRMED);
  assert.ok(result.checks.every((c) => c.pass));
});

test('Elkies 1988 is confirmed, exactly, past 2^53', async () => {
  const result = verify(await load('elkies-1988'));
  assert.equal(result.verdict, VERDICT.CONFIRMED);
  const equality = result.checks.find((c) => c.name.includes('equals'));
  assert.equal(equality.actual, '180630077292169281088848499041');
});

test('a perturbed term is refuted', async () => {
  const result = verify(await load('negative-perturbed-term'));
  assert.equal(result.verdict, VERDICT.REFUTED);
});

test('a true identity using k terms is refuted, not confirmed', async () => {
  const result = verify(await load('negative-true-but-not-a-counterexample'));
  assert.equal(result.verdict, VERDICT.REFUTED);
  const arithmetic = result.checks.find((c) => c.name.includes('equals'));
  const count = result.checks.find((c) => c.name.includes('fewer than'));
  assert.equal(arithmetic.pass, true, 'the arithmetic is genuinely correct');
  assert.equal(count.pass, false, 'but it uses k terms, so it is not a counterexample');
});

test('verification requires no search, so I1 does not bind', async () => {
  const result = verify(await load('lander-parkin-1966'));
  assert.equal(result.requiresSearch, false);
});

test('an exponent below 3 is refuted, since the conjecture starts at k = 3', async () => {
  const fixture = await load('lander-parkin-1966');
  const result = verify({ ...fixture, data: { k: '2', terms: ['3', '4'], rhs: '5' } });
  assert.equal(result.verdict, VERDICT.REFUTED);
});

test('malformed data throws FixtureError rather than returning a verdict', async () => {
  const fixture = await load('lander-parkin-1966');
  assert.throws(() => verify({ ...fixture, data: { k: '5', terms: 'not-an-array', rhs: '144' } }), FixtureError);
  assert.throws(() => verify({ ...fixture, data: { k: '5', terms: [], rhs: '144' } }), FixtureError);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test test/problems/euler.test.js`
Expected: FAIL — cannot find module `../../src/problems/euler/index.js`

- [ ] **Step 4: Write the implementation**

Create `src/problems/euler/index.js`:

```js
import { toBigIntStrict, ipow } from '../../exact/integer.js';
import { VERDICT, decide } from '../../harness/verdict.js';
import { FixtureError } from '../../harness/schema.js';

export const problem = 'euler';

export const conjecture =
  "Euler's sum of powers conjecture (1769): for k > 2, no k-th power is the sum of " +
  'fewer than k positive k-th powers. Disproved for k = 5 by Lander and Parkin (1966) ' +
  'and for k = 4 by Elkies (1988).';

export function verify(fixture) {
  const { k: kRaw, terms: termsRaw, rhs: rhsRaw } = fixture.data;

  if (!Array.isArray(termsRaw) || termsRaw.length === 0) {
    throw new FixtureError('data.terms must be a non-empty array', 'malformed');
  }

  const k = toBigIntStrict(kRaw, 'data.k');
  const terms = termsRaw.map((term, i) => toBigIntStrict(term, `data.terms[${i}]`));
  const rhs = toBigIntStrict(rhsRaw, 'data.rhs');

  const lhs = terms.reduce((total, term) => total + ipow(term, k), 0n);
  const target = ipow(rhs, k);

  const checks = [
    {
      name: 'exponent is at least 3',
      pass: k >= 3n,
      expected: 'k >= 3',
      actual: `k = ${k}`,
    },
    {
      name: 'uses fewer than k terms',
      pass: BigInt(terms.length) < k,
      expected: `at most ${k - 1n} terms`,
      actual: `${terms.length} terms`,
    },
    {
      name: 'sum of k-th powers equals the k-th power',
      pass: lhs === target,
      expected: target.toString(),
      actual: lhs.toString(),
    },
  ];

  return {
    checks,
    requiresSearch: false,
    exhaustive: null,
    searched: null,
    verdict: decide({ checks, requiresSearch: false }),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/problems/euler.test.js`
Expected: PASS, 8 tests

- [ ] **Step 6: Commit**

```bash
git add src/problems/euler test/problems/euler.test.js fixtures/euler
git commit -m "feat: add euler problem module with two results and two negative controls"
```

---

### Task 5: Registry and runner

**Files:**
- Create: `src/harness/registry.js`
- Create: `src/harness/runner.js`
- Test: `test/harness/runner.test.js`

**Interfaces:**
- Consumes: `validateFixture`, `FixtureError` (Task 3); `VERDICT` (Task 2); the euler module (Task 4).
- Produces: `PROBLEMS: Map<string, module>`; `runFixture(raw: unknown, fixtureName: string) -> Verdict`; `loadFixtureFiles(dir: string) -> Promise<Array<{name, raw}>>`; `runAll(dir: string) -> Promise<Verdict[]>`.

The runner is where I3 is enforced: every exception becomes `ERROR` with a reason code, never `REFUTED`.

- [ ] **Step 1: Write the failing test**

Create `test/harness/runner.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runFixture, runAll } from '../../src/harness/runner.js';
import { VERDICT } from '../../src/harness/verdict.js';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/harness/runner.test.js`
Expected: FAIL — cannot find module `../../src/harness/runner.js`

- [ ] **Step 3: Write the registry**

Create `src/harness/registry.js`:

```js
import * as euler from '../problems/euler/index.js';

// Problem modules register here. Each exports `problem`, `conjecture`, and
// `verify(fixture)`.
export const PROBLEMS = new Map([[euler.problem, euler]]);
```

- [ ] **Step 4: Write the runner**

Create `src/harness/runner.js`:

```js
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateFixture, FixtureError } from './schema.js';
import { VERDICT } from './verdict.js';
import { PROBLEMS } from './registry.js';

function millisSince(startNs) {
  return Number(process.hrtime.bigint() - startNs) / 1e6;
}

function finish(result) {
  return { ...result, asExpected: result.verdict === result.expect };
}

export function runFixture(raw, fixtureName) {
  const started = process.hrtime.bigint();
  const shell = {
    fixture: fixtureName,
    problem: typeof raw?.problem === 'string' ? raw.problem : null,
    candidate: typeof raw?.candidate === 'string' ? raw.candidate : null,
    claim: typeof raw?.claim === 'string' ? raw.claim : null,
    expect: typeof raw?.expect === 'string' ? raw.expect : null,
    source: raw?.source ?? null,
    checks: [],
    requiresSearch: null,
    exhaustive: null,
    searched: null,
  };

  try {
    const fixture = validateFixture(raw);

    const module = PROBLEMS.get(fixture.problem);
    if (!module) {
      throw new FixtureError(`unknown problem: ${fixture.problem}`, 'unknown-problem');
    }

    if (fixture.status === 'unsourced') {
      return finish({
        ...shell,
        verdict: VERDICT.INDETERMINATE,
        reason: 'missing-source-data',
        elapsedMs: millisSince(started),
      });
    }

    const result = module.verify(fixture);
    return finish({
      ...shell,
      ...result,
      conjecture: module.conjecture,
      elapsedMs: millisSince(started),
    });
  } catch (error) {
    // I3: our failure is ERROR. Reporting it as REFUTED would present a bug
    // in this code as a mathematical finding.
    return finish({
      ...shell,
      verdict: VERDICT.ERROR,
      reason: error instanceof FixtureError ? error.code : 'internal-error',
      message: error.message,
      elapsedMs: millisSince(started),
    });
  }
}

export async function loadFixtureFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name))
    .sort();

  return Promise.all(
    files.map(async (file) => ({
      name: path.relative(dir, file).replace(/\.json$/, ''),
      raw: JSON.parse(await readFile(file, 'utf8')),
    })),
  );
}

export async function runAll(dir) {
  const loaded = await loadFixtureFiles(dir);
  return loaded.map(({ name, raw }) => runFixture(raw, name));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/harness/runner.test.js`
Expected: PASS, 7 tests

- [ ] **Step 6: Run the whole suite**

Run: `node --test`
Expected: PASS, 31 tests across four files

- [ ] **Step 7: Commit**

```bash
git add src/harness/registry.js src/harness/runner.js test/harness/runner.test.js
git commit -m "feat: add fixture runner mapping failures to ERROR rather than REFUTED"
```

---

### Task 6: Report writer and CLI

**Files:**
- Create: `src/harness/report.js`
- Create: `bin/verify.js`
- Test: `test/harness/report.test.js`

**Interfaces:**
- Consumes: `runFixture`, `runAll`, `loadFixtureFiles` (Task 5); `VERDICT` (Task 2).
- Produces: `buildReport(results) -> { generatedAt, tally, results }`; `formatTerminal(report) -> string`; `writeReport(report, { jsonPath, jsPath }) -> Promise<void>`.

The CLI exits non-zero when any result fails to match its declared `expect`, which makes `node bin/verify.js --all` a regression suite. A `REFUTED` negative control is a pass, not a failure.

- [ ] **Step 1: Write the failing test**

Create `test/harness/report.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildReport, formatTerminal, writeReport } from '../../src/harness/report.js';

const results = [
  { fixture: 'euler/a', problem: 'euler', verdict: 'CONFIRMED', expect: 'CONFIRMED', asExpected: true, checks: [], elapsedMs: 1 },
  { fixture: 'euler/b', problem: 'euler', verdict: 'REFUTED', expect: 'REFUTED', asExpected: true, checks: [], elapsedMs: 1 },
  { fixture: 'euler/c', problem: 'euler', verdict: 'ERROR', expect: 'CONFIRMED', asExpected: false, reason: 'malformed', checks: [], elapsedMs: 1 },
];

test('buildReport tallies verdicts and counts surprises', () => {
  const report = buildReport(results);
  assert.equal(report.tally.CONFIRMED, 1);
  assert.equal(report.tally.REFUTED, 1);
  assert.equal(report.tally.ERROR, 1);
  assert.equal(report.tally.INDETERMINATE, 0);
  assert.equal(report.unexpected, 1);
  assert.ok(report.generatedAt.endsWith('Z'));
});

test('formatTerminal marks the surprise and names its reason', () => {
  const text = formatTerminal(buildReport(results));
  assert.match(text, /euler\/c/);
  assert.match(text, /malformed/);
  assert.match(text, /1 unexpected/);
});

test('writeReport emits canonical JSON and a file-protocol-safe script', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'verify-'));
  const jsonPath = path.join(dir, 'results.json');
  const jsPath = path.join(dir, 'results.js');
  const report = buildReport(results);

  await writeReport(report, { jsonPath, jsPath });

  const json = JSON.parse(await readFile(jsonPath, 'utf8'));
  assert.equal(json.tally.CONFIRMED, 1);

  const js = await readFile(jsPath, 'utf8');
  assert.ok(js.startsWith('globalThis.RESULTS = '), 'must load via a plain script tag from file://');
  assert.ok(js.trimEnd().endsWith(';'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/harness/report.test.js`
Expected: FAIL — cannot find module `../../src/harness/report.js`

- [ ] **Step 3: Write the report module**

Create `src/harness/report.js`:

```js
import { writeFile } from 'node:fs/promises';
import { VERDICT } from './verdict.js';

const GLYPH = {
  CONFIRMED: 'PASS',
  REFUTED: 'FAIL',
  INDETERMINATE: '????',
  ERROR: 'ERR ',
};

export function buildReport(results) {
  const tally = Object.fromEntries(Object.values(VERDICT).map((v) => [v, 0]));
  for (const result of results) {
    tally[result.verdict] += 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    tally,
    unexpected: results.filter((r) => !r.asExpected).length,
    results,
  };
}

export function formatTerminal(report) {
  const lines = [];
  for (const result of report.results) {
    const flag = result.asExpected ? ' ' : '<';
    const detail = result.reason ? `  (${result.reason})` : '';
    lines.push(
      `  ${GLYPH[result.verdict]} ${flag} ${result.fixture.padEnd(48)} ${result.verdict}${detail}`,
    );
    for (const check of result.checks) {
      lines.push(
        `           ${check.pass ? 'ok  ' : 'FAIL'} ${check.name}` +
          (check.pass ? '' : `\n                expected ${check.expected}\n                actual   ${check.actual}`),
      );
    }
  }
  const counts = Object.entries(report.tally)
    .filter(([, n]) => n > 0)
    .map(([verdict, n]) => `${n} ${verdict.toLowerCase()}`)
    .join(', ');
  lines.push('');
  lines.push(`  ${counts} — ${report.unexpected} unexpected`);
  return lines.join('\n');
}

export async function writeReport(report, { jsonPath, jsPath }) {
  const json = JSON.stringify(report, null, 2);
  await writeFile(jsonPath, `${json}\n`, 'utf8');
  // Browsers block fetch() from file:// origins. A script assignment keeps the
  // page openable by double-clicking, with no server and no build step.
  await writeFile(jsPath, `globalThis.RESULTS = ${json};\n`, 'utf8');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/harness/report.test.js`
Expected: PASS, 3 tests

- [ ] **Step 5: Write the CLI**

Create `bin/verify.js`:

```js
#!/usr/bin/env node
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runAll, runFixture } from '../src/harness/runner.js';
import { buildReport, formatTerminal, writeReport } from '../src/harness/report.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FIXTURES = path.join(ROOT, 'fixtures');

const USAGE = `usage:
  node bin/verify.js --all              verify every fixture
  node bin/verify.js <problem>/<name>   verify one fixture
`;

async function main(argv) {
  const target = argv[0];

  if (!target || target === '--help' || target === '-h') {
    process.stdout.write(USAGE);
    return 0;
  }

  const results =
    target === '--all'
      ? await runAll(FIXTURES)
      : [
          runFixture(
            JSON.parse(await readFile(path.join(FIXTURES, `${target}.json`), 'utf8')),
            target,
          ),
        ];

  const report = buildReport(results);
  process.stdout.write(`${formatTerminal(report)}\n`);

  await writeReport(report, {
    jsonPath: path.join(ROOT, 'results.json'),
    jsPath: path.join(ROOT, 'web', 'results.js'),
  });

  // A REFUTED negative control is a pass. Only a mismatch against the
  // fixture's declared expectation is a failure.
  return report.unexpected === 0 ? 0 : 1;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error) => {
    process.stderr.write(`${error.stack}\n`);
    process.exit(2);
  },
);
```

- [ ] **Step 6: Create the `web/` directory and run the CLI end to end**

```bash
mkdir -p web
node bin/verify.js --all
echo "exit: $?"
```

Expected: four fixtures listed, `2 confirmed, 2 refuted — 0 unexpected`, exit `0`, and both `results.json` and `web/results.js` written.

- [ ] **Step 7: Commit**

```bash
git add src/harness/report.js bin/verify.js test/harness/report.test.js results.json web/results.js
git commit -m "feat: add report writer and verify CLI"
```

---

### Task 7: Web results page (M2)

**Files:**
- Create: `web/index.html`
- Move: `index.html` -> `web/calculator.html`
- Modify: `CLAUDE.md` (the Development section's paths)
- Test: manual, plus `test/web/results-contract.test.js`

**Interfaces:**
- Consumes: `globalThis.RESULTS` as written by `writeReport` (Task 6) — `{ generatedAt, tally, unexpected, results[] }`, each result carrying `fixture, problem, candidate, claim, conjecture, verdict, expect, asExpected, checks[], requiresSearch, exhaustive, searched, source, elapsedMs, reason?`.
- Produces: nothing consumed by later tasks.

Layout follows the approved study: dossier shell per problem, ledger rows per candidate, certificate trace behind a `<details>` disclosure. I2 is a rendering rule here — no verdict renders without its provenance and exhaustiveness state.

- [ ] **Step 1: Write the failing contract test**

This guards the coupling between the writer and the page. Create `test/web/results-contract.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runAll } from '../../src/harness/runner.js';

const FIXTURES = fileURLToPath(new URL('../../fixtures', import.meta.url));

test('every result carries the fields the page renders', async () => {
  const results = await runAll(FIXTURES);
  for (const result of results) {
    for (const field of ['fixture', 'problem', 'candidate', 'claim', 'verdict', 'expect', 'asExpected', 'checks', 'source']) {
      assert.ok(field in result, `${result.fixture} is missing ${field}`);
    }
    // I2 as a rendering precondition.
    assert.ok(result.source && result.source.url, `${result.fixture} has no source url`);
    assert.equal(typeof result.source.peerReviewed, 'boolean');
  }
});

test('the page loads results by script assignment, not fetch', async () => {
  const html = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
  assert.match(html, /<script src="\.\/results\.js"><\/script>/);
  assert.doesNotMatch(html, /fetch\(/, 'fetch() is blocked from file:// origins');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/web/results-contract.test.js`
Expected: FAIL — `web/index.html` does not exist

- [ ] **Step 3: Move the calculator**

```bash
git mv index.html web/calculator.html
```

- [ ] **Step 4: Write the results page**

Create `web/index.html`. It groups results by problem, renders one dossier panel per problem, ledger rows per candidate, and a `<details>` trace per row.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Counterexample Verifier</title>
<style>
  :root {
    --paper:#eceff5; --surface:#fff; --rule:#d0d6e2; --ink:#131720; --ink-2:#4b5364;
    --ink-3:#7b8496; --accent:#23407a; --ok:#1b6152; --ok-bg:#d3e7e1;
    --bad:#8d3123; --bad-bg:#f2ddd8; --warn:#7a590f; --warn-bg:#eee4cb;
    --mono: ui-monospace, "SF Mono", Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --paper:#0e1117; --surface:#161a23; --rule:#2a3040; --ink:#e5e9f1; --ink-2:#a3abbb;
      --ink-3:#737c8d; --accent:#92b2e9; --ok:#6dc1a6; --ok-bg:#12302a;
      --bad:#e18d7e; --bad-bg:#331915; --warn:#d6b063; --warn-bg:#2c2511;
    }
  }
  * { box-sizing:border-box; }
  body {
    margin:0; background:var(--paper); color:var(--ink);
    font:16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .wrap { max-width:60rem; margin:0 auto; padding:3rem 1.25rem 5rem; }
  h1 { font-size:2rem; margin:0 0 .5rem; letter-spacing:-.02em; }
  .sub { color:var(--ink-2); margin:0 0 2.5rem; }
  .sub a { color:var(--accent); }
  .panel {
    background:var(--surface); border:1px solid var(--rule); border-radius:3px;
    padding:1.5rem; margin-bottom:1.5rem;
  }
  .panel h2 { font-size:1.25rem; margin:0 0 .5rem; }
  .conjecture {
    color:var(--ink-2); border-left:2px solid var(--accent); padding-left:1rem;
    margin:0 0 1.25rem; max-width:62ch;
  }
  table { width:100%; border-collapse:collapse; font-size:.875rem; }
  th {
    text-align:left; font:500 .625rem/1.6 var(--mono); letter-spacing:.12em;
    text-transform:uppercase; color:var(--ink-3); padding:0 .75rem .5rem 0;
    border-bottom:1px solid var(--rule);
  }
  td { padding:.625rem .75rem .625rem 0; border-bottom:1px solid var(--rule); vertical-align:top; }
  .cand { font-family:var(--mono); font-size:.8125rem; }
  .chip {
    display:inline-block; font:600 .6875rem/1.6 var(--mono); letter-spacing:.08em;
    padding:.125rem .5rem; border-radius:2px; white-space:nowrap;
  }
  .CONFIRMED { background:var(--ok-bg); color:var(--ok); }
  .REFUTED { background:var(--bad-bg); color:var(--bad); }
  .INDETERMINATE, .ERROR { background:var(--warn-bg); color:var(--warn); }
  .prov { font-size:.75rem; color:var(--ink-3); }
  .prov a { color:var(--accent); }
  .unrefereed { color:var(--warn); font-weight:600; }
  .surprise { color:var(--bad); font-weight:600; }
  details { margin-top:.5rem; }
  summary { cursor:pointer; font-size:.75rem; color:var(--ink-3); }
  summary:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  pre {
    font-family:var(--mono); font-size:.75rem; background:var(--paper);
    padding:.75rem; border-radius:2px; overflow-x:auto; margin:.5rem 0 0;
  }
  .empty { color:var(--ink-3); }
  footer { margin-top:3rem; font-size:.8125rem; color:var(--ink-3); }
  footer a { color:var(--accent); }
</style>
</head>
<body>
<div class="wrap">
  <h1>Counterexample Verifier</h1>
  <p class="sub" id="summary"></p>
  <div id="panels"></div>
  <footer>
    Exact BigInt arithmetic, no floating point. Verdicts are recomputed by
    <code>node bin/verify.js --all</code>.
    &middot; <a href="./calculator.html">calculator</a>
  </footer>
</div>
<script src="./results.js"></script>
<script>
  const report = globalThis.RESULTS;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const summary = document.getElementById('summary');
  if (!report) {
    summary.textContent = 'No results yet. Run: node bin/verify.js --all';
  } else {
    const counts = Object.entries(report.tally)
      .filter(([, n]) => n > 0)
      .map(([v, n]) => n + ' ' + v.toLowerCase())
      .join(', ');
    summary.textContent = counts + ' · generated ' + report.generatedAt;
    if (report.unexpected > 0) {
      summary.appendChild(el('span', 'surprise', ' · ' + report.unexpected + ' unexpected'));
    }

    const byProblem = new Map();
    for (const r of report.results) {
      if (!byProblem.has(r.problem)) byProblem.set(r.problem, []);
      byProblem.get(r.problem).push(r);
    }

    const panels = document.getElementById('panels');
    for (const [problem, rows] of byProblem) {
      const panel = el('div', 'panel');
      panel.appendChild(el('h2', null, problem));
      const conj = rows.find((r) => r.conjecture);
      if (conj) panel.appendChild(el('p', 'conjecture', conj.conjecture));

      const table = el('table');
      const head = el('tr');
      for (const label of ['Candidate', 'Verdict', 'Exhaustive', 'Provenance']) {
        head.appendChild(el('th', null, label));
      }
      table.appendChild(head);

      for (const r of rows) {
        const tr = el('tr');

        const cand = el('td', 'cand');
        cand.appendChild(el('div', null, r.candidate));
        if (r.claim) cand.appendChild(el('div', 'prov', r.claim));

        const details = el('details');
        details.appendChild(el('summary', null, 'trace'));
        const lines = (r.checks || []).map(
          (c) => (c.pass ? '  ok   ' : '  FAIL ') + c.name +
            (c.pass ? '' : '\n         expected ' + c.expected + '\n         actual   ' + c.actual),
        );
        if (r.reason) lines.push('  reason: ' + r.reason);
        if (r.searched !== null && r.searched !== undefined) lines.push('  searched: ' + r.searched);
        lines.push('  elapsed: ' + r.elapsedMs.toFixed(2) + ' ms');
        details.appendChild(el('pre', null, lines.join('\n')));
        cand.appendChild(details);
        tr.appendChild(cand);

        const verdict = el('td');
        verdict.appendChild(el('span', 'chip ' + r.verdict, r.verdict));
        if (!r.asExpected) {
          verdict.appendChild(el('div', 'surprise', 'expected ' + r.expect));
        }
        tr.appendChild(verdict);

        // I2: exhaustiveness state is never omitted.
        const exh = el('td', 'prov');
        exh.textContent = r.requiresSearch === false
          ? 'not required'
          : r.exhaustive === true
            ? 'yes (' + r.searched + ' searched)'
            : 'NO — verdict capped at indeterminate';
        tr.appendChild(exh);

        // I2: provenance is never omitted.
        const prov = el('td', 'prov');
        if (r.source) {
          if (!r.source.peerReviewed) {
            prov.appendChild(el('div', 'unrefereed', 'not peer reviewed'));
          }
          prov.appendChild(el('div', null, r.source.author));
          const a = el('a', null, r.source.date);
          a.href = r.source.url;
          a.rel = 'noreferrer';
          prov.appendChild(a);
        } else {
          prov.appendChild(el('span', 'empty', 'none'));
        }
        tr.appendChild(prov);

        table.appendChild(tr);
      }
      panel.appendChild(table);
      panels.appendChild(panel);
    }
  }
</script>
</body>
</html>
```

- [ ] **Step 5: Run the contract test**

Run: `node --test test/web/results-contract.test.js`
Expected: PASS, 2 tests

- [ ] **Step 6: Regenerate results and open the page**

```bash
node bin/verify.js --all
open web/index.html
```

Expected: four rows under one `euler` panel — two `CONFIRMED`, two `REFUTED`, none marked unexpected. Each row shows provenance and an exhaustiveness cell reading "not required". The trace disclosure expands. The calculator link works.

- [ ] **Step 7: Update `CLAUDE.md` development paths**

Replace the Development section's server line so it points at the moved page:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000/web/
open web/index.html           # or just open it; no server needed
```

- [ ] **Step 8: Run the full suite**

Run: `node --test`
Expected: PASS, 36 tests across six files

- [ ] **Step 9: Commit**

```bash
git add web CLAUDE.md test/web results.json
git commit -m "feat: add results page and relocate calculator to web/"
```

---

## Self-Review

**Spec coverage.** §3 architecture — Tasks 1–6. §4 verdict contract and I1 — Task 2; I2 — Task 3; I3 — Task 5. §5 euler module and both fixtures — Task 4. §6 unsourced handling — Task 5, Step 4. §7 error handling — Task 5. §8 testing: exact-arithmetic units (Task 1), negative fixtures (Task 4), property test — **deferred to M3**, since it concerns the DGG enumerator which does not exist yet; budget test — **deferred to M3**, same reason. §9 web page — Task 7. §10 M1 and M2 — all tasks. Both deferrals are M3 scope by construction, not gaps in this plan.

**Placeholder scan.** No TBDs, no "add error handling", no "similar to Task N". Every code step carries real code.

**Type consistency.** `toBigIntStrict(value, field)` and `ipow(base, exponent)` are used with those signatures in Task 4. `decide({checks, requiresSearch, exhaustive})` matches Task 2's definition at its Task 4 call site. `FixtureError.code` values (`malformed`, `missing-field`, `missing-source`, `bad-expect`, plus `unknown-problem` raised by the runner) are asserted consistently in Tasks 3 and 5. The result shape produced by `runFixture` matches the fields `formatTerminal` reads (Task 6) and the page renders (Task 7), and Task 7's contract test asserts exactly that coupling.

One note for the executor: Task 5's `loadFixtureFiles` uses `readdir(..., { recursive: true })` and reads `entry.parentPath` with an `entry.path` fallback — `parentPath` replaced `path` in Node 21. Both are present in Node 26; the fallback keeps it working on Node 20.
