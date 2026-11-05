# Learning Workbench P1: Foundation and Euler Lesson. Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the front page into the learning workbench's home. It shows a clickable
path of four lessons with trust labels. It also moves the verifier ledger to its own
page, ships the first story-layout lesson (Euler), and rewrites `CLAUDE.md` around the
new purpose.

**Architecture:** The site stays static, opened from `file://`, with no build step and no
ES-module imports in the browser, because Chrome blocks those from `file://`. Lesson
metadata lives in one script, `web/lessons.js`, which assigns `globalThis.LESSONS`. Pure
functions in `web/lesson-model.js` turn that data, plus `globalThis.RESULTS`, into what
the home path and each lesson header render. Node tests import the same files and call
the same functions, so the page and the tests share one contract.

**Tech Stack:** Node ≥ 20, `node:test`, vanilla HTML/CSS/JS, BigInt. Zero runtime
dependencies.

**Spec:** `docs/superpowers/specs/2026-11-04-learning-workbench-design.md`

**Scope:** This is plan 1 of 4. Later plans cover the news watch (spec §8), the Jacobian
module and lesson (§7), and the Sendov and Navier–Stokes lessons (§7). This plan makes
those three lessons appear on the path as *not yet available*, and it does not build
them.

## Global Constraints

- Zero runtime dependencies. No build step, and opening `web/index.html` from disk
  must work.
- No `fetch(` in any page. Data loads by `<script src>` assignment, as
  `web/results.js` does today.
- No `type="module"` scripts and no `import` in browser files, because `file://`
  blocks them.
- `src/` stays exact (BigInt/`Rational`) and is not touched by this plan, except where
  a test path changes. I1, I2 and I3 are unchanged.
- Floats are allowed only in visualizations, and must carry the caption *"rounded
  math, fine for seeing, not proof"*. This plan has no float visualizations.
- Every lesson page's sections appear in this order, with these ids: `trust`,
  `question`, `found`, `check`, `key-idea`, `why`, `open`, `sources`.
- "The key idea" ships blank. It is marked `data-pending="session"` and contains
  exactly: *"We'll work this out together in a session."*
- Trust label text, verbatim: `Refereed` · `Computer-checked proof` ·
  `Experts say correct` · `Unverified claim`. The unconfirmed marker text, verbatim:
  *"not yet confirmed against primary sources"*.
- "Checked here" renders only when the lesson names a fixture and that fixture's
  committed verdict is `CONFIRMED`.
- Reporting accuracy, from CLAUDE.md: the Jacobian result holds in dimension ≥ 3 only;
  DGG is Goemans' cost conjecture.
- Lint → build → test. The repo has no linter configured, so lint means
  `node --check` on every changed `.js` file. The project has no build step. Tests run
  with `node --test`.
- Commits use `feat:`, `fix:`, `docs:`, `test:` or `refactor:`, and end with the
  `Co-Authored-By` trailer the session supplies.

## Review Focus

1. **Bad input in the Euler calculator** (blank, `27.5`, `-3`, `1e3`, spaces, leading
   zeros, a 5,000-digit number, exponent `0` or `1`). The expected behaviour is a
   plain-words message, and never a ✅. This is pinned in Task 4.
2. **A lesson naming a fixture that is not `CONFIRMED`, or is missing from
   `RESULTS`.** "Checked here" must not render, and nothing should crash. Pinned in
   Task 1.
3. **A lesson marked unavailable on the home path.** It is shown but not a link, so it
   never leads to a 404. Pinned in Task 1 (model) and Task 2 (page).
4. **The first and last lessons on the path.** There is no "back" on the first and no
   "next" on the last, and no link points at an unavailable lesson. Pinned in Task 1.
5. **`localStorage` or `RESULTS` missing** (private window, `results.js` not yet
   generated). The pages still render. Neither page uses `localStorage` in P1, so a
   `RESULTS` that is `undefined` just means no badge. Pinned in Task 1.

---

### Task 1: Lesson data and the lesson model

