# Learning Workbench P4: Sendov and Navier–Stokes Lessons. Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make path steps 3 (Sendov, the first proof lesson, with the drag-the-dots
picture) and 4 (Navier–Stokes, an unverified Millennium claim) clickable lessons whose
facts and trust labels come from primary sources.

**Architecture:** Same story layout and shared header as Euler. Facts are gathered
first into a committed source dossier per lesson (`docs/sources/<slug>.md`), and page
copy and `web/lessons.js` labels are written only from those dossiers. The Sendov picture is
a pure float module (`web/lessons/sendov-picture.js`: polynomial from roots,
derivative, root finding, nearest-flat-spot distances) tested in Node, plus SVG
rendering in the page.

**Tech Stack:** Node ≥ 20, `node:test`, vanilla HTML/CSS/JS, SVG. Zero runtime
dependencies. WebSearch/WebFetch for the source research (Task 1).

**Spec:** `docs/superpowers/specs/2026-11-04-learning-workbench-design.md` (§3, §4, §5,
§6.2, §7 Sendov and Navier–Stokes)

**Scope:** Plan 4 of 4, built before P3 at Michael's request (2026-11-06). Jacobian
stays unavailable; back/next links skip it.

## Global Constraints

- Story layout section ids, in order: `trust`, `question`, `found`, `check`,
  `key-idea`, `why`, `open`, `sources`.
- `#key-idea` ships blank: `data-pending="session"` and the text "We'll work this out
  together in a session." (spec §6.2: the key idea is written only after reading the
  proof, together).
- Trust labels are confirmed only against primary sources (paper, preprint,
  announcement, Lean repository). `confirmed: true` only when the dossier quotes a
  primary source supporting the label; otherwise it stays `false` and the marker shows.
  If the sources contradict the label, change the label.
- Floats only in pictures, captioned verbatim *"rounded math, fine for seeing, not
  proof"*. The picture never produces a verdict, a trust label, or a ✅.
- Navier–Stokes: **forced** version, **Unverified claim**, priority **disputed**, Clay
  considers a solution only **two years after publication**. Never "solved", "proved"
  or "proven" about the claim; say "claims".
- Plain words first (CLAUDE.md teaching rules); every symbol explained with a number
  example the first time.
- No `fetch(`, no `type="module"`, DOM text via `textContent`, SVG via
  `createElementNS` (no `innerHTML`).

## Rulings made in this plan (builder's calls)

- **Source dossiers are committed** (`docs/sources/sendov.md`,
  `docs/sources/navier-stokes.md`): each fact the page states, with its URL, the
  date retrieved, and whether the source is primary. This is the evidence that §5's
  "confirmed against primary sources" happened. Cost if wrong: two markdown files.
- **Navier–Stokes gets no picture.** Its `#check` section is titled "Can anyone check
  it yet?" and explains why not. A fluid picture would suggest understanding we don't
  have. Cost if wrong: a later picture.
- **The lesson header gains date and claimants** (spec §6.2 item 1; deferred from P1).
  `lessons.js` entries get `announced` and `claimants` strings; the header shows
  `claimants · announced`. Done now because the two new lessons need it.
- **Dots are keyboard-movable** (focusable, arrow keys move 0.05) so the picture isn't
  mouse-only.

## Review Focus

1. Two dots dragged onto the same spot (a double root) → that root's own flat spot is
   itself, distance 0; nothing renders `NaN`. Pinned in Task 2.
2. A dot dragged outside the circle → it's held on the circle edge (|z| ≤ 1); the
   claim is only about roots inside. Pinned in Task 2 (`clampToDisk`).
3. Root finding not converging (symmetric start, degree up to 7) → distances stay
   finite and match known cases. Pinned in Task 2.
4. Navier–Stokes copy drifting into "solved"/"proved" → page test fails. Pinned in
   Task 4.
5. Back/next with Jacobian unavailable → Euler ↔ Sendov ↔ Navier–Stokes, never a link
   to `jacobian.html`. Pinned in Task 1.

---

### Task 1: Sources, lesson data, and the header byline

