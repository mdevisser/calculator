# Calculator — Claude Code Context

A personal workbench for **understanding** the big AI-era math results: proofs,
disproofs and Millennium Prize claims. It is built on an exact-arithmetic verifier that
checks published counterexamples.

**The repo name is historical, not descriptive.** It began as a four-function browser
calculator. Don't propose renaming it.

## What this is

Michael is new to formal math and fascinated by the big problems AI is now taking on.
The repo exists to help him do two things:

1. **Follow the news.** When a result drops, know what was claimed, what kind of problem
   it is, how solid it is, and whether it's a big deal.
2. **Deconstruct how it was solved,** well enough to explain it himself.

**The learning happens back and forth in Claude Code sessions in this repo.** He asks,
Claude explains, and he pushes back. Each result gets a story-layout lesson page in
`web/lessons/`, and that page is the record of what has been understood. There is no
chat app and no LLM API in the repo.

The authoritative design is `docs/superpowers/specs/2026-11-04-learning-workbench-design.md`.
The verifier's own design is `docs/superpowers/specs/2026-08-28-verifier-harness-design.md`.

## Teaching rules

These apply both in sessions and on lesson pages. The failure Michael named is
**getting too technical and losing him**. If a lesson loses him, the lesson is wrong.

1. **Plain words first, symbols second.** Explain every symbol the first time it appears,
   with a real-number example (`3³ = 3×3×3 = 27`).
2. **One idea at a time.** Build up step by step and check he has followed before moving
   on. When he's lost, go **simpler, not faster**.
3. **Concrete before general.** Show a small worked case he can check, then state the
   general claim.
4. **Read before explaining.** A lesson's "key idea" and its trust label are written only
   from primary sources (the paper, the post, the Lean repository), never from secondary
   coverage. Until then the section stays visibly unwritten. An empty section is honest;
   a plausible guess is not.
5. **Every result carries a trust label and its sources.** The labels are `Refereed` ·
   `Computer-checked proof` · `Experts say correct` · `Unverified claim`.
6. **Sessions update the page.** A session that produces or changes lesson content
   writes it into the lesson page.

### Session workflow

- When Michael says "explain <result>", start from his level, not a mathematician's.
- Fill a lesson's `#key-idea` section (and drop its `data-pending="session"`) only once
  he has followed the explanation in the session.
- Flip `confirmed` to `true` in `web/lessons.js` only after reading the primary sources.
  If they don't support the label, change the label.
- A new result becomes a lesson only when he asks. Add it to `web/lessons.js` with
  `available: true` once its page exists.

## Current Status

