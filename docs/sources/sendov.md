# Source dossier: Sendov's conjecture

Retrieved 2026-11-06. Every fact on `web/lessons/sendov.html` comes from this file.
**P** = primary source (the paper, the Lean repository, the author's own post).
**S** = secondary (coverage, encyclopedias).

## The claim in one sentence

Sendov's conjecture holds for every degree: if all the roots of a polynomial of
degree 2 or more lie in the closed unit disk, then each root has a critical point
(a root of the derivative) within distance 1 of it.

## Who and when

- **Lech Mazur**, *A Computer-Assisted Proof of Sendov's Conjecture*, dated
  **5 August 2026**. **P**
  https://www.proofatlas.ai/papers/sendov-conjecture/SENDOV_CONJECTURE_PROOF_AUGUST_5_2026.pdf
  - From its Generative-AI disclosure: "Generative AI played a substantial role in
    the discovery and derivation of the mathematics in this paper… The AI system used
    was OpenAI GPT-5.6 Pro." Mazur "served as curator and prompter" and "takes
    responsibility for the resulting manuscript and its claims."
  - Theorem 1.1: degree n ≥ 2, all zeros in the closed unit disk, every zero a has a
    zero w of p′ with |w − a| ≤ 1.
  - It reports that "a separate Lean 4 formalization proves the exact statement of
    Sendov's conjecture", and that the formal proof "is not a line-by-line
    verification of this manuscript".
- The Wikipedia AI-discoveries list says Mazur posted the proof "On 3 August". **S**
  The page says "early August 2026", and that the paper is dated 5 August.
- **Terence Tao**, *A digestion of the proof of Sendov's conjecture*, 12 August 2026.
  **P**
  https://terrytao.wordpress.com/2026/08/12/a-digestion-of-the-proof-of-sendovs-conjecture/
  - Mazur "was able to use an AI tool" to resolve the conjecture for all n ≥ 2.
  - Tao digested and simplified the argument and proved a stronger statement, which
    implies both Sendov's conjecture and the Phelps–Rodriguez conjecture.
  - He re-formalized it in Lean "using an AI agent": about 15,000 lines, against
    about 90,000 for the original formalization.
  - Degrees 5–200 rely on computer assistance (numerical checks, plus a
    Lean-verified bound).

## Trust-label evidence → **Computer-checked proof**, confirmed

- **Lean formalization:** https://github.com/teorth/sendov **P**
  - The README describes it as "A formalization of Sendov's conjecture and the
    Phelps–Rodriguez conjecture, in full generality."
  - The main theorem `Sendov.sendov` is the full statement for every n ≥ 2.
  - It has no `sorry` and no project axioms. It depends only on Lean's standard
    axioms (`propext`, `Classical.choice`, `Quot.sound`).
  - Size: 80 files, 15,152 lines.
  - On credit, the README says priority for the first proof and the first Lean
    formalization belongs to Mazur (ProofAtlas).
  - The Lean source was written by Claude Opus 5 under the author's direction.
- **Named expert review:** Tao's 12 August post above. That is one expert, not a
  community consensus.
- **Not refereed:** we found no peer-reviewed publication as of retrieval.

## Background facts used on the page

- **Origin:** the conjecture is attributed to Blagovest Sendov (around 1958–59). The
  1D fact behind it is Rolle's theorem: between two roots of a smooth curve there is
  a flat spot. **S** (MathWorld: https://mathworld.wolfram.com/SendovConjecture.html)
- **Earlier partial results, as cited in Mazur's paper §1:**
  - Brown and Xiang proved it through degree 8.
  - Tao proved it for all sufficiently high degrees (2020).
  **P** for the citation list. Tao's 2020 post:
  https://terrytao.wordpress.com/2020/12/08/sendovs-conjecture-for-sufficiently-high-degree-polynomials/

## Open questions we couldn't settle

- Whether the 3 August (Wikipedia) or 5 August (paper) date is the first public
  posting. Mazur's X post wasn't read.
- Any refereed publication.
