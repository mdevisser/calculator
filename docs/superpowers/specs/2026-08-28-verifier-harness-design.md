# Counterexample Verifier Harness — Design

**Date:** 2026-08-28
**Status:** Approved design, pending implementation plan
**Repo:** `calculator` (name retained; now historical rather than descriptive)

## 1. Context

The repo is currently a single-file, four-function browser calculator. It is being
redirected toward understanding and eventually solving larger math problems.

The direction is drawn from the 2026 AI mathematics results — the Erdős unit-distance
disproof, OpenAI Astra's ten Lean-certified proofs, Alpöge's Jacobian counterexample
via Claude Fable 5, and Rybin's Dinitz–Garg–Goemans counterexample via GPT-5.6 Pro.
Every one of those is a **counterexample or explicit construction, not a proof**: a
model proposes a candidate object, and cheap exact computation confirms or kills it.

The verifier is the buildable half, and it is ordinary math code. This project builds
that half.

## 2. Goals and non-goals

**Goal:** independently verify published counterexamples with exact arithmetic, and
publish the verdicts with their provenance.

**Non-goals for v1, deliberately:**

- **No LLM proposer.** Candidates are typed in as fixtures. A proposer earns its place
  only once the verifier is trustworthy; building both at once means debugging two
  unreliable halves simultaneously.
- **No attack on open problems.** v1 reproduces results whose answers are public, so a
  broken verifier is detectable.
- **No generic conjecture framework.** Three problems is not enough evidence to design
  an abstraction over them.

## 3. Architecture

Thin shared kernel, independent problem modules. The only genuinely shared code is
exact rational arithmetic and the verdict contract. `dgg/` and `jacobian/` share no
types beyond `Rational`; unifying "candidate" across a flow network and a polynomial
map would produce an interface describing nothing.

```
bin/verify.js                  CLI entry
src/harness/runner.js          load fixture -> dispatch -> collect
src/harness/verdict.js         the contract in §4
src/harness/schema.js          fixture validation, runs before any arithmetic
src/harness/report.js          terminal output + results.json
src/exact/rational.js          BigInt p/q, exact; no float path anywhere
src/problems/euler/            index.js
src/problems/dgg/              index.js, graph.js, enumerate.js
src/problems/jacobian/         index.js, polynomial.js, matrix.js
fixtures/<problem>/*.json      candidates and negative controls
test/                          node:test, mirrors src/
web/index.html                 renders results.json
web/calculator.html            the original calculator, kept and linked
results.json                   generated, committed so the page needs no build
```

**Platform:** Node for compute, static page for presentation — the shape of the Enzo
site that prompted this direction. Zero runtime dependencies; `node:test` for tests;
BigInt for exactness. No network, nothing async in v1.

Every problem module exports exactly one function: `verify(fixture) -> Verdict`.

## 4. The verdict contract

```js
{
  problem: 'dgg', fixture: 'rybin-2026',
  claim: 'no unsplittable rounding matches fractional cost within congestion budget',
  verdict: 'CONFIRMED' | 'REFUTED' | 'INDETERMINATE' | 'ERROR',
  checks: [{ name, pass, expected, actual }],
  exhaustive: true, searched: 4096, elapsedMs: 12,
  source: { url, author, date, peerReviewed: false }
}
```

The contract also carries `searchState`, added in M3. It exists because `requiresSearch:
true, exhaustive: false` is ambiguous: a module may have stopped before searching (the
instance was already refuted), been capped by a budget, or had no candidate data at all.
Those are different facts and the results page must not conflate them — displaying a
false search state is worse than displaying none. The runner moves it to the capped
state alongside any I1 downgrade, so a module that bypasses `decide()` cannot leave a
stale one behind.

Known residue: `exhaustive`, `requiresSearch` and `searchState` overlap, and nothing
asserts they stay mutually consistent. A runner-level assertion is worth adding.

Two invariants, which are the point of the whole design:

