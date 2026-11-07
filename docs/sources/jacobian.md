# Source dossier: the Jacobian conjecture (dimension ≥ 3)

Retrieved 2026-11-06. Every fact on `web/lessons/jacobian.html` and in
`fixtures/jacobian/alpoge-2026.json` comes from this file. **P** = primary source (the
announcement, a formal verification, a Lean repository). **S** = secondary (coverage,
encyclopedias).

## The claim in one sentence

An explicit polynomial map from 3-dimensional space to itself has Jacobian
determinant identically −2, yet sends three different points to the same point. So
the Jacobian conjecture is false in dimension 3 and, by padding with extra untouched
variables, in every dimension above 3. The two-dimensional case is still open.

## Who and when

- **Levent Alpöge**, post on X: https://x.com/__alpoge__/status/2079028340955197566
  **P, not read here.** Automated fetching returned HTTP 402, and we didn't work
  around that.
  - Its time, decoded from the post id, is **2026-07-20 02:19 UTC**: the evening of
    19 July in the Americas. Coverage gives both dates. The page says "20 July 2026",
    matching the AFP entry.
- Credit as the AFP entry states it: "The announcement credits Akhil Mathew with
  prompting the question and the AI system Claude Fable with work leading to the
  map". Cureton's repository calls it "Levent Alpöge/Fable 5's counterexample". **P**
  (both, quoting the announcement)
- Coverage notes that no prompt transcript or search log shows how the work was
  divided between Alpöge, Mathew and the AI. **S**

## The map (verbatim)

From the AFP lemma `eval_alpoge_map`, with variables x, y, z:

1. `(1 + x*y)^3*z + y^2*(1 + x*y)*(4 + 3*x*y)`
2. `y + 3*x*(1 + x*y)^2*z + 3*x*y^2*(4 + 3*x*y)`
3. `2*x - 3*x^2*y - x^3*z`

- **Jacobian determinant:** identically −2 (AFP `alpoge_jacobian_det`; Cureton
  `jacobianDet_F`; Harrison `jacobian_det`).
- **Collision:** `(0, 0, −1/4)`, `(1, −3/2, 13/2)` and `(−1, 3/2, 13/2)` all map to
  `(−1/4, 0, 0)` (AFP `alpoge_collision`; Cureton `evalMap_F_p0/p1/p2`; Harrison
  `evalF_p₁/p₂/p₃`).
- **Degrees:** 7, 6 and 4 by our count; coverage disagrees on the third (4 or 5).
- **Cross-check:** all three formal sources write the map term for term the same
  way (Lean uses `X 0, X 1, X 2` and `C 4` for x, y, z and the constant 4).
- **Determinant 1:** scaling the first component by −1/2 gives determinant exactly
  1 and keeps the collision (AFP `normalized_alpoge_map`; Cureton's `G` uses the
  points `(1, −3/4, 13/4)` and `(−1, 3/4, 13/4)`).

## Trust-label evidence → **Computer-checked proof**, confirmed

- **Isabelle/HOL:** Arthur Freitas Ramos, David Barros Hulak and Ruy J. G. B. de
  Queiroz, *Formal Verification of an Explicit Counterexample to the Jacobian
  Conjecture*, Archive of Formal Proofs, 20 July 2026, BSD licence. **P**
  https://isa-afp.org/entries/Jacobian_Counterexample.html
  - It proves the determinant is identically −2, that three distinct rational
    points share an image, that the map has no polynomial inverse, and that
    padding gives counterexamples "in every finite dimension at least three".
  - "The development makes no claim about the two-dimensional conjecture."
- **Lean 4 (first public formalization):** Dean Cureton, `deancureton/jacobian`,
  created 2026-07-20 04:30 UTC, at the commit AFP cites, `0d4a921`. **P**
  https://github.com/deancureton/jacobian/tree/0d4a9212d874226ad81ce5a926becddfa94e6a88
  - Main theorem `not_jacobianConjecture_all_char`: over every field K, a polynomial
    self-map of K³ with unit Jacobian determinant need not be injective. There is
    also a specialization to ℂ.
  - No `sorry`. The file ends with `#print axioms`.
- **Lean 4 (second formalization):** Alex Harrison, `DrAlexHarrison/jacobian-anatomy`,
  created 2026-07-20, at commit `74808fb`. **P**
  https://github.com/DrAlexHarrison/jacobian-anatomy/tree/74808fb2e1c1691b0007576ba0508e5e7cdcb1e3
  - Its README calls it a "certificate (det ≡ −2 and non-injectivity over ℚ;
    axioms: `propext`, `Classical.choice`, `Quot.sound` only)".
  - It reports a build-and-axiom audit of Cureton's repository with the verdict
    "clean".
  - "Researched, computed, and written by Claude (Fable 5), directed by Alex
    Harrison."
- **Named experts:** coverage says many mathematicians checked it by hand, and that
  Terence Tao wrote a post digesting it. **S**; we haven't read Tao's post.
- **Not refereed:** we found no journal paper and no arXiv write-up by Alpöge. Coverage
  says a full write-up "will follow". **S**

## Background used on the page

- **Origin:** Ott-Heinrich Keller, *Ganze Cremona-Transformationen*, Monatshefte für
  Mathematik und Physik 47 (1939). Cited in the AFP bibliography. **P** for the
  citation. 2026 − 1939 = 87 years.
- **The conjecture:** a polynomial map of n-dimensional space (over a field of
  characteristic zero, such as the complex numbers) whose Jacobian determinant is a
  nonzero constant has a polynomial inverse. This is the AFP abstract's statement.
  **P**
- **In one dimension it's true:** a polynomial whose derivative is a nonzero constant
  is `ax + b`, which can be undone. Standard background. **S**, general reference
- **Unsettled 1939–2026:** coverage calls it an "87-year-old" conjecture; the AFP
  entry gives no earlier counterexample, and the 2D case is still open. **S**
- **Lean and Isabelle** are proof languages in which a small trusted kernel checks
  every step (same background as the Sendov dossier). **S**, general reference
- **Notation used on the page** (xy means x × y; x² means x × x) and the reading of
  −2 as "volume doubles and flips" are standard background. **S**, general reference
- **Coverage:** the Wikipedia list of AI mathematical discoveries **S**;
  arXiv:2608.19069 (a separate paper, by other authors, that discusses the example and
  notes n = 2 is open) **S**.

## What the page must say (CLAUDE.md Reporting Accuracy)

- Refuted in **dimension ≥ 3 only**; the two-dimensional case is open.
- Computer-checked (Isabelle and two Lean formalizations), not refereed.

## Open questions we couldn't settle

- The text of Alpöge's post (blocked to automated fetching).
- How the work was divided between Alpöge, Mathew and the AI.
- Tao's post (not read).