**M1–M3 and P1–P4 are built** (P2's weekly runs are blocked; see below). The harness
and CLI run, and the suite is green. The home page shows the learning path and the
news, and all four lessons (Euler, Jacobian, Sendov, Navier–Stokes) are live. Their
key ideas are still to be worked out in sessions.

| | Contents |
|---|---|
| **M1–M3** ✅ | Exact arithmetic, harness, CLI, `euler/` and `dgg/` modules, the check ledger |
| **P1** ✅ | Home page with the path, `lessons.js` single source of truth, shared lesson header, Euler lesson, ledger moved to `checks.html` |
| **P2** (built, blocked) | News watch: cards on the home page, `bin/news.js` validator, `news/ROUTINE.md`. Routine "Math news watch (calculator)" runs Mondays 08:00 Vancouver (Opus, no connectors). Its runs fail loudly until the cloud environment allows fetching web pages (Wikipedia, arXiv, …) |
| **P3** ✅ | `jacobian/` module (exact polynomials, symbolic 3×3 determinant, collision check) on Alpöge's real map, and the Jacobian lesson with an exact try-any-point checker |
| **P4** ✅ | Sendov lesson (drag-the-dots picture) and Navier–Stokes lesson, both from source dossiers in `docs/sources/` |
| **M5** | Real DGG fixtures once sourced, continuing (the real Jacobian map is in, via P3) |

Plans live in `docs/superpowers/plans/`.

What is on disk:

| Path | What it is |
|---|---|
| `web/index.html` | home: the learning path and news cards |
| `web/lessons/` | one story-layout lesson per result: `euler.html` (+ `euler-check.js`), `jacobian.html` (+ `jacobian-check.js`, exact BigInt fractions and dual numbers), `sendov.html` (+ `sendov-picture.js`, float math for the picture only), `navier-stokes.html` |
| `docs/sources/` | one source dossier per lesson: every fact the page states, with URL, date retrieved, primary or secondary. Write the dossier before the page |
| `web/lessons.js` | lesson metadata: titles, path order, trust labels, `confirmed`, `checkedHere`, sources |
| `web/lesson-model.js` | pure functions from that data (plus `RESULTS`) to what the pages render |
| `web/lesson-header.js` | fills a lesson's trust label, "Checked here" badge and back/next nav |
| `web/site.css` | shared tokens and styles for home and lessons |
| `web/checks.html` | the check ledger: the verifier's verdicts, the dossier/ledger layout of the old spec §9 |
| `web/calculator.html` | the original calculator, kept and linked |
| `news/cards.json` | news cards, the source of record; `checkedThrough` is where the next weekly run starts |
| `news/ROUTINE.md` | the instructions the weekly cloud routine follows; edit this to change what it does |
| `bin/news.js` | validates `news/cards.json` and writes `web/news.js`; exits 1 on any bad card |
| `web/news.js`, `web/news-model.js` | generated card data for the page, and the pure function the home page renders it through |
| `bin/verify.js` | CLI: `--all`, or a single `<problem>/<fixture>` |
| `src/exact/` | `integer.js` (strict BigInt parsing, `ipow`) and `rational.js` (exact `p/q`) |
| `src/harness/` | `schema.js`, `verdict.js`, `runner.js`, `report.js`, `registry.js` |
| `src/problems/` | `euler/`, `dgg/` and `jacobian/` (`polynomial.js`, `matrix.js`), each exporting `verify(fixture)` |
| `fixtures/` | published counterexamples, unsourced candidates, negative controls |
| `results.json`, `web/results.js` | generated by `--all`, committed so the pages need no build |
| `src/news/` | `cards.js`: the card rules (`validateNews`) and `newsToJs` |
| `test/` | `node:test`, mirroring `src/` and `web/` |

"Checked here" appears on a lesson only when the lesson names a fixture and that
fixture's committed verdict is `CONFIRMED`. A test enforces this.

Every verdict carries a **search state** as well as a verdict: `not-required`,
`not-reached` (settled before any search began), `complete`, or `capped`. The ledger
prints the state the module reported and never reconstructs one from
`requiresSearch`/`exhaustive`.

The committed `results.json` is deterministic, with no timestamps and no timings, so a
run that changes nothing leaves the tree clean. A test re-runs the fixtures and asserts
the committed artifact still matches, so a stale page fails the suite. If you edit a
fixture, re-run `node bin/verify.js --all` and commit the artifacts with it.

## Tech Stack

- **Node** for compute, **static pages** for presentation, opened straight from disk:
  no build step and no server.
- **Zero runtime dependencies.** Tests use `node:test`.
- **Browser scripts are classic scripts that assign to `globalThis`.** `file://`
  blocks ES modules and `fetch`, so data loads by `<script src>`. Node tests import the
  same files for their side effect.
- **Exact arithmetic for anything that checks.** `src/` is BigInt and `Rational`
  throughout, with no float path, because results depend on exact cancellation. Browser
  checks (such as the Euler calculator) use BigInt too.
- **Floats only in pictures.** Interactive visualizations (such as Sendov's
  drag-the-dots) may use floating-point math. They carry the caption *"rounded math,
  fine for seeing, not proof"* and never produce a verdict, a trust label, or a ✅ that
  stands for verification.

## Architecture Decisions

- **Thin shared kernel, independent problem modules.** The only shared verifier code is
  exact arithmetic and the verdict contract. Problem modules share no domain types.
- **Not a generic conjecture framework.** Resist the urge.
- **Every problem module exports one function:** `verify(fixture) -> Verdict`.
- **One source of truth for lessons.** The home path and every lesson header render from
  `web/lessons.js`, so they cannot disagree.
- **Proof lessons don't re-check the proof.** The repo can't verify Sendov or
  Navier–Stokes. For those, the trust label carries the weight, and the page says so.

## Invariants — do not weaken these

**I1 — A universal claim not exhaustively established returns `INDETERMINATE`, never
`CONFIRMED`.** If a search hits a budget cap or cannot prove it covered the space, the
honest answer is "don't know." This is what stops the harness from flattering its input.

**I2 — `source` is mandatory on every fixture.** The DGG and Jacobian results are
unrefereed social-media posts. A verdict is never displayed without its provenance and
its exhaustiveness state.

**I3 — `REFUTED` means the math says no; `ERROR` means we say no.** A malformed fixture
or broken internal invariant must never render as `REFUTED`, which would report our bug
as a mathematical finding.

A corollary for tests: **a verifier that always passes is worthless.** Every problem
module ships negative fixtures that must return `REFUTED`. A mutation that doesn't flip
the verdict proves the check it targets is inert.

## Known Risk

Building is decoupled from sourcing. Each problem ships a hand-built synthetic fixture
whose answer is known by hand, and a fixture marked `"status": "unsourced"` returns
`INDETERMINATE` with reason `missing-source-data`.

Where DGG sourcing actually stands:

- **`dgg/juang-family-7-2-1` is CONFIRMED.** It is a genuine counterexample instance to
  Goemans' cost conjecture: fractional cost 125 against a cheapest congestion-good
  routing of 126. This was established here by exhaustive enumeration of all 8 routings,
  of which 4 are congestion-good. Its provenance is an unrefereed X post giving a
  three-parameter `(b, m, g)` family. The fixture is this repo's transcription of that
  post at `b=7, m=2, g=1`, and `source.note` says so. Verified locally, not published.
- **`dgg/rybin-2026` remains unsourced.** We do not hold the URL of Rybin's original
  announcement, so the fixture cites secondary coverage and carries no network data.

**`jacobian/alpoge-2026` is CONFIRMED on the real map.** The map and points are
transcribed verbatim from the Isabelle AFP entry and cross-checked term for term
against two Lean formalizations (`docs/sources/jacobian.md`). Alpöge's X post itself
was blocked to automated fetching and has not been read here; the fixture's
`source.note` says so.

## Reporting Accuracy

The Jacobian counterexample refutes the conjecture in **dimensions ≥ 3 only**; the
planar case remains open. A page reading "Jacobian conjecture: REFUTED" without that
qualifier is wrong.

The DGG result is **Goemans' cost conjecture**, not the Dinitz–Garg–Goemans theorem.
The theorem (1999), which says a congestion-good unsplittable routing always exists with
`y_a <= x_a + D`, is proven and untouched. Only the cost strengthening fell. Never
label this "Dinitz–Garg–Goemans: REFUTED".

The Navier–Stokes claim (OpenAI, September 2026) concerns the **forced** version. It is
an **unverified claim** whose priority is disputed. Never call it solved.

## Development

```bash
node bin/verify.js <problem>/<fixture>
node bin/verify.js --all
node bin/news.js                         # validate news cards, regenerate web/news.js
node --test                              # tests

open web/index.html                      # home, no server needed
open web/checks.html                     # the check ledger
python3 -m http.server 8000              # or serve, then visit /web/
```

## Git Conventions

Follow shared conventions from dev-config: `feat:`, `fix:`, `docs:`, `chore:`,
`refactor:`, `test:`. Keep commits focused, with one concern per commit.

## Security

No backend, no secrets, no API keys. All computation is local and offline.

If an LLM proposer is ever added (explicitly out of scope), its API key goes through
1Password per the global config. It is never hardcoded and never in a committed file.