**Files:**
- Create: `web/lessons.js`
- Create: `web/lesson-model.js`
- Test: `test/web/lessons.test.js`

**Interfaces:**
- Produces, as `globalThis.TRUST_LABELS`:
  `{ refereed: 'Refereed', 'computer-checked': 'Computer-checked proof', 'experts-say-correct': 'Experts say correct', unverified: 'Unverified claim' }`
- Produces, as `globalThis.LESSONS`: an array of
  `{ slug, title, blurb, position, kind: 'counterexample'|'proof', available: boolean, label: keyof TRUST_LABELS, confirmed: boolean, checkedHere: string|null, sources: [{ title, url }] }`
- Produces, as `globalThis.pathModel(lessons) -> [{ slug, title, blurb, position, labelText, confirmed, href: string|null }]`.
  The result is sorted by position. `href` is `lessons/<slug>.html` when available and
  `null` otherwise.
- Produces, as `globalThis.lessonHeaderModel(lessons, results, slug) -> { title, labelText, confirmed, checkedHere: { fixture, verdict }|null, prev: { slug, title, href }|null, next: …|null, sources }`.
  `results` is `globalThis.RESULTS` (the object with `.results`) or `undefined`.
  `prev` and `next` skip unavailable lessons, and their `href` is relative to
  `web/lessons/`, so it reads `<slug>.html`.

The four entries, in this order:

| slug | title | position | kind | available | label | confirmed | checkedHere |
|---|---|---|---|---|---|---|---|
| `euler` | Euler's sum of powers | 1 | counterexample | true | refereed | true | `euler/lander-parkin-1966` |
| `jacobian` | The Jacobian conjecture (dimension ≥ 3) | 2 | counterexample | false | experts-say-correct | false | null |
| `sendov` | Sendov's conjecture | 3 | proof | false | computer-checked | false | null |
| `navier-stokes` | Navier–Stokes (forced version) | 4 | proof | false | unverified | false | null |

Blurbs come from the brainstorm path: *"Four big numbers that broke a 200-year-old
guess"*, *"A formula AI found that breaks a conjecture"*, *"First real proof,
computer-checked"*, *"A Millennium Prize claim, not yet verified"*.

Sources:
- Euler: the two URLs in `fixtures/euler/lander-parkin-1966.json` and
  `fixtures/euler/elkies-1988.json`.
- The other three: `https://en.wikipedia.org/wiki/List_of_mathematical_discoveries_by_artificial_intelligence`.
  This is secondary, which is why `confirmed` is false.

- [ ] **Step 1: Write the failing tests** in `test/web/lessons.test.js`. Load the
  files with `await import('../../web/lessons.js')` and
  `await import('../../web/lesson-model.js')`, then read `globalThis`.