**I1 — A universal claim not exhaustively established returns `INDETERMINATE`, never
`CONFIRMED`.** If a search hits a budget cap or cannot prove it covered the space, the
honest answer is "don't know." This is what stops the harness from flattering its
input.

**I2 — `source` is mandatory on every fixture.** The DGG and Jacobian results are
unrefereed social-media posts. A verdict is never displayed without its provenance and
its exhaustiveness state.

A third rule governs failure: **`REFUTED` means the math says no; `ERROR` means we say
no.** A malformed fixture, schema violation, or broken internal invariant must never
render as `REFUTED` — that reports our bug as a mathematical finding.

## 5. Problem modules

Sequenced so the harness is proven on math that can be checked by hand before it meets
math that cannot.

### v1 — `euler/` (warm-up)

Euler's sum of powers conjecture (1769): no `k`-th power is the sum of fewer than `k`
positive `k`-th powers. Stood 197 years; disproved by Lander and Parkin in 1966 by
computer search — the same story as 2026, at a scale a person can audit.

Checks: all terms positive integers; `terms.length <= k - 1`; and
`sum(t_i^k) === rhs^k` exactly.

Two fixtures, both verified exact during design:

| Fixture | k | Identity |
|---|---|---|
| `lander-parkin-1966` | 5 | `27^5 + 84^5 + 110^5 + 133^5 = 144^5 = 61,917,364,224` |
| `elkies-1988` | 4 | `2682440^4 + 15365639^4 + 18796760^4 = 20615673^4` |

The Elkies identity evaluates to `180630077292169281088848499041`, far beyond `2^53`.
It exists in the suite specifically to prove the exact-arithmetic core is load-bearing
rather than decorative — under floats it would pass for the wrong reason.

No search, so `exhaustive` is `n/a` and I1 does not bind.

### v2 — `dgg/`

**Goemans' cost conjecture** (also called the DGG cost conjecture). Naming matters
here: Dinitz, Garg and Goemans (1999) *proved* the congestion result — given a
feasible fractional flow `x`, an unsplittable routing always exists with
`y_a <= x_a + D` on every arc, where `D` is the maximum single demand. **That theorem
stands and is not what fell.** Goemans conjectured the strengthening: that such a
routing can simultaneously be no more expensive than the fractional flow. Rybin's
2026 counterexample refutes the strengthening only.

The claim verified is therefore: for the given cost vector `c`, every congestion-good
unsplittable routing costs strictly more than `c·x`. The congestion bound is per-arc
and relative to `x` itself — the fractional flow doubles as the capacity vector —
not a flat budget.

The claim is universally quantified, so the module proves a negative:

1. Validate network and claimed fractional flow — conservation, capacity, cost.
2. Enumerate simple `s -> t` paths per terminal; a routing is one path per terminal, so
   the space is the product of per-terminal path counts.
3. Score each routing: per-arc load, congestion against `d_max`, total cost.
4. The counterexample stands iff `min(cost within budget) > fractional cost`.

**Exhaustiveness is a computed invariant, not a comment.** `enumerate.js` returns
`{routings, total}`, where `total` is computed independently as the product of
per-terminal path counts, and the verifier asserts `routings.length === total`.
Disagreement, or a tripped budget cap, yields `INDETERMINATE` per I1.

### v3 — `jacobian/`

The Jacobian conjecture: a polynomial map with constant nonzero Jacobian determinant is
invertible. No search; heavier algebra.

1. Polynomials as sparse maps, exponent tuple -> `Rational`. Three variables, degree 7.
2. Differentiate formally for the Jacobian matrix; expand the 3×3 determinant exactly.
3. Assert the determinant is a *constant* polynomial and nonzero.
4. Evaluate at two given points; assert `p != q` and `F(p) = F(q)`.

Step 2 is where floats would be fatal: the determinant of a matrix of degree-6 entries
reaches degree 18 before terms cancel, and the result depends entirely on exact
cancellation to a constant.

