# Learning Workbench P3: Jacobian Lesson and `jacobian/` Module. Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make path step 2 (the Jacobian conjecture, dimension ≥ 3) a clickable lesson
that is checked here: the repo's own exact verifier confirms the real July 2026 map
(Jacobian determinant identically −2, three different points with the same image),
and the page lets Michael try any point himself.

**Architecture:** A new problem module `src/problems/jacobian/` (old spec §5 v3:
sparse exact polynomials, formal derivatives, symbolic 3×3 determinant, collision
check) registered in the harness, with the real fixture plus negative controls. The
lesson page gets a classic-script exact checker (`web/lessons/jacobian-check.js`,
BigInt rationals, dual numbers for the stretch factor), tested in Node against the
`src/` module. Facts come from a committed source dossier first, as in P4.

**Tech Stack:** Node ≥ 20, `node:test`, BigInt, vanilla HTML/CSS/JS. Zero runtime
dependencies. WebSearch/WebFetch and `gh api` for sourcing (Task 1).

**Spec:** `docs/superpowers/specs/2026-11-04-learning-workbench-design.md` (§3, §5,
§6.2, §7 Jacobian) and `docs/superpowers/specs/2026-08-28-verifier-harness-design.md`
(§3, §4, §5 v3, §6, §7).

**Scope:** Plan 3 of 4, built last (P4 shipped first at Michael's request). All work
is committed directly on `main`: Michael wants no branches.

## Global Constraints

- **Reporting accuracy:** the counterexample refutes the conjecture in **dimension ≥ 3
  only**; the two-dimensional (planar) case is open. The qualifier appears in the
  lesson title, the page's first paragraph, the module's `conjecture` text, and the
  fixture `claim`. Never a bare "Jacobian conjecture: REFUTED".
- I1–I3 unchanged. A malformed fixture (bad polynomial text, wrong arity, bad
  number) is `ERROR` with code `malformed`, never `REFUTED`.
- `src/` is exact: BigInt and `Rational` only, no `Number` arithmetic on values.
  The browser checker is exact too (BigInt). No floats anywhere in this plan.
- Fixture numbers are strings; points use `parseRational` syntax (`"-3/2"`).
- Story layout section ids, in order: `trust`, `question`, `found`, `check`,
  `key-idea`, `why`, `open`, `sources`. `#key-idea` ships with
  `data-pending="session"` and "We'll work this out together in a session."
- Facts and the trust label come only from `docs/sources/jacobian.md`, which marks
  each fact **P** (primary) or **S** (secondary).
- No `fetch(`, no `type="module"`, no `innerHTML`; DOM text via `textContent`.
- The browser checker never shows ✅/❌ and never says "counterexample" about a
  user's input; bad input gets a plain-words message, never a result.
- Plain words first; every symbol explained with a number example the first time.
- Commit on `main`, one concern per commit; do not push (Michael asks for pushes).

## Rulings made in this plan (builder's calls)

- **The real map, not a stand-in.** The spec scoped this milestone for a synthetic
  stand-in in case the map couldn't be sourced. It can: the Isabelle AFP entry
  *Formal Verification of an Explicit Counterexample to the Jacobian Conjecture*
  (Freitas Ramos, Hulak, de Queiroz, 20 July 2026,
  https://isa-afp.org/entries/Jacobian_Counterexample.html) writes out Alpöge's map
  and three colliding points. Its theory file says it encodes "the following
  three-coordinate polynomial map" Alpöge announced. So `jacobian/alpoge-2026` is
  real and the lesson gets "Checked here". The X post itself is likely unreadable to
  automated fetching; the fixture `source.note` says so. Cost if wrong: one fixture
  transcription, cross-checked in Task 1 against a second independent repository.
- **Fixture polynomials are expression strings**, copied verbatim from the AFP
  `eval_alpoge_map` lemma, and parsed by `polynomial.js`, not hand-expanded term
  lists. Verbatim text is far less error-prone to transcribe and to audit. Grammar:
  integers, the fixture's variable names, `+ - *`, `^` with a whole-number exponent
  0–20, parentheses, unary minus. No `/`, no implicit multiplication. Cost if wrong:
  a later fixture with fractional coefficients needs `/` added.
- **Expected label: Computer-checked proof**, not the spec's provisional "Experts say
  correct": independent Isabelle and Lean checks exist (spec §5: "a Lean (or similar)
  formalization exists"). Task 1 confirms it against the AFP entry and at least one
  Lean repository; if they don't hold the full claim (determinant identically −2
  and the collision), fall back to the label the dossier supports.
- **The page checker hard-codes the map strings** (classic scripts can't import
  `src/` or read fixtures from file://) and a test pins them to the fixture text and
  its values to the `src/` module. Its stretch factor is computed with exact dual
  numbers, not by expanding the determinant polynomial in the browser.
- **The synthetic control is the "fold"** `(x², y, z)`: hand-checkable collision
  `(1,0,0)` and `(−1,0,0)` → `(1,0,0)`, determinant `2x` not constant, so `REFUTED`. A
  synthetic `CONFIRMED` toy can't exist: any Keller map with a collision *is* a
  counterexample.

## Review Focus

1. A point pasted from the page with a typographic minus (`−3/2`, U+2212) or spaces
   (`-3 / 2`) is accepted by the browser checker: Task 4 tests it.
2. Browser input `0.5`, `1/0`, `abc`, `1e5`, empty, or a 31-digit number gives a
   plain-words message, no result and no throw: Task 4 tests each.
3. Fixture polynomial text `2x`, `x^-1`, `x^21`, `w` (unknown variable), `x^1.5`,
   `(x + y` → `FixtureError('malformed')` and an `ERROR` verdict through the runner,
   never `REFUTED`: Task 2 tests the parser, Task 3 the runner path.
4. The check ledger's Jacobian panel never reads as a bare refutation: the module's
   `conjecture` text carries "dimension 3" and "two-dimensional … open": Task 3 tests
   it.
5. A non-constant determinant reports `degree d, n terms`, not the whole polynomial,
   so the ledger trace stays readable: Task 3 asserts `actual.length < 80` on the
   changed-coefficient control.

---

### Task 1: Source dossier and lesson metadata

**Files:**
- Create: `docs/sources/jacobian.md`
- Modify: `web/lessons.js` (jacobian entry: `announced`, `claimants`, `label`,
  `confirmed`, `sources`; `available` stays `false`)
- Test: `test/web/lessons.test.js`

**Interfaces:**
- Produces: the dossier every later task copies facts from, including the verbatim
  map strings and points (Task 3) and the label (Task 5).

- [ ] **Step 1: Research and write the dossier.** Same shape as
  `docs/sources/sendov.md`: claim in one sentence; who and when; the map (three
  components verbatim from AFP `eval_alpoge_map`, points `(0, 0, −1/4)`,
  `(1, −3/2, 13/2)`, `(−1, 3/2, 13/2)`, shared image `(−1/4, 0, 0)`, determinant −2);
  trust-label evidence; background; open questions. Sources to read:
  - AFP entry page and theory file (download the release tarball into a fresh
    scratchpad directory; read `Jacobian_Counterexample.thy` and `document/root.*`). **P**
  - `gh api repos/DrAlexHarrison/jacobian-anatomy` and `repos/deancureton/jacobian`
    (README and the file stating the map, at the commits AFP cites). Confirm the map
    matches the AFP text term for term, and note what each repository proves. **P**
  - Alpöge's post `https://x.com/__alpoge__/status/2079028340955197566`: try one
    WebFetch; if blocked, record "not read here" and do not work around it. **P**
  - Background, as **S**: Keller 1939 (from the AFP bibliography), the two-dimensional
    case open, Wikipedia's AI-discoveries list, one news article for the date.
  - Peer-review status: search; record what was found.
- [ ] **Step 2: Write the failing test** in `test/web/lessons.test.js`:

```js
test('Jacobian metadata is confirmed from primary sources', () => {
  const j = LESSONS.find((l) => l.slug === 'jacobian');
  assert.equal(j.label, 'computer-checked'); // or the dossier's label, by ruling
  assert.equal(j.confirmed, true);
  assert.match(j.title, /dimension ≥ 3/);
  const urls = j.sources.map((s) => s.url).join(' ');
  assert.match(urls, /isa-afp\.org\/entries\/Jacobian_Counterexample/);
  assert.match(urls, /x\.com\/__alpoge__\/status\/2079028340955197566/);
  assert.match(urls, /github\.com\/(DrAlexHarrison\/jacobian-anatomy|deancureton\/jacobian)/);
});
```

- [ ] **Step 3: Run** `node --test test/web/lessons.test.js`. Expected: FAIL on label/confirmed.
- [ ] **Step 4: Update the jacobian entry** from the dossier: `announced: '20 July 2026'`
  (or what the dossier states), `claimants` as the primary source credits them,
  label, `confirmed: true` with a `// docs/sources/jacobian.md: …` comment, sources
  (AFP entry, the Lean repository or repositories, Alpöge's post, `AI_DISCOVERIES`).
- [ ] **Step 5: Run** `node --test`. Expected: all pass.
- [ ] **Step 6: Commit** `docs: add the Jacobian source dossier and confirm its label`.

### Task 2: Exact polynomials (`polynomial.js`)

**Files:**
- Create: `src/problems/jacobian/polynomial.js`
- Test: `test/problems/jacobian/polynomial.test.js`

**Interfaces:**
- Consumes: `src/exact/rational.js` (`rational`, `add`, `sub`, `mul`, `cmp`, `ZERO`, `toString`).
- Produces: a `Poly` is a `Map<string, Rational>` from exponent key `"a,b,c"` to a
  nonzero coefficient (zero coefficients are never stored).
  - `parsePolynomial(text: string, variables: string[]) -> Poly`; throws
    `FixtureError(message, 'malformed')`. `MAX_EXPONENT = 20`.
  - `constant(r: Rational, n: number) -> Poly`
  - `addP(p, q)`, `subP(p, q)`, `mulP(p, q) -> Poly`; `powP(p, k: number) -> Poly`
  - `derivative(p: Poly, i: number) -> Poly` (∂/∂ variable i)
  - `evaluate(p: Poly, point: Rational[]) -> Rational`
  - `isConstant(p) -> boolean`; `constantTerm(p) -> Rational`;
    `degree(p) -> number` (total degree, −1 for the zero polynomial); `termCount(p) -> number`

- [ ] **Step 1: Write the failing tests:**
  - `parsePolynomial('2*x - 3*x^2*y - x^3*z', ['x','y','z'])` has exactly the keys
    `1,0,0` → 2, `2,1,0` → −3, `3,0,1` → −1.
  - `(1 + x*y)^3` expands to 4 terms with coefficients 1, 3, 3, 1.
  - `x - x` is the zero polynomial: `termCount` 0, `isConstant` true, `constantTerm` 0.
  - `derivative` of `x^3*z` by x is `3*x^2*z`; by y is zero.
  - `evaluate` of the AFP component A at `(1, −3/2, 13/2)` is `−1/4`.
  - `degree` of component A is 7.
  - Each of `2x`, `x^-1`, `x^21`, `w`, `x^1.5`, `(x + y`, `x +`, `''`, `x**2`
    throws a `FixtureError` with code `malformed` (Review Focus 3).
- [ ] **Step 2: Run** `node --test test/problems/jacobian/polynomial.test.js`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `polynomial.js`. Recursive-descent parser:
  `expr := term (('+'|'-') term)*`, `term := unary ('*' unary)*`,
  `unary := '-' unary | power`, `power := atom ('^' INT)?`,
  `atom := INT | VAR | '(' expr ')'`. Whitespace between tokens is ignored. Integer
  literals parse with `BigInt`, not `Number`.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add exact sparse polynomials for the Jacobian module`.

### Task 3: The verifier, fixtures and ledger

**Files:**
- Create: `src/problems/jacobian/matrix.js`, `src/problems/jacobian/index.js`
- Create: `fixtures/jacobian/alpoge-2026.json`, `synthetic-fold.json`,
  `negative-changed-coefficient.json`, `negative-perturbed-point.json`,
  `negative-zero-determinant.json`, `negative-repeated-point.json`
- Modify: `src/harness/registry.js`; regenerate `results.json`, `web/results.js`
- Test: `test/problems/jacobian.test.js`

**Interfaces:**
- Consumes: Task 2's `Poly` API; `parseRational` from `src/exact/rational.js`;
  `decide`, `SEARCH_STATE` from the harness.
- Produces:
  - `jacobianMatrix(components: Poly[]) -> Poly[][]` (entry `[i][j]` = ∂Fᵢ/∂xⱼ),
    `determinant3(m: Poly[][]) -> Poly` (cofactor expansion) in `matrix.js`.
  - `index.js` exports `problem = 'jacobian'`, `conjecture`, `verify(fixture)`.
  - Fixture `data`: `{ variables: [3 distinct names], map: [3 strings], points:
    [≥ 2 arrays of 3 rational strings] }`. Anything else → `FixtureError('malformed')`.
  - Checks, in order, with these exact names:
    1. `'the Jacobian determinant is a constant'`: actual is the value, or
       `not constant: degree d, n terms`.
    2. `'the constant is not zero'`: fails when it is zero or when there is no
       single value.
    3. `'the points are all different'`
    4. `'every point has the same image'`: expected is the first point's image as
       `(a, b, c)`; actual lists the first image that differs, or the shared image.
  - Verdict through `decide({ checks, requiresSearch: false })`,
    `searchState: SEARCH_STATE.NOT_REQUIRED`, `exhaustive: null`, `searched: null`.
  - `conjecture`: "The Jacobian conjecture (Keller, 1939): a polynomial map from
    n-dimensional space to itself whose Jacobian determinant is a nonzero constant
    has a polynomial inverse. A dimension-3 counterexample (announced July 2026)
    refutes it in every dimension 3 and up. The two-dimensional case is still open."
    Adjust the wording only to match the dossier.

- [ ] **Step 1: Write the fixtures.** `alpoge-2026`: `expect: CONFIRMED`; the
  `claim` names dimension 3 and says the planar case is open; `map` and `points` are
  verbatim from the dossier; `source` is `{ url: Alpöge's post, author: as credited,
  date: '2026-07-20', peerReviewed: false, note: 'Map and points transcribed from the
  Isabelle AFP entry …, cross-checked against … (docs/sources/jacobian.md). The X post
  itself was [not] read here.' }`. Controls, each `expect: REFUTED`, source author
  `"synthetic control, constructed for this repository"` or `"negative control,
  derived from Alpöge 2026"`:
  - `synthetic-fold`: `["x^2", "y", "z"]`, points `(1,0,0)` and `(-1,0,0)`.
  - `negative-changed-coefficient`: the real map with component A's `4 + 3*x*y`
    changed to `5 + 3*x*y`, the real points.
  - `negative-perturbed-point`: the real map; the third point's z `13/2` → `7`.
  - `negative-zero-determinant`: `["x + y", "x + y", "z"]`, points `(1,0,0)`, `(0,1,0)`.
  - `negative-repeated-point`: the real map; points `(0,0,-1/4)` twice.
- [ ] **Step 2: Write the failing tests** in `test/problems/jacobian.test.js`:
  - `alpoge-2026` is `CONFIRMED`, every check passes, check 1's actual is `'-2'`,
    check 4's actual contains `(-1/4, 0, 0)`.
  - The set of failing check names, per control:
    `synthetic-fold` → {1, 2}; `negative-zero-determinant` → {2};
    `negative-perturbed-point` → {4}; `negative-repeated-point` → {3};
    `negative-changed-coefficient` → includes 1, and its check-1 `actual` matches
    `/^not constant: degree \d+, \d+ terms$/` with length < 80 (Review Focus 5).
  - The determinant of the real map, as a `Poly`, is exactly `{'0,0,0' → −2}`, built
    from degree-6 entries (spec: exact cancellation is load-bearing).
  - `conjecture` matches `/dimension 3/` and `/two-dimensional case is still open/` (Review Focus 4).
  - Through `runFixture`: the real fixture with `map[0] = '2x'` gives `ERROR`
    reason `malformed`; with two variables gives `ERROR`; with a point
    `["1", "2"]` gives `ERROR` (Review Focus 3, I3).
  - `PROBLEMS.get('jacobian')` is the module.
- [ ] **Step 3: Run** `node --test test/problems/jacobian.test.js`. Expected: FAIL, module not found.
- [ ] **Step 4: Implement** `matrix.js`, `index.js`, and register in `registry.js`.
- [ ] **Step 5: Run** the test. Expected: PASS. If a control fails a different set of
  checks than listed, rule and ledger it (the math decides, not the plan).
- [ ] **Step 6: Run** `node bin/verify.js --all`. Expected: 6 jacobian rows, all as
  expected, `0 unexpected`. Then `node --test`. Expected: all pass (the
  results-contract staleness test included).
- [ ] **Step 7: Commit** `feat: add the jacobian verifier with the real Alpöge map`
  (code, fixtures, registry, `results.json`, `web/results.js`).

### Task 4: The page's exact checker (`jacobian-check.js`)

**Files:**
- Create: `web/lessons/jacobian-check.js`
- Test: `test/web/jacobian-check.test.js`

**Interfaces:**
- Consumes: nothing at runtime (classic script); its test imports Task 3's module
  and reads `fixtures/jacobian/alpoge-2026.json`.
- Produces: `globalThis.jacobianCheck = { MAP, POINTS, parseNumber, imageOf }`
  - `MAP`: the three map strings, identical to the fixture.
  - `POINTS`: `[{ name: 'A', point: ['0','0','-1/4'] }, { name: 'B', … }, { name: 'C', … }]`.
  - `parseNumber(text, name) -> { value: {n, d} } | { message: string }`: accepts
    integers, fractions (`13/2`, `-3 / 2`), exact decimals (`0.5` → 1/2), a leading
    `-` or `−` (U+2212). Caps: `MAX_DIGITS = 30` digits per number.
  - `imageOf(texts: string[3]) -> { ok: true, image: string[3], stretch: string } |
    { ok: false, message }`. Display strings are reduced fractions with `−` for
    negatives, e.g. `'−1/4'`.

- [ ] **Step 1: Write the failing tests:**
  - `MAP` deep-equals the fixture's `data.map`.
  - For each of A, B, C: `image` is `['−1/4', '0', '0']` and `stretch` is `'−2'`.
  - For points `(2,3,5)`, `(1/2,−1/3,7)`, `(0,0,0)`, `(−4/5,9,1/7)`: `image` equals
    the `src` module's `evaluate` of each component (minus normalized) and
    `stretch` is `'−2'`.
  - `parseNumber`: `'13/2'`, `'−3/2'`, `' -3 / 2 '`, `'0.5'`, `'-0.25'` give the right
    values (Review Focus 1). `''`, `'abc'`, `'1e5'`, `'1/0'`, `'1/2/3'`, 31 digits
    each give a `message` (Review Focus 2); `'1/0'`'s message mentions dividing by zero.
  - No message contains `✅`, `❌` or `counterexample`.
- [ ] **Step 2: Run** `node --test test/web/jacobian-check.test.js`. Expected: FAIL, file missing.
- [ ] **Step 3: Implement** as an IIFE assigning to `globalThis` (pattern of
  `euler-check.js`): BigInt rationals; a small evaluator for the `MAP` grammar
  (Task 2's, evaluating, not expanding); the stretch factor is the 3×3 determinant of
  the matrix whose column j is the ε-part of F evaluated at the point with dual
  number `xⱼ + ε` (ε² = 0).
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add the exact point checker for the Jacobian lesson`.

### Task 5: The lesson page, the path, and CLAUDE.md

**Files:**
- Create: `web/lessons/jacobian.html`, `test/web/jacobian-lesson.test.js`
- Modify: `web/lessons.js` (jacobian `available: true`,
  `checkedHere: 'jacobian/alpoge-2026'`), `test/web/lessons.test.js` (the P4 line
  asserting euler's next is `sendov.html` becomes `jacobian.html`), `web/site.css`
  only if the checker needs styles, `CLAUDE.md`

**Interfaces:**
- Consumes: Task 1 dossier, Task 3 fixture id, Task 4 `jacobianCheck`.

- [ ] **Step 1: Write the failing tests** in `test/web/jacobian-lesson.test.js`:
  - The lesson is available, `checkedHere` is `'jacobian/alpoge-2026'`, and that
    fixture's committed verdict is `CONFIRMED` (the shared lessons test also enforces
    this).
  - The first `<p>` inside `<main>` contains `dimension 3` and
    `two-dimensional case is still open` (spec §7: qualifier in the first paragraph).
  - The page loads `./jacobian-check.js` and links `../checks.html`.
  - The page text never matches `/Jacobian conjecture:?\s*(is\s*)?(refuted|disproved|false)/i`
    without the qualifier in the same sentence, and contains `−2`, `13/2` and `−1/4`.
  - No `✅`.
- [ ] **Step 2: Run** `node --test test/web/jacobian-lesson.test.js`. Expected: FAIL, page missing.
- [ ] **Step 3: Write the page** in the story layout (copy `sendov.html`'s scaffold:
  nav, header, sources loop). Copy only from the dossier:
  - Sub line (first paragraph): an 87-year-old guess (Keller, 1939) broken in
    dimension 3 and up in July 2026; the two-dimensional case is still open.
  - **Question:** a recipe that turns 3 numbers into 3 numbers. Start in one
    dimension: `f(x) = 2x + 1`, so `f(3) = 7`; it stretches every gap by 2 and never
    sends two inputs to one output. The **stretch factor** in 3D is the Jacobian
    determinant (how much a tiny box grows, and whether it flips). Keller's guess:
    if the recipe uses only `+ − ×` and whole-number powers, and the stretch factor
    is the same nonzero number everywhere, no two inputs share an output.
  - **Found:** the date, who, and what the post credits; the three formulas (in a
    `.math mono` block); stretch factor −2 everywhere; three points to one output;
    the same-day independent checks; padding gives every dimension above 3.
  - **Check it yourself:** inputs x, y, z (prefilled with point B), buttons A/B/C,
    output "F(x, y, z) = (…)" and "Stretch factor here: −2", messages from
    `parseNumber`. Note: every fraction is kept exactly, no rounding; plus a line that
    the workbench's own verifier checked the same map ("Checked here", linking
    `../checks.html`).
  - **Why it matters / What's still open:** short factual drafts from the dossier
    (the planar case; peer review status; how much of the search was the AI's).
- [ ] **Step 4: Flip** `available: true` and `checkedHere`; update the P4 nav assertion.
- [ ] **Step 5: Run** `node --test`. Expected: all pass, including the shared lesson-page structure test now covering jacobian.
- [ ] **Step 6: Update CLAUDE.md:** status (all four lessons live; P3 ✅), the P3 row,
  the `web/lessons/` and `src/problems/` rows, and the Known Risk paragraph (the
  Jacobian lesson runs on the real map transcribed from the AFP entry and shows
  "Checked here"; drop the stand-in sentence).
- [ ] **Step 7: Run** `node --test` again, open `web/lessons/jacobian.html` and
  `web/checks.html` in the browser, and try points A, B, C and a bad input.
- [ ] **Step 8: Commit** `feat: add the Jacobian lesson` and `docs: mark P3 done in CLAUDE.md`.
