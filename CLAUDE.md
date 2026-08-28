# Calculator — Claude Code Context

A counterexample verifier: exact-arithmetic checks of published mathematical
counterexamples, with their provenance.

**The repo name is historical, not descriptive.** It began as a four-function browser
calculator. Don't propose renaming it.

## Current Status

**Design approved, implementation not started.**

- `docs/superpowers/specs/2026-08-28-verifier-harness-design.md` — the authoritative
  design. Read it before proposing work.
- `index.html` — the original calculator, working. Relocates to `web/calculator.html`
  at M2.
- No `src/`, no tests, no `package.json` yet.

## What this is

The 2026 AI mathematics results — the Erdős unit-distance disproof, OpenAI Astra's ten
Lean-certified proofs, Alpöge's Jacobian counterexample via Claude Fable 5, Rybin's
Dinitz–Garg–Goemans counterexample via GPT-5.6 Pro — are all **counterexamples or
explicit constructions, not proofs**. A model proposes a candidate object; cheap exact
computation confirms or kills it.

The verifier is the buildable half, and it is ordinary math code. This repo builds it.

## Tech Stack

- **Node** for compute, **static page** for presentation — the shape of the Enzo
  simulation site that prompted this direction
- **Zero runtime dependencies**; `node:test` for tests
- **BigInt rationals throughout, no float path anywhere** — results depend on exact
  cancellation, and floats would produce right answers for wrong reasons
- No network, nothing async

## Architecture Decisions

- **Thin shared kernel, independent problem modules.** The only shared code is exact
  rational arithmetic and the verdict contract. Problem modules share no types beyond
  `Rational`.
- **Not a generic conjecture framework.** Three problems is not enough evidence to
  design an abstraction over them. Resist the urge.
- **Every problem module exports one function:** `verify(fixture) -> Verdict`.
- Superseded: the old "single file, no build step" constraint. Zero *runtime*
  dependencies survives; single-file does not.

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

## Milestones

| | Contents |
|---|---|
| **M1** | `exact/rational.js`, harness, `euler/` + fixtures + negative controls, tests, CLI |
| **M2** | Web results page rendering `results.json`; calculator moves to `web/calculator.html` |
| **M3** | `dgg/` — graph, path enumeration, exhaustiveness invariant, property test |
| **M4** | `jacobian/` — polynomial algebra, symbolic determinant |
| **M5** | Real DGG and Jacobian fixtures once sourced |

Sequenced so the harness is proven on math checkable by hand (Euler's sum of powers,
disproved by Lander & Parkin in 1966) before it meets math that isn't.

## Known Risk

Neither the DGG nor the Jacobian construction appears in secondary coverage — both
primary sources are X posts. Building is decoupled from sourcing: each problem ships a
hand-built synthetic fixture whose answer is known by hand, and a fixture marked
`"status": "unsourced"` returns `INDETERMINATE` with reason `missing-source-data`.

## Reporting Accuracy

The Jacobian counterexample refutes the conjecture in **dimensions ≥ 3 only**; the
planar case remains open. A page reading "Jacobian conjecture: REFUTED" without that
qualifier is wrong.

## Development

```bash
node bin/verify.js <problem>/<fixture>
node bin/verify.js --all
node --test                              # tests

open web/index.html                      # no server needed
python3 -m http.server 8000              # or serve, then visit /web/
```

## Git Conventions

Follow shared conventions from dev-config: `feat:`, `fix:`, `docs:`, `chore:`,
`refactor:`, `test:`. Keep commits focused — one concern per commit.

## Security

No backend, no secrets, no API keys. All computation is local and offline.

If an LLM proposer is ever added (explicitly out of scope for v1), its API key goes
through 1Password per the global config — never hardcoded, never in a committed file.
