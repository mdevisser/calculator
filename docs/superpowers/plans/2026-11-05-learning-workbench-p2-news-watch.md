# Learning Workbench P2: News Watch. Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A weekly cloud routine finds new AI-era math results and opens a PR of news
cards. Once Michael merges it, the cards show on the home page, newest first, with
unseen cards marked *new*.

**Architecture:** `news/cards.json` is the source of record. `bin/news.js` validates it
and writes `web/news.js` (`globalThis.NEWS = …`), mirroring `results.json` →
`web/results.js`, and a test fails if the two drift. A pure `web/news-model.js` turns
`NEWS` into what the home page renders. The routine's instructions are committed as
`news/ROUTINE.md`, so what it does is reviewable in the repo, and the scheduled routine
is told to follow that file.

**Tech Stack:** Node ≥ 20, `node:test`, vanilla HTML/CSS/JS, `gh` CLI (routine only),
Claude Code `/schedule`. Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-04-learning-workbench-design.md` (§6.1 home,
§8 news watch)

**Scope:** Plan 2 of 4. P3 is Jacobian; P4 is Sendov and Navier–Stokes.

## Global Constraints

- Zero runtime dependencies; no build step; `web/index.html` opens from disk.
- No `fetch(`, no `type="module"` in any page. Data loads by `<script src>`.
- Page text from cards is set with `textContent` only, never `innerHTML` (card text
  comes from the web via the routine).
- Card fields (spec §8): id, date announced, title, claimants (people and AI system),
  claim type (`proof` / `counterexample` / `construction` / `other`), trust label, a
  2–3 sentence plain-words summary, sources (at least one URL, mandatory, as in I2).
- Card ids are stable slugs `<yyyy-mm>-<short-topic>`.
- Trust labels are the keys of `globalThis.TRUST_LABELS` in `web/lessons.js`. When the
  routine can't tell, it uses `unverified` ("Unverified claim").
- "Seen" is remembered per browser in `localStorage`, every access wrapped in
  try/catch; the page works without it.
- Nothing lands on the page until Michael merges a `news/<YYYY-MM-DD>` PR.
- Seed window opens back to 2026-06-01.
- Reporting Accuracy (CLAUDE.md) applies to cards: Navier–Stokes is the **forced**
  version and an **Unverified claim**; Jacobian is **dimension ≥ 3**; DGG is
  **Goemans' cost conjecture**.

## Rulings made in this plan (builder's calls)

- **`checkedThrough` in `cards.json`.** The routine's "since the last run" is the
  file's `checkedThrough` date, starting at `2026-05-31` so the first run backfills
  from 2026-06-01. It advances only when a news PR merges. A rejected or pending PR
  leaves it alone, and dedupe (below) keeps that from producing repeats.
- **Dedupe covers open PRs too.** The spec skips ids in the feed and in closed,
  unmerged PRs. If last week's PR is still open, the next run would repeat its cards,
  so ids in open `news/*` PRs are skipped as well. Each news PR body carries a
  `Card ids:` line so ids can be read without parsing diffs.
- **Every card label shows the "not yet confirmed against primary sources" marker.**
  Spec §5 forbids a bare confident label until sources are read in a session, and
  nothing on a card has been. Cost if wrong: deleting one marker line.
- **No PR when nothing is new.** The run log says "no new results". Michael sees
  nothing that week, which is the honest output.
- **Seen = displayed.** On load, cards not in the seen list get *new*; then every
  displayed id is stored. A card is *new* on the first visit after it lands.
- **Schedule:** Mondays 08:00 in Michael's local timezone. Cost if wrong: one
  `/schedule` edit.

## Review Focus

1. A malformed `cards.json` written by the routine (duplicate id, unknown label,
   `http:`/`javascript:` URL, impossible date like `2026-02-30`, id month ≠ announced
   month) → `bin/news.js` exits non-zero naming the card and the rule; nothing is
   written. Pinned in Task 1.
2. `web/news.js` missing or `NEWS` undefined → the page shows "News didn't load." and
   the path still renders. Pinned in Task 2 (`newsModel(undefined)`) and Task 2's
   page test.
3. `localStorage` throws (private mode, blocked) → every card renders, all marked
   *new*, no exception. Pinned in Task 2 (page wraps both read and write).
4. Hostile text in a card (`<img onerror>` in a title) → shown as literal text. Pinned
   in Task 2 (page uses no `innerHTML`).
5. The routine can't push or open a PR → it fails loudly in its run log, never
   silently produces nothing. Pinned in Task 3 (`ROUTINE.md` must say so) and proved
   live in Task 4.

---

### Task 1: Card data, validator and generator

**Files:**
- Create: `news/cards.json`, `src/news/cards.js`, `bin/news.js`, `web/news.js` (generated)
- Test: `test/news/cards.test.js`

**Interfaces:**
- Consumes: `globalThis.TRUST_LABELS` from `web/lessons.js` (import for side effect in
  `bin/news.js` and tests only; `src/news/cards.js` takes the keys as a parameter so
  `src/` doesn't depend on `web/`).
- Produces:
  - `CLAIM_TYPES: string[]` = `['proof','counterexample','construction','other']`
  - `validateNews(doc: unknown, labelKeys: string[]) -> string[]` — empty when valid;
    each error names the card id (or index) and the rule.
  - `newsToJs(doc) -> string` — `` `globalThis.NEWS = ${JSON.stringify(doc, null, 2)};\n` ``
  - `bin/news.js`: reads `news/cards.json`, validates, writes `web/news.js`, prints
    `N cards, checked through YYYY-MM-DD`; on errors prints each and exits 1 without
    writing.
  - Document shape:
    ```json
    { "checkedThrough": "2026-05-31", "cards": [ {
        "id": "2026-09-navier-stokes",
        "announced": "2026-09-09",
        "title": "…",
        "claimants": ["…"],
        "aiSystem": "…" ,
        "claimType": "proof",
        "label": "unverified",
        "summary": "…",
        "sources": [{ "title": "…", "url": "https://…" }]
    } ] }
    ```
    `aiSystem` is a string or `null`. No other keys are allowed on a card or the
    document (catches routine typos).

- [ ] **Step 1: Write the failing tests** in `test/news/cards.test.js`

```js
const good = () => ({ checkedThrough: '2026-05-31', cards: [{
  id: '2026-09-navier-stokes', announced: '2026-09-09', title: 'Navier–Stokes (forced) claim',
  claimants: ['OpenAI'], aiSystem: 'GPT-5', claimType: 'proof', label: 'unverified',
  summary: 'A claimed proof about the forced version. Nobody independent has checked it yet.',
  sources: [{ title: 'Announcement', url: 'https://example.org/post' }],
}] });
const KEYS = Object.keys(globalThis.TRUST_LABELS);

test('a well-formed document has no errors', () => assert.deepEqual(validateNews(good(), KEYS), []));
test('the committed seed is valid and starts the window at 2026-05-31', …checkedThrough === '2026-05-31' and validateNews(committed) is []);
for (const [name, mutate, rule] of [
  ['duplicate id', (d) => d.cards.push({ ...d.cards[0] }), /duplicate/],
  ['unknown label', (d) => { d.cards[0].label = 'solved'; }, /label/],
  ['unknown claim type', (d) => { d.cards[0].claimType = 'theorem'; }, /claimType/],
  ['no sources', (d) => { d.cards[0].sources = []; }, /source/],
  ['http url', (d) => { d.cards[0].sources[0].url = 'http://x.org'; }, /https/],
  ['javascript url', (d) => { d.cards[0].sources[0].url = 'javascript:alert(1)'; }, /https/],
  ['impossible date', (d) => { d.cards[0].announced = '2026-02-30'; }, /date/],
  ['id month differs from announced', (d) => { d.cards[0].id = '2026-08-navier-stokes'; }, /month/],
  ['bad id shape', (d) => { d.cards[0].id = 'Navier Stokes'; }, /id/],
  ['empty claimants', (d) => { d.cards[0].claimants = []; }, /claimants/],
  ['missing aiSystem key', (d) => { delete d.cards[0].aiSystem; }, /aiSystem/],
  ['unknown card key', (d) => { d.cards[0].verified = true; }, /unknown/],
  ['empty summary', (d) => { d.cards[0].summary = ' '; }, /summary/],
  ['bad checkedThrough', (d) => { d.checkedThrough = 'last week'; }, /checkedThrough/],
]) test(`rejects ${name}`, () => { const d = good(); mutate(d); const e = validateNews(d, KEYS);
  assert.ok(e.some((m) => rule.test(m)), e.join('\n')); });
test('web/news.js carries exactly news/cards.json', …readFile web/news.js === newsToJs(JSON.parse(cards.json)), message 'web/news.js is stale — run: node bin/news.js');
test('bin/news.js exits 1 and writes nothing on an invalid file', …spawnSync node bin/news.js with env NEWS_CARDS pointing at a scratch invalid file and NEWS_JS at a scratch output path; assert status 1, stderr names the rule, output file absent);
```

(`bin/news.js` reads `process.env.NEWS_CARDS ?? 'news/cards.json'` and
`process.env.NEWS_JS ?? 'web/news.js'`, relative to the repo root, so the test never
touches committed files.)

- [ ] **Step 2: Run** `node --test test/news/` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/news/cards.js` and `bin/news.js`. Create
  `news/cards.json` as `{"checkedThrough":"2026-05-31","cards":[]}` (pretty-printed,
  trailing newline). A date is valid when it matches `^\d{4}-\d{2}-\d{2}$` and
  round-trips through `new Date(s + 'T00:00:00Z').toISOString().slice(0,10)`. Ids
  match `^\d{4}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$`. Run `node bin/news.js` to generate
  `web/news.js`.
- [ ] **Step 4: Run** `node --test` — Expected: all pass (152 + new).
- [ ] **Step 5: Commit** `feat: add news card data, validator and web/news.js generator`

### Task 2: News on the home page

**Files:**
- Create: `web/news-model.js`
- Modify: `web/index.html` (the `#news` section and scripts), `web/site.css` (card styles)
- Test: `test/web/news.test.js`, `test/web/home.test.js`

**Interfaces:**
- Consumes: `globalThis.NEWS` (Task 1 shape), `globalThis.TRUST_LABELS`.
- Produces: `globalThis.newsModel(news, seenIds: string[], labels) -> null | Card[]`.
  `null` when `news` is not an object with a `cards` array (didn't load). Otherwise
  cards sorted by `announced` descending, then `id` ascending, each:
  `{ id, announced, title, byline, claimTypeText, labelText, isUnverified, summary, sources, isNew }`.
  - `byline`: claimants joined with ", ", then ` with ${aiSystem}` when non-null.
  - `claimTypeText`: `Proof` / `Counterexample` / `Construction` / `Other`.
  - `labelText`: `labels[label]`; `isUnverified`: `label === 'unverified'`.
  - `isNew`: id not in `seenIds`.

- [ ] **Step 1: Write the failing tests** in `test/web/news.test.js`

```js
test('null when NEWS did not load', () => { assert.equal(newsModel(undefined, [], TRUST_LABELS), null);
  assert.equal(newsModel({}, [], TRUST_LABELS), null); });
test('empty feed gives an empty list', () => assert.deepEqual(newsModel({ checkedThrough: '2026-05-31', cards: [] }, [], TRUST_LABELS), []));
test('newest first, ties by id', …three cards 2026-07-01 b, 2026-09-09 a, 2026-07-01 a → order [2026-09 a, 2026-07 a, 2026-07 b]);
test('new unless seen', …isNew true for unseen, false for an id in seenIds);
test('byline and label text', …byline 'OpenAI with GPT-5'; null aiSystem → 'Jane Doe'; labelText 'Unverified claim'; isUnverified true; claimTypeText 'Proof');
test('does not mutate the input', …deepEqual input before/after);
```

In `test/web/home.test.js` add:

```js
test('home loads news by script and renders through newsModel', () => {
  assert.match(html, /<script src="\.\/news\.js"><\/script>/);
  assert.match(html, /<script src="\.\/news-model\.js"><\/script>/);
  assert.match(html, /newsModel\(globalThis\.NEWS/);
  assert.match(html, /News didn.t load/);
  assert.match(html, /No news yet/);
  assert.doesNotMatch(html, /innerHTML/);
  assert.doesNotMatch(html, /News watch arrives in a later update/);
});
test('every localStorage access is inside try', () => {
  // each occurrence of localStorage sits in a try block
  for (const m of html.matchAll(/localStorage/g)) {
    const before = html.slice(0, m.index);
    assert.ok(before.lastIndexOf('try {') > before.lastIndexOf('}'), 'localStorage outside try');
  }
});
test('cards show the unconfirmed marker', () => assert.match(html, /not yet confirmed against primary sources/));
```

- [ ] **Step 2: Run** `node --test test/web/` — Expected: FAIL (newsModel undefined; html lacks news.js).
- [ ] **Step 3: Implement** `web/news-model.js` (classic script, assigns
  `globalThis.newsModel`). In `web/index.html`: load `./news.js` and `./news-model.js`
  after `./lesson-model.js`; replace the placeholder with a list rendered from
  `newsModel(globalThis.NEWS, seen, globalThis.TRUST_LABELS)`. Copy:
  - `null` → "News didn't load. Run `node bin/news.js` and reload."
  - `[]` → "No news yet. The weekly watch adds cards here after you merge its pull request."
  - Each card: date and claim type line, title, byline, label chip (`.unverified` when
    `isUnverified`) plus the unconfirmed marker, summary, source links
    (`rel="noreferrer"`), and a *new* tag when `isNew`.
  - Seen key: `workbench.seenNews` (JSON array). Read and write each in its own
    try/catch; on any failure treat seen as `[]` and skip the write.
  Card styles in `web/site.css` reuse existing tokens; the *new* tag uses `--accent`.
  The home page's hardcoded `'Unverified claim'` comparison for the path (P1 deferred
  minor) is out of scope; leave it.
- [ ] **Step 4: Run** `node --test` — Expected: all pass. Then open `web/index.html`
  in headless Chrome with a temporary `web/news.js` holding two sample cards (one
  carrying `<img src=x onerror=alert(1)>` in its title), screenshot at 500px and
  desktop, confirm the literal text shows, both are *new* on first load and not on
  reload. Restore `web/news.js` with `node bin/news.js` before committing.
- [ ] **Step 5: Commit** `feat: show news cards on the home page`

### Task 3: The routine's instructions

**Files:**
- Create: `news/ROUTINE.md`
- Modify: `CLAUDE.md` (Current Status: P2 row; file table rows for `news/`, `bin/news.js`, `web/news.js`, `web/news-model.js`; Development: `node bin/news.js`)
- Test: `test/news/routine.test.js`

**Interfaces:**
- Consumes: `bin/news.js` and the card shape (Task 1).
- Produces: the text the scheduled routine follows (Task 4 points the routine at it).

`news/ROUTINE.md` is a prompt for a cloud Claude Code agent with a fresh clone of
`mdevisser/calculator`. Its sections, in order:

1. **Who it's for.** Michael is new to formal math; summaries are 2–3 plain-words
   sentences, every symbol explained or avoided; CLAUDE.md's Teaching rules and
   Reporting Accuracy apply.
2. **Window.** From the day after `checkedThrough` in `news/cards.json` to today.
3. **Search.** AI-driven math results announced in the window: proofs, disproofs,
   constructions, Millennium Prize claims. Starting index: the Wikipedia list
   (URL from spec §8); for the seed run also the Washington Post Navier–Stokes
   coverage (2026-09-09) and the brainstorm list from spec §8, verbatim.
4. **Skip.** Ids already in `cards.json`; ids on the `Card ids:` line of any open
   or closed-unmerged `news/*` PR:
   `gh pr list --state all --search "head:news/" --json number,state,mergedAt,body --limit 200`.
   Topic-match too: a new id for a result already carded under another id is a
   duplicate.
5. **Write cards.** Shape and rules from Task 1. Cite the claim's own primary source
   where one exists, not only Wikipedia. Label from what sources say; when unsure,
   `unverified`. Never write "solved" or "proved" for an `unverified` card; say
   "claims".
6. **Ship.** Set `checkedThrough` to today. `node bin/news.js` and `node --test` must
   both pass, else stop and report the failure. Branch `news/<YYYY-MM-DD>`, commit
   `chore: news cards through <YYYY-MM-DD>`, push, `gh pr create --base main` with
   title `News: <n> new result(s) through <YYYY-MM-DD>`, body: one line per card
   (title, label) and a final line `Card ids: id1, id2`.
7. **Nothing new.** No branch, no PR; final message "no new results".
8. **Fail loudly.** If push or `gh pr create` fails, or `gh` is unauthenticated, the
   final message starts `NEWS WATCH FAILED:` with the command and its error. Never
   end a run silently.

- [ ] **Step 1: Write the failing test** `test/news/routine.test.js`:

```js
const md = await readFile(new URL('../../news/ROUTINE.md', import.meta.url), 'utf8');
for (const must of [/checkedThrough/, /node bin\/news\.js/, /node --test/, /news\/<YYYY-MM-DD>/,
  /gh pr list --state all/, /Card ids:/, /unverified/, /NEWS WATCH FAILED:/, /no new results/,
  /forced/, /dimension/, /Goemans/, /List_of_mathematical_discoveries_by_artificial_intelligence/])
  test(`ROUTINE.md covers ${must}`, () => assert.match(md, must));
```

- [ ] **Step 2: Run** `node --test test/news/routine.test.js` — Expected: FAIL (ENOENT).
- [ ] **Step 3: Write** `news/ROUTINE.md` and the CLAUDE.md edits.
- [ ] **Step 4: Run** `node --test` — Expected: all pass.
- [ ] **Step 5: Commit** `feat: add the news watch routine instructions` (CLAUDE.md in a
  separate `docs:` commit).

### Task 4: Ship and switch on the routine (Michael present)

This task has outward-facing steps; each needs Michael's go-ahead in the session.

- [ ] **Step 1:** Finish the branch (final review, fixes) and merge to `main`.
- [ ] **Step 2: Push `main`** (with Michael's OK). The routine clones `origin`, so it
  must see `news/ROUTINE.md` and `bin/news.js`.
- [ ] **Step 3: Create the routine** with `/schedule`: weekly, Mondays 08:00 local,
  repo `mdevisser/calculator`, prompt: "Follow news/ROUTINE.md in this repository
  exactly." Michael approves it.
- [ ] **Step 4: First run now** (the seed). Expected: a `news/<today>` PR with cards
  from 2026-06-01 on, or a `NEWS WATCH FAILED:` message. If it failed, fix access and
  re-run; the routine isn't relied on until a real PR exists.
- [ ] **Step 5: Review the seed PR with Michael** in a session: spot-check labels and
  Reporting Accuracy wording, merge what he wants, close the rest (closing = "not
  interested"). Pull, `open web/index.html`, confirm the cards show as *new*.