**Reporting requirement:** this refutes the conjecture for dimensions >= 3 only. The
planar case remains open. A results page reading "Jacobian conjecture: REFUTED" without
that qualifier is wrong.

## 6. Fixtures and the sourcing risk

**Known risk:** neither the DGG nor the Jacobian construction appears in secondary
coverage. Both primary sources are X posts — Rybin's chat log and Alpöge's single-post
map. A follow-up from Hensen Juang gives a 3-parameter family for the DGG graph
(7 nodes `s, u, v, w, t1, t2, t3`, capacities and costs in terms of `b, m, g`), but it
did not reconcile to Rybin's 58/60 numbers in a quick check and may be a different
member or a different construction.

**Mitigation — building is decoupled from sourcing.** Each problem ships a
hand-constructed synthetic fixture whose answer is known by hand: a tiny flow network,
and a toy polynomial map with a deliberate collision. These exercise every code path
end to end. Real fixtures drop in as data without touching code.

A fixture marked `"status": "unsourced"` returns `INDETERMINATE` with reason
`missing-source-data`. The harness runs green on what it has and stays honest about
what it does not.

## 7. Error handling

Schema validation precedes all arithmetic. A fixture missing `source` fails it outright
per I2. Validation failures, unreadable fixtures, and internal invariant breaches all
produce `ERROR` with a reason code — never `REFUTED`.

Budget caps are configurable per problem via `--budget`, defaulting to `1_000_000`
enumerated routings — three orders of magnitude above the ~4,096 a seven-node network
is expected to produce, and low enough to terminate. Exceeding the cap is
`INDETERMINATE`, not failure.

## 8. Testing

Built on the premise that **a verifier that always passes is worthless.**

- **Exact-arithmetic units** — rationals and polynomial operations against
  hand-computed values, including normalization and zero-denominator guards.
- **Negative fixtures, mandatory per problem.** Perturbed copies that must return
  `REFUTED`: change `27` to `28` in the Euler identity; bump an arc capacity until a
  cost-58 routing exists; change a coefficient so `det J` stops being constant; set
  `p = q` so the collision is vacuous. A mutation that does not flip the verdict proves
  the check it targets is inert.
- **Exhaustiveness tests** — a graph small enough to count routings by hand, asserting
  both `total` and `searched` equal the hand count.
- **Budget test** — force a low cap, assert `INDETERMINATE` and never `CONFIRMED`. The
  most important test in the suite; it guards I1.
- **Property test** — on random small networks, minimum unsplittable cost is always
  `>=` fractional cost, since the fractional problem is a relaxation. A violation means
  the enumerator is broken, not that a conjecture fell.

## 9. Web results page

Layout follows the approved study: **dossier shell, ledger body, certificate on
demand.** One panel per *problem*, stating the conjecture in prose so the page explains
itself; candidates listed as ledger rows inside each panel; the computation trace behind
a per-row disclosure. Negative controls stay cheap to display, and exhaustiveness
evidence sits one click from the verdict rather than being absent or unavoidable.

Renders `results.json` directly. No build step.

## 10. Milestones

| Milestone | Contents |
|---|---|
| **M1** | `exact/rational.js`, harness (schema, verdict, runner, report), `euler/`, both Euler fixtures plus negative controls, tests, CLI |
| **M2** | Web results page rendering `results.json`; calculator relocated to `web/calculator.html` and linked |
| **M3** | `dgg/` with synthetic fixture, enumeration, exhaustiveness invariant, property test |
| **M4** | `jacobian/` with synthetic fixture, polynomial algebra, symbolic determinant |
| **M5** | Real DGG and Jacobian fixtures once sourced |

M1 and M2 are independently useful: a working, tested, honest harness over a
counterexample anyone can check by hand.

## 11. Consequences

- `CLAUDE.md`'s Phase 1–5 roadmap is superseded and must be rewritten, not extended.
- The "no build step, single file, zero dependencies" constraint survives only in part:
  zero runtime dependencies holds, single-file does not.
- The existing calculator is retained at `web/calculator.html` rather than deleted.