**Files:**
- Create: `docs/sources/sendov.md`, `docs/sources/navier-stokes.md`
- Modify: `web/lessons.js`, `web/lesson-model.js`, `web/lesson-header.js`, `web/site.css`
- Test: `test/web/lessons.test.js`

**Interfaces:**
- Produces: every `LESSONS` entry has `announced: string` and `claimants: string`
  (non-empty); `lessonHeaderModel(...)` adds `byline: string` =
  `` `${claimants} · ${announced}` ``; `renderLessonHeader` shows it in `#trust` as
  `<span class="byline">`. `sendov` and `navier-stokes` get primary-source `sources`
  and `available: true` in Tasks 3 and 4 (not here).

- [ ] **Step 1: Research (no code).** For each lesson, find and read the primary
  sources, and write the dossier. Each dossier has: the claim in one sentence; who
  and when (announcement date, people, AI system); the trust-label evidence (what
  exists: refereed paper? Lean formalization, and does it cover the full theorem?
  named expert reviews?); each fact the page will state, with URL, retrieved date,
  and **primary/secondary**; and open questions you couldn't settle.
  - Sendov: the announcement (brainstorm draft said Aug 3, 2026, GPT-5.6 Pro, Lech
    Mazur; unconfirmed), the proof write-up, the Lean repository, Terence Tao's
    review. Background: the classical statement and Tao's 2020 large-degree result.
  - Navier–Stokes: OpenAI's September 2026 announcement and any preprint, the
    Washington Post coverage (2026-09-09), the priority dispute (who, what claim),
    the Clay Institute's official problem statement and its rules page (the two-year
    condition), and any expert responses.
  If a primary source can't be found or read, the dossier says so; the label then
  stays `confirmed: false` (and Navier–Stokes stays `unverified` regardless).
- [ ] **Step 2: Write the failing tests** in `test/web/lessons.test.js`:

