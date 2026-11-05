# Learning Workbench — Design

**Date:** 2026-11-04
**Status:** Draft for approval
**Supersedes in part:** `2026-08-28-verifier-harness-design.md`. The harness, its
verdict contract and invariants I1–I3 survive unchanged. What changes is the
repo's purpose, its front page, and the milestones after M3.

## 1. Intent

Michael is new to formal math but fascinated by the big problems that AI is now
taking on, up to and including the Millennium Prize problems. The repo stops being
only a counterexample verifier and becomes his **personal workbench for
understanding these results**.

It has two jobs, in his words:

1. **Follow the news.** When a result drops, he can tell what was claimed, what kind of
   problem it is, how solid the claim is, and whether it is a big deal.
2. **Deconstruct how it was solved.** He sees the problem, the trick, and why it works,
   well enough that he could explain it himself.

It serves Michael first. Sharing with friends may come later, so lesson pages must make
sense without him there to narrate them, but they don't need polish for an audience.

**How it is used.** The learning itself happens **back and forth in Claude Code
sessions in this repo**: he asks, Claude explains, he pushes back. The repo holds what
makes those sessions good and what keeps each one from starting at zero: teaching
rules, a kept lesson page per result, runnable checks, and a weekly news feed. There is
no separate chat app and no LLM API integration.

## 2. Goals, non-goals, anti-goals

**Goals**

- One story-style lesson page per result, which he keeps and can reopen.
- A clickable learning path on the home page: **Euler → Jacobian → Sendov →
  Navier–Stokes**.
- Coverage of **proofs as well as counterexamples**.
- A weekly automated scan for new AI math results, which flags them as news cards.
- The existing verifier and results page **folded in**, so the exact checks become the
  "check it yourself" part of the lessons.

**Non-goals**

- Re-checking proofs. The repo can't verify Sendov or Navier–Stokes itself, and it
  says so. For those results the trust label carries the weight.
- A chat app, accounts, a server, or a build step.
- Attacking open problems, or an LLM proposer (still deferred, as in the old spec §2).
- Renaming the repo.

**Anti-goals: things that make this a failure even if it technically works**

- **Getting too technical and losing him.** This is the one he named. If a lesson loses
  him, the lesson is wrong, not the reader.
- **Overclaiming.** Calling something "solved" before it is, or dropping a qualifier.
  The Jacobian result holds in dimension ≥ 3 only. DGG is Goemans' *cost* conjecture.
  Navier–Stokes is an unverified claim about the *forced* version.
- **Invented explanations.** A "key idea" section written without reading the actual
  proof. An empty section is honest; a plausible guess is not.
- **A rounded picture presented as a check.** See §4.

## 3. Teaching rules

These rules govern both the sessions and the lesson pages. They go into `CLAUDE.md`,
which is rewritten around the new purpose and keeps the existing invariants and
reporting-accuracy rules.

1. **Plain words first, symbols second.** Every symbol is explained the first time it
   appears, with a real-number example (`3³ = 3×3×3 = 27`).
2. **One idea at a time.** Build up step by step. Check that he has understood before
   moving on, and when he's lost, go simpler rather than faster.
3. **Concrete before general.** Show a small worked case he can check, then state the
   general claim.
4. **Read before explaining.** A lesson's "key idea" and its trust-label details come
   from primary sources (the paper, the post, the Lean repository), not from secondary
   coverage. Until those have been read, the section stays visibly unwritten.
5. **Every result carries a trust label and its sources** (§5).
6. Sessions that produce or change lesson content update the lesson page, so the page
   is the record of what has been understood.

## 4. Constraints

- **Zero runtime dependencies; static pages; no build step.** Opening
  `web/index.html` from disk works, as it does today.
- **Verification code stays exact.** `src/` keeps BigInt or `Rational` throughout, with
  no float path. I1, I2 and I3 are unchanged.
- **Floats are allowed only in visualizations, and are labelled.** Interactive pictures
  such as Sendov's drag-the-dots use floating-point math. They are captioned *"rounded
  math, fine for seeing, not proof"*, and they never produce a verdict, a trust label
  or a ✅ that stands for verification. This is a deliberate, scoped relaxation of
  "no float path anywhere", which keeps its force for `src/`.
- **Exact checks in the browser use BigInt.** For example, Euler's
  "change a number, watch it break" calculator.
- `results.json` stays deterministic and committed, and the staleness test stays.

## 5. Trust labels

Each result shows exactly one primary label. A result the repo also checked itself
additionally shows a "Checked here" badge.

| Label | Meaning | Example |
|---|---|---|
| **Refereed** | Published in a peer-reviewed venue | Euler (Lander & Parkin 1966) |
| **Computer-checked proof** | A Lean (or similar) formalization exists | Sendov |
| **Experts say correct** | Named outside experts have publicly checked it | Jacobian ("verified by several independent mathematicians") |
| **Unverified claim** | No independent confirmation yet | Navier–Stokes |

**Checked here** is shown only when the repo's own verifier returns `CONFIRMED` for
that result's fixture, and the badge links to the verdict.