```js
test('lessons are four, positions 1-4, labels known, every lesson sourced', () => {
  assert.deepEqual(LESSONS.map((l) => l.slug), ['euler', 'jacobian', 'sendov', 'navier-stokes']);
  assert.deepEqual(LESSONS.map((l) => l.position), [1, 2, 3, 4]);
  for (const l of LESSONS) {
    assert.ok(l.label in TRUST_LABELS, l.slug);
    assert.ok(l.sources.length >= 1 && l.sources.every((s) => /^https:\/\//.test(s.url)), l.slug);
  }
});
test('every available lesson has a page; no unavailable lesson is linked', async () => {
  for (const p of pathModel(LESSONS)) {
    if (p.href) await access(new URL(`../../web/${p.href}`, import.meta.url));
    else assert.equal(LESSONS.find((l) => l.slug === p.slug).available, false);
  }
});
test('checkedHere names a fixture whose committed verdict is CONFIRMED', async () => {
  const committed = JSON.parse(await readFile(new URL('../../results.json', import.meta.url), 'utf8'));
  for (const l of LESSONS.filter((x) => x.checkedHere)) {
    assert.equal(committed.results.find((r) => r.fixture === l.checkedHere)?.verdict, 'CONFIRMED', l.slug);
  }
});
test('badge only for CONFIRMED; absent results or a non-confirmed fixture give none', () => {
  const ok = { results: [{ fixture: 'euler/lander-parkin-1966', verdict: 'CONFIRMED' }] };
  assert.deepEqual(lessonHeaderModel(LESSONS, ok, 'euler').checkedHere, { fixture: 'euler/lander-parkin-1966', verdict: 'CONFIRMED' });
  assert.equal(lessonHeaderModel(LESSONS, undefined, 'euler').checkedHere, null);
  assert.equal(lessonHeaderModel(LESSONS, { results: [{ fixture: 'euler/lander-parkin-1966', verdict: 'REFUTED' }] }, 'euler').checkedHere, null);
  assert.equal(lessonHeaderModel(LESSONS, { results: [] }, 'euler').checkedHere, null);
});
test('prev/next skip unavailable lessons; ends have none', () => {
  const lessons = LESSONS.map((l) => ({ ...l, available: true }));
  assert.equal(lessonHeaderModel(lessons, undefined, 'euler').prev, null);
  assert.equal(lessonHeaderModel(lessons, undefined, 'navier-stokes').next, null);
  assert.equal(lessonHeaderModel(lessons, undefined, 'euler').next.href, 'jacobian.html');
  assert.equal(lessonHeaderModel(LESSONS, undefined, 'euler').next, null); // P1: the rest are unavailable
});
test('labelText and confirmed come through for every lesson', () => {
  const p = pathModel(LESSONS);
  assert.equal(p[0].labelText, 'Refereed');
  assert.equal(p[3].labelText, 'Unverified claim');
  assert.equal(p[3].confirmed, false);
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**
  Run `node --test test/web/lessons.test.js`. Expected: FAIL, because the module
  cannot be found.

- [ ] **Step 3: Implement `web/lessons.js` and `web/lesson-model.js`.**
  Both are plain scripts that assign to `globalThis`, with no `import` or `export`. The
  package is `"type": "module"`, so Node loads them as side-effecting ES modules, and
  the browser runs them as classic scripts.

- [ ] **Step 4: Run lint and the tests.**
  Run `node --check web/lessons.js && node --check web/lesson-model.js && node --test test/web/lessons.test.js`.
  Expected: the "every available lesson has a page" test **FAILS** on
  `lessons/euler.html`, because Task 4 creates that page. Every other test must pass.
  Mark that one test `{ todo: 'euler page lands in Task 4' }` and remove the marker in
  Task 4.

- [ ] **Step 5: Commit.**
  Message: `feat: add lesson data and the lesson model`.

### Task 2: Move the ledger and build the home page

**Files:**
- Move: `web/index.html` → `web/checks.html` (`git mv`)
- Modify: `web/checks.html`. Set the title to `Check ledger`, change the `h1` to
  `Check ledger`, and add a footer link to `./index.html` labelled `home`. Make no
  other changes.
- Modify: `test/web/results-contract.test.js`. Replace every
  `'../../web/index.html'` with `'../../web/checks.html'`.
- Create: `web/site.css`
- Create: `web/index.html`
- Test: `test/web/home.test.js`

**Interfaces:**
- Consumes: `LESSONS`, `TRUST_LABELS` and `pathModel` from Task 1.
- Produces: `web/site.css`. It holds the shared tokens, copied from the ledger's
  `:root` (light and dark, same names and values), and the classes `.label-chip`,
  `.unconfirmed`, `.checked-here`, `.path`, `.path-step`, `.path-step.unavailable`,
  `.lesson`, `.pending`. Task 3 and Task 4 use these class names.

The home page loads `./lessons.js` and then `./lesson-model.js` with `<script src>`.
It contains:
- An `h1` with the text `Math Workbench`.
- One line of subtitle: *"Taking apart the big AI-era math results, one at a time."*
- The path, rendered from `pathModel(LESSONS)`. Each step shows its position, title,
  blurb and label chip, plus the unconfirmed marker when `confirmed` is false. An
  available step is an `<a href>`; an unavailable step is a `<div>` with the class
  `unavailable` and the text `coming soon`.
- A placeholder `<section id="news">` reading *"News watch arrives in a later
  update."* Plan 2 owns this section.
- A footer with links to `checks.html` (`check ledger`) and `calculator.html`
  (`calculator`).

- [ ] **Step 1: Move the ledger and repoint its tests.** Then run `node --test`.
  Expected: everything passes except the Task 1 todo.
- [ ] **Step 2: Write the failing tests** in `test/web/home.test.js`, reading
  `web/index.html` as text.

```js
test('home loads data by script, never fetch or modules', async () => {
  assert.match(html, /<script src="\.\/lessons\.js"><\/script>\s*<script src="\.\/lesson-model\.js"><\/script>/);
  assert.doesNotMatch(html, /fetch\(|type="module"/);
});
test('home renders the path from pathModel and links the ledger', async () => {
  assert.match(html, /pathModel\(globalThis\.LESSONS\)/);
  assert.match(html, /href="checks\.html"/);
  assert.match(html, /id="news"/);
});
test('unavailable steps say so', async () => {
  assert.match(html, /coming soon/);
  assert.match(html, /unavailable/);
}); // the null-href → not-a-link rule itself is pinned on pathModel in Task 1 and checked by eye in Step 5
test('the ledger moved intact', async () => {
  const ledger = await readFile(new URL('../../web/checks.html', import.meta.url), 'utf8');
  assert.match(ledger, /<title>Check ledger<\/title>/);
  assert.match(ledger, /href="\.\/index\.html"/);
});
```

- [ ] **Step 3: Run the tests and confirm they fail.**
  Run `node --test test/web/home.test.js`. Expected: FAIL.
- [ ] **Step 4: Implement `web/site.css` and `web/index.html`.** Use `textContent`
  for all data and no `innerHTML`, matching the ledger's `el()` helper.
- [ ] **Step 5: Run lint and the tests.**
  Run `node --test`. Expected: PASS, except the Task 1 todo. Then open
  `web/index.html` from disk in a browser and confirm three things: the four steps
  render, only Euler is a link, and the ledger link opens and still lists 8 verdicts.
- [ ] **Step 6: Commit.**
  Message: `feat: make the front page the workbench home; move the ledger to checks.html`.

### Task 3: The shared lesson header

**Files:**
- Create: `web/lesson-header.js`
- Test: extend `test/web/lessons.test.js`

**Interfaces:**
- Consumes: `lessonHeaderModel` from Task 1, and the class names from Task 2.
- Produces: `globalThis.renderLessonHeader(slug)`. It reads `globalThis.LESSONS` and
  `globalThis.RESULTS`, calls `lessonHeaderModel`, and fills two elements in the
  lesson page.
  - `#trust` gets: the label chip; the unconfirmed marker when `confirmed` is false;
    and the "Checked here" badge when `checkedHere` is non-null, linking to
    `../checks.html`.
  - `#lesson-nav` gets: back and next links when they are non-null, and always a
    `home` link to `../index.html`.

  A lesson page must load these scripts in this order: `../results.js`,
  `../lessons.js`, `../lesson-model.js`, `../lesson-header.js`.

- [ ] **Step 1: Write the failing test.** `lesson-header.js` must touch the DOM only
  inside `renderLessonHeader`, so that importing it in Node doesn't throw. Assert this:
  after `await import('../../web/lesson-header.js')`,
  `typeof globalThis.renderLessonHeader === 'function'`.
- [ ] **Step 2: Run the test and confirm it fails.**
  Run `node --test test/web/lessons.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement `web/lesson-header.js`.** The unconfirmed marker text is
  exactly *"not yet confirmed against primary sources"*. Use `textContent` only.
- [ ] **Step 4: Run lint and the tests.**
  Run `node --check web/lesson-header.js && node --test`. Expected: PASS, except the
  Task 1 todo.
- [ ] **Step 5: Commit.**
  Message: `feat: add the shared lesson header with trust label and navigation`.

### Task 4: The Euler lesson

**Files:**
- Create: `web/lessons/euler.html`
- Create: `web/lessons/euler-check.js`
- Test: create `test/web/euler-lesson.test.js`, and remove the Task 1 `todo` marker.

**Interfaces:**
- Consumes: `renderLessonHeader('euler')` from Task 3, and `site.css` from Task 2
  (loaded as `../site.css`).
- Produces: `globalThis.checkPowerSum(kText, termTexts, rhsText) -> { ok: true, lhs: bigint, rhs: bigint, equal: boolean } | { ok: false, message: string }`
  in `web/lessons/euler-check.js`.
  - Parsing: trim each input, then require `/^[0-9]+$/` with no leading zeros
    (`0` alone is allowed for terms). The exponent `k` must lie in `2..20`. There must
    be 1 to 10 terms, and each term and the right-hand side may have at most 40 digits.
  - Anything else returns `ok: false` with a plain-words `message` naming the field,
    such as *"Term 2 needs to be a whole number, like 84."*
  - It uses BigInt `**` and never touches a `Number` path. The page shows ✅ only when
    `ok && equal`.

Page content (copy source: brainstorm screens `euler-why.html` and
`euler-spreadsheet.html` under `.superpowers/brainstorm/70645-1793834142/content/`):
- **`#question`:** Start from cubes: `3³+4³+5³=6³` (27+64+125=216). Two cubes can
  never sum to a cube. Then Euler's 1769 guess, and why nobody could settle it: proving
  it means covering infinitely many cases, and disproving it means about 20 million
  combinations of four numbers under 150.
- **`#found`:** In 1966, Lander & Parkin found `27⁵+84⁵+110⁵+133⁵=144⁵ = 61,917,364,224`
  using a CDC 6600. Their paper was about two sentences long.
- **`#check`:**
  - The calculator. It is pre-filled with `5`, `27, 84, 110, 133` and `144`, has a
    one-line nudge ("change any number and watch it break"), and shows both sides in
    full along with their difference.
  - Then **"Try it in a spreadsheet"**. Part 1 has the seven cells A1–A7, and A7 shows
    0. Part 2 has `B1: =422481^4` and `B2: =B1+1-B1`, which shows 0. It includes the
    15-digit explanation and the "confidently wrong" panel.
  - It notes that this was tested with Node's double arithmetic, not inside a specific
    spreadsheet app.
- **`#key-idea`:** blank, per Global Constraints.
- **`#why`:** The template for 2026: finding is hard, checking is easy. A great mind's
  pattern can be wrong.
- **`#open`:** Elkies found the 4th-power case in 1986 (published 1988), using deep
  theory to know where to look. For 6th powers and higher, nobody knows.
- **`#sources`:** Rendered from `LESSONS` sources: the Lander & Parkin URL and the
  Elkies URL.

- [ ] **Step 1: Write the failing tests** in `test/web/euler-lesson.test.js`.

```js
test('checkPowerSum confirms Lander–Parkin exactly', () => {
  const r = checkPowerSum('5', ['27', '84', '110', '133'], '144');
  assert.deepEqual([r.ok, r.equal, r.lhs, r.rhs], [true, true, 61917364224n, 61917364224n]);
});
test('a perturbed term breaks it', () => {
  assert.equal(checkPowerSum('5', ['28', '84', '110', '133'], '144').equal, false);
});
test('Elkies holds exactly at 23 digits, where doubles cannot tell x+1 from x', () => {
  assert.equal(checkPowerSum('4', ['95800', '217519', '414560'], '422481').equal, true);
  assert.equal(checkPowerSum('4', ['95801', '217519', '414560'], '422481').equal, false);
  assert.equal(422481 ** 4 + 1 === 422481 ** 4, true); // why the page exists
});
for (const [k, terms, rhs] of [
  ['5', [''], '144'], ['5', ['27.5'], '144'], ['5', ['-3'], '144'], ['5', ['1e3'], '144'],
  ['5', ['027'], '144'], ['1', ['3'], '3'], ['0', ['3'], '1'], ['21', ['3'], '3'],
  ['5', ['9'.repeat(41)], '144'], ['5', [], '144'], ['five', ['27'], '144'],
]) {
  test(`rejects ${JSON.stringify([k, terms, rhs])} with a message, never a pass`, () => {
    const r = checkPowerSum(k, terms, rhs);
    assert.equal(r.ok, false);
    assert.equal(typeof r.message, 'string');
  });
}
test('accepts surrounding spaces', () => {
  assert.equal(checkPowerSum(' 5 ', [' 27', '84 ', '110', '133'], ' 144').equal, true);
});
test('page: eight sections in order, key idea pending, scripts in order, no fetch', async () => {
  const html = await readFile(new URL('../../web/lessons/euler.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/<section id="([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['trust', 'question', 'found', 'check', 'key-idea', 'why', 'open', 'sources']);
  assert.match(html, /<section id="key-idea"[^>]*data-pending="session"/);
  assert.match(html, /We'll work this out together in a session\./);
  assert.match(html, /\.\.\/results\.js[\s\S]*\.\.\/lessons\.js[\s\S]*\.\.\/lesson-model\.js[\s\S]*\.\.\/lesson-header\.js/);
  assert.doesNotMatch(html, /fetch\(|type="module"/);
  assert.match(html, /renderLessonHeader\('euler'\)/);
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**
  Run `node --test test/web/euler-lesson.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement `web/lessons/euler-check.js`, then `web/lessons/euler.html`.**
  Remove the Task 1 `todo` marker.
- [ ] **Step 4: Run lint and the tests.**
  Run `node --check web/lessons/euler-check.js && node --test`. Expected: all PASS,
  with no todos left. Then open `web/index.html` from disk and click through to Euler.
  Confirm three things: the label reads `Refereed` with the "Checked here" badge; the
  calculator shows ✅ for the default values and ❌ after changing 27 to 28; and
  typing `27.5` shows a message, not ❌ or ✅.
- [ ] **Step 5: Commit.**
  Message: `feat: add the Euler lesson with an exact calculator and the spreadsheet trap`.

### Task 5: Rewrite CLAUDE.md around the new purpose

**Files:**
- Modify: `CLAUDE.md`

The rewrite must contain these items, all from the spec:
- **The new "What this is":** a personal workbench for understanding AI-era math
  results. Learning happens back and forth in sessions, and lesson pages are the record
  of it.
- **The six teaching rules from spec §3,** verbatim in substance. Rule 4 must read: a
  key idea or trust label is written only from primary sources. When Michael gets lost,
  go simpler, not faster.
- **The session workflow:**
  1. When Michael says "explain <result>", start from his level.
  2. Fill `#key-idea` in the lesson page only once he has followed the explanation.
  3. Flip `confirmed` in `web/lessons.js` only after reading primary sources.
- **The scoped float rule from spec §4.**
- **Kept unchanged:**
  - I1, I2, I3 and the corollary about negative fixtures
  - "Reporting Accuracy"
  - "Don't propose renaming"
  - the security section
  - the deterministic `results.json` paragraph
- **An updated file table:**
  - `web/index.html` is now the home page
  - `web/checks.html` is the ledger
  - add `web/lessons.js`, `web/lesson-model.js`, `web/lesson-header.js`,
    `web/site.css` and `web/lessons/`
- **Updated milestones:** M1–M3 done; P1 (this plan) done; P2 news watch; P3 Jacobian
  (formerly M4); P4 Sendov and Navier–Stokes; M5 sourcing continues.
- **The Development commands,** with `open web/index.html` and a mention of
  `web/checks.html`.

- [ ] **Step 1: Rewrite `CLAUDE.md`.**
- [ ] **Step 2: Verify.** Run `grep -n "web/index.html\|checks.html\|lessons.js\|I1\|I2\|I3\|dimension" CLAUDE.md`.
  Expected: every path in the file table exists on disk, I1–I3 are present, and the
  Jacobian dimension qualifier is present. Then run `node --test`. Expected: PASS.
- [ ] **Step 3: Commit.**
  Message: `docs: rewrite CLAUDE.md for the learning workbench`.