```js
test('every lesson has a date and claimants, and the header shows them', () => {
  for (const l of LESSONS) {
    assert.ok(typeof l.announced === 'string' && l.announced.trim(), l.slug);
    assert.ok(typeof l.claimants === 'string' && l.claimants.trim(), l.slug);
    assert.equal(lessonHeaderModel(LESSONS, undefined, l.slug).byline, `${l.claimants} · ${l.announced}`);
  }
});

test('navigation skips unavailable Jacobian: euler → sendov → navier-stokes', () => {
  const lessons = LESSONS.map((l) => ({ ...l, available: l.slug !== 'jacobian' }));
  assert.equal(lessonHeaderModel(lessons, undefined, 'euler').next.href, 'sendov.html');
  assert.equal(lessonHeaderModel(lessons, undefined, 'sendov').prev.href, 'euler.html');
  assert.equal(lessonHeaderModel(lessons, undefined, 'sendov').next.href, 'navier-stokes.html');
  assert.equal(lessonHeaderModel(lessons, undefined, 'navier-stokes').prev.href, 'sendov.html');
});

test('a confirmed label cites at least one source that is not Wikipedia', () => {
  for (const l of LESSONS.filter((x) => x.confirmed)) {
    assert.ok(l.sources.some((s) => !/wikipedia\.org/.test(s.url)), l.slug);
  }
});

test('Navier–Stokes stays an Unverified claim', () => {
  assert.equal(LESSONS.find((l) => l.slug === 'navier-stokes').label, 'unverified');
});
```

  and add `assert.match(src, /byline/)` to the "lesson-header.js imports" test
  (reading the file's source).
- [ ] **Step 3: Run** `node --test test/web/lessons.test.js` — Expected: FAIL (no
  `announced`, no `byline`).
- [ ] **Step 4: Implement.** Add `announced`/`claimants` to all four entries (Euler:
  `'L. J. Lander and T. R. Parkin'`, `'1966'`; Jacobian from the Wikipedia list,
  marked as unconfirmed by its `confirmed: false`; Sendov and Navier–Stokes from the
  dossiers). Add `byline` to the model, render it in the header, style `.byline`
  (`--ink-3`, small). Replace the P1 line asserting `euler` has no next only if it
  now fails (it still holds while Sendov is unavailable).
- [ ] **Step 5: Run** `node --test` — Expected: all pass.
- [ ] **Step 6: Commit** `docs: add Sendov and Navier–Stokes source dossiers` and
  `feat: show date and claimants in the lesson header` (two commits).

### Task 2: The flat-spot math for the Sendov picture

**Files:**
- Create: `web/lessons/sendov-picture.js`
- Test: `test/web/sendov-picture.test.js`

**Interfaces:**
- Produces (classic script, assigns to `globalThis.sendov`): complex numbers are
  `[re, im]` arrays.
  - `sendov.flatSpots(roots: number[][]) -> number[][]` — roots of the derivative of
    `(z - r1)(z - r2)…`; length `roots.length - 1`.
  - `sendov.nearestDistances(roots) -> number[]` — for each root, the distance to its
    nearest flat spot.
  - `sendov.clampToDisk(z) -> number[]` — `z` if `|z| ≤ 1`, else `z / |z|`.
  Root finding is Durand–Kerner with a non-symmetric start (radius 0.9, angle offset
  0.4 as in the mockup), up to 500 iterations, tolerance 1e-12.

- [ ] **Step 1: Write the failing tests**

```js
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
test('z² − 1: flat spot at 0, both roots at distance 1', () => {
  const d = sendov.nearestDistances([[1, 0], [-1, 0]]);
  assert.ok(d.every((x) => close(x, 1)), d);
});
test('roots 0 and 1: flat spot at 1/2', () => {
  const [f] = sendov.flatSpots([[0, 0], [1, 0]]);
  assert.ok(close(f[0], 0.5) && close(f[1], 0));
});
test('cube roots of unity: flat spots at 0, every distance 1', () => {
  const r = [0, 1, 2].map((k) => [Math.cos(2 * Math.PI * k / 3), Math.sin(2 * Math.PI * k / 3)]);
  assert.ok(sendov.nearestDistances(r).every((x) => close(x, 1, 1e-6)));
});
test('a double root is its own flat spot: distance 0, never NaN', () => {
  const d = sendov.nearestDistances([[0.3, 0.2], [0.3, 0.2], [-0.5, 0]]);
  assert.ok(d.every(Number.isFinite));
  assert.ok(close(d[0], 0, 1e-6) && close(d[1], 0, 1e-6));
});
test('degree 7 with random roots in the disk: finite and ≤ 1 (Sendov, seen not proved)', () => {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let t = 0; t < 200; t++) {
    const roots = Array.from({ length: 7 }, () => sendov.clampToDisk([rnd() * 2 - 1, rnd() * 2 - 1]));
    const d = sendov.nearestDistances(roots);
    assert.ok(d.every((x) => Number.isFinite(x) && x <= 1 + 1e-6), JSON.stringify(roots));
  }
});
test('clampToDisk holds outside points on the edge and leaves inside points alone', () => {
  assert.deepEqual(sendov.clampToDisk([0.3, 0.4]), [0.3, 0.4]);
  const [x, y] = sendov.clampToDisk([3, 4]);
  assert.ok(close(x, 0.6) && close(y, 0.8));
});
```

- [ ] **Step 2: Run** `node --test test/web/sendov-picture.test.js` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `web/lessons/sendov-picture.js` (port the mockup's
  `coeffs`/`deriv`/`solve`, made readable; no DOM).
- [ ] **Step 4: Run** `node --test` — Expected: all pass.
- [ ] **Step 5: Commit** `feat: add the flat-spot math for the Sendov picture`

### Task 3: The Sendov lesson

**Files:**
- Create: `web/lessons/sendov.html`
- Modify: `web/lessons.js` (`sendov`: `available: true`, sources from the dossier,
  label/`confirmed` per the dossier), `web/site.css` (picture styles)
- Test: `test/web/lesson-pages.test.js` (new; shared structure checks for every
  available lesson), `test/web/sendov-lesson.test.js`

**Interfaces:**
- Consumes: `globalThis.sendov` (Task 2), `renderLessonHeader('sendov')`, dossier facts.

- [ ] **Step 1: Write the failing tests.** `test/web/lesson-pages.test.js`, looping
  over `LESSONS.filter((l) => l.available)`: the page exists; section ids in the
  global order; `#key-idea` has `data-pending="session"` and the pending sentence;
  scripts load `../results.js`, `../lessons.js`, `../lesson-model.js`,
  `../lesson-header.js` in that order; no `fetch(`, `type="module"` or `innerHTML`;
  calls `renderLessonHeader('<slug>')`. `test/web/sendov-lesson.test.js`: the page
  loads `./sendov-picture.js`; contains the verbatim caption *rounded math, fine for
  seeing, not proof*; contains no `✅`; heading "See it for yourself"; uses
  `createElementNS`; `LESSONS` has `sendov.available === true`.
- [ ] **Step 2: Run** `node --test test/web/` — Expected: FAIL (no sendov.html).
- [ ] **Step 3: Write the page** from the mockup and the dossier:
  - **question:** the 1D flat-spot idea, then the 2D version, a root and a flat spot
    each explained with a picture-sized example; Sendov's guess and its date.
  - **found:** who claimed what and when, what the Lean check covers, Tao's review,
    all as the dossier states them.
  - **check** ("See it for yourself"): the SVG picture (4 starting dots, unit circle,
    orange flat spots, a line from each root to its nearest flat spot, green when
    ≤ 1), a readout of each distance to 2 decimals, a Reset button, keyboard moves;
    the caption. Dragging uses pointer events and `clampToDisk`.
  - **why**, **open:** short factual drafts from the dossier.
  - **sources:** rendered from `lessons.js`, as on the Euler page.
- [ ] **Step 4: Run** `node --test` — Expected: all pass. Then open it in headless
  Chrome at 500px and 1280px; screenshot; confirm the picture draws, readout numbers
  are finite, and nav reads "← Euler's sum of powers · home · Navier–Stokes →" once
  Task 4 lands (until then, no next).
- [ ] **Step 5: Commit** `feat: add the Sendov lesson with the drag-the-dots picture`

### Task 4: The Navier–Stokes lesson

**Files:**
- Create: `web/lessons/navier-stokes.html`
- Modify: `web/lessons.js` (`navier-stokes`: `available: true`, sources from the
  dossier), `CLAUDE.md` (Current Status: P4 done ahead of P3; file table)
- Test: `test/web/navier-stokes-lesson.test.js` (structure comes from Task 3's shared test)

- [ ] **Step 1: Write the failing test**

```js
const html = await readFile(new URL('../../web/lessons/navier-stokes.html', import.meta.url), 'utf8');
const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
test('says forced, disputed, and the Clay two-year rule', () => {
  assert.match(text, /forced/i);
  assert.match(text, /disputed/i);
  assert.match(text, /two years/i);
});
test('never says the claim is solved or proved', () => {
  assert.doesNotMatch(text, /\b(solved|proved|proven)\b/i);
});
test('section 4 explains why nobody can check it yet, and has no picture', () => {
  assert.match(html, /Can anyone check it yet\?/);
  assert.doesNotMatch(html, /<svg|<canvas/);
});
```

- [ ] **Step 2: Run** `node --test test/web/navier-stokes-lesson.test.js` — Expected: FAIL (ENOENT).
- [ ] **Step 3: Write the page** from the dossier, covering every spec §7 bullet:
  what the Millennium problem asks (fluids, smooth solutions, blow-up) in plain
  words; why it's hard; what OpenAI claimed and that it's the forced version; the
  priority dispute; the Clay two-year rule; why nobody can confirm it yet. Set
  `available: true`. Update CLAUDE.md status and file table.
- [ ] **Step 4: Run** `node --test` — Expected: all pass. Headless Chrome screenshots
  of both new lessons and the home page: path steps 1, 3, 4 clickable, 2 "coming
  soon"; Sendov's nav now shows "Navier–Stokes →".
- [ ] **Step 5: Commit** `feat: add the Navier–Stokes lesson` and
  `docs: mark P4 done in CLAUDE.md` (two commits).