Every label's wording is confirmed against primary sources while the lesson is written.
The examples above come from secondary coverage (the Wikipedia list of AI mathematical
discoveries, retrieved 2026-11-04) and are not yet confirmed.

**Unconfirmed labels** *(builder's-call settled during review)*. A label also carries a
`confirmed: true|false` state. While it is false, the label shows with a visible
*"not yet confirmed against primary sources"* marker, as in the Sendov mockup. It is
never shown as a bare, confident label. Once primary sources have been read, the label
becomes confirmed, and if they don't support it, it is changed. A result whose label
can't be determined at all uses **Unverified claim**.

**One source of truth.** Lesson metadata lives in one data file, `web/lessons.js`, and
both the home path and each lesson's header render from it, so the two can't disagree.
Each lesson has a slug, title, path position, label, confirmed state, the "Checked here"
fixture id, and sources. A test asserts that every lesson page exists, that every label
has at least one source, and that "Checked here" appears only where the named fixture's
committed verdict is `CONFIRMED`.

## 6. Pages

### 6.1 Home: `web/index.html`

It replaces today's verifier page as the front door and contains:

- **The learning path.** Four clickable steps, each opening its lesson and showing that
  lesson's trust label.
- **News cards** (§7), newest first. Cards he hasn't seen are marked *new*. "Seen" is
  remembered per browser in `localStorage`, wrapped in try/catch so the page works
  without it.
- **A link to the full check ledger** (§6.3) and to `calculator.html`.

### 6.2 Lessons: `web/lessons/<slug>.html`

These are hand-written static HTML in the **story layout** (Michael chose layout A in
the terminal, over the step ladder and the side-by-side layouts), read top to bottom. Each
lesson has these sections, in this order:

1. **Trust label** (plus "Checked here" where applicable), with date and claimants.
2. **The question, in plain words.**
3. **What was found or claimed.**
4. **Check it yourself** (counterexamples) or **See it for yourself** (proofs).
5. **The key idea.** The "aha" step, in plain words, written only from the primary
   source.
6. **Why it matters.**
7. **What's still open.**
8. **Sources.**

There are back and next links along the path, plus a link home.

**What the build writes, and what sessions write** (Michael's decision). The build
ships each lesson with these filled in:
- the question in plain words
- what was found or claimed
- the check-it or see-it piece
- sources
- trust labels confirmed against primary sources

**"The key idea" ships visibly blank on every lesson.** Michael and Claude work it out
in sessions and write it in as he comes to understand it. "Why it matters" and "what's
still open" may ship as short factual drafts, and sessions deepen them. Euler is the
exception for the parts already drafted during brainstorming. Its key idea (finding is
hard, checking is easy) is also left for a session, so the first lesson exercises the
workflow. A lesson milestone is "done" when its page structure, check or picture, facts,
labels and sources are in place, not when its key idea is written.

### 6.3 The check ledger: `web/checks.html`

Today's dossier/ledger results page moves here mostly unchanged and keeps rendering
`results.js`. Lessons link to their problem's panel, and the "Checked here" badges point
into it.

## 7. The four lessons

### Euler (`euler.html`)

The content is drafted already, in the brainstorm screens `euler-why.html` and
`euler-spreadsheet.html`:

- Start with cubes, `3³+4³+5³=6³`, and the fact that two cubes can never sum to a cube.
- Euler's 1769 guess, then why nobody could settle it: proving it means infinitely many
  cases, and disproving it means about 20M combinations even under 150.
- 1966: `27⁵+84⁵+110⁵+133⁵=144⁵`, found by Lander & Parkin on a CDC 6600.
- **Check it yourself:** an exact BigInt calculator. He changes a number and watches
  it break.
- **Spreadsheet step:** reproduce the 5th-power identity in a spreadsheet, where it
  works. Then type `=422481^4` and `=B1+1-B1`, and the spreadsheet answers `0`, because
  it keeps about 15 digits. This teaches why the repo never rounds.
- Why it matters: it is the template for the 2026 results (finding is hard, checking
  is easy). Elkies' 1986 4th-power case. Sixth powers and higher are still open.
- Trust: Refereed + Checked here, using the existing `euler/` fixtures.

### Jacobian (`jacobian.html`)

- A counterexample in dimension 3, announced July 2026 by Alpöge and Mathew with Claude
  Fable 5. **The qualifier "dimension ≥ 3; the planar case is open" appears in the
  label and the first paragraph.**
- **Check it yourself** needs the `jacobian/` module that was M4 in the old spec,
  §5 v3: polynomial algebra, the exact symbolic determinant, the constant-nonzero
  check, and the collision `F(p)=F(q)`. It is built here as specified there, with its
  synthetic fixture and negative controls.
- **Sourcing:** transcribe the real map from the primary source into a fixture with
  full provenance. If the map can't be sourced, the lesson runs on the synthetic toy
  map, says plainly that it is a stand-in, and leaves "Checked here" off.
  *(Builder's call, settled during review.)* The milestone is scoped for the stand-in
  path. Building on the real map is a follow-on step when a source turns up, either
  through a web search at build time or a link Michael supplies; X posts may need him
  to fetch them. Secondary coverage credits both Alpöge and Akhil Mathew; the fixture's
  `source` uses whatever the primary source states.

### Sendov (`sendov.html`). First proof lesson.

- **See it for yourself:** the drag-the-dots picture prototyped in the brainstorm
  screen `sendov-mockup.html`. Roots in the unit disk; critical points ("flat spots")
  computed live; a line from each root to its nearest flat spot, green at ≤ 1. Float
  math, labelled per §4.
- **Key idea:** written only after reading the proof (§3 rule 4).
- Trust: Computer-checked proof, with Tao's review noted, once confirmed against
  primary sources.

### Navier–Stokes (`navier-stokes.html`)

- Labelled **Unverified claim**.
- Covers:
  - what the Millennium problem asks, in plain words
  - why it is hard
  - what OpenAI claimed in September 2026, and that it concerns **the forced version**
  - that priority is disputed
  - that the Clay Institute does not consider a solution until two years after
    publication
  - why nobody can confirm it yet
- No "key idea" beyond what has actually been published and read.
- Any picture is optional (builder's call), and labelled per §4 if it is used.

## 8. The news watch

- **Cadence:** weekly (Michael's choice: on a schedule, flag for him).
- **Mechanism:** a scheduled Claude Code cloud routine (`/schedule`) against
  `origin` (`mdevisser/calculator`). Each run:
  1. searches for AI-driven math results announced since the last run, covering proofs,
     disproofs, constructions and Millennium Prize claims;
  2. skips anything already in the feed;
  3. writes a card for each new find;
  4. opens a PR on a `news/<YYYY-MM-DD>` branch through the `gh` CLI.

  Nothing lands on the page until he merges.
- **Storage:** `news/cards.json` is the source of record, and a generated
  `web/news.js` lets the page load without fetch, mirroring `results.json` →
  `web/results.js`. A test asserts the two match, as the results staleness test does.
- **Card fields:** id, date announced, title, claimants (people and AI system), claim
  type (proof / counterexample / construction / other), trust label, a 2–3 sentence
  plain-words summary, and sources (at least one URL, which is mandatory, as in I2).
- **The routine follows the teaching rules:** plain words, no overclaiming, and trust
  labels from what the sources actually say. When it can't tell, it uses Unverified
  claim.
- A card becomes a lesson only when Michael asks in a session. The watch flags
  results; the learning stays a conversation.
- **Rejected cards** *(builder's call)*. Before writing a card, the routine lists
  closed, unmerged `news/*` PRs with `gh` and skips any card id that appeared in one.
  Closing a news PR therefore means "not interested", and those cards don't come back.
  Card ids are stable slugs (`<yyyy-mm>-<short-topic>`).
- **Setup** *(builder's call)*. The plan includes creating the routine with `/schedule`
  while Michael is present to approve it. It also includes a first manual run that must
  open a real PR, which proves the routine's GitHub access before it is relied on. If
  the routine can't push or open a PR, it must fail loudly in its run log rather than
  silently produce nothing.
- **Seed** *(builder's call)*. The seed is the routine's first run, with its search
  window opened back to 2026-06-01, so the backfill also tests the routine. The
  starting index is the Wikipedia "List of mathematical discoveries by artificial
  intelligence" (en.wikipedia.org/wiki/List_of_mathematical_discoveries_by_artificial_intelligence),
  plus the Washington Post coverage of the Navier–Stokes claim (2026-09-09). Each card
  must cite the claim's own primary source where one can be found, not only the
  Wikipedia list. The results noticed during brainstorming are:
  - Crouzeix's conjecture
  - zeta zeros
  - the Hopf / 6-sphere claim
  - the 186 prime-gap claim
  - Fermat's Last Theorem in Lean
  - the Epoch/Astra batch of results
  - the 3SUM / APSP algorithms
  - the Exponential Time Hypothesis claims
  - the Yang–Mills rumour, labelled Unverified claim

## 9. What stays from the old design

- The harness, CLI, verdict contract, `searchState`, and I1–I3, all unchanged.
- The `euler/` and `dgg/` modules and their fixtures, which keep running and stay in the
  ledger.
- The DGG work has no lesson on the current path. It remains in the ledger and is a
  natural future lesson.
- **M5** (sourcing the real DGG and Jacobian fixtures) continues. The Jacobian sourcing
  is pulled forward into §7.

## 10. Left to the builder

- Visual styling. Extend the existing page's tokens (`--paper`, `--accent`, the light
  and dark themes) so home, lessons and ledger read as one site.
- The exact lesson copy, within §3. Michael reviews the copy.
- Internals of the Jacobian module, per the old spec §5 v3.
- Whether Navier–Stokes gets a picture.
- Milestone order. A sensible order is home + ledger move, then Euler, then the news
  watch, then Jacobian, then Sendov, then Navier–Stokes. The builder may reorder.
