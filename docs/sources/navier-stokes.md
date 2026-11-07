# Source dossier: Navier–Stokes (forced version)

Retrieved 2026-11-06. Every fact on `web/lessons/navier-stokes.html` comes from this
file. **P** = primary source, **S** = secondary.

## The claim in one sentence

OpenAI claims a proof that, for every viscosity, a smooth outside push (a "force")
can make a fluid that starts at rest develop infinite speed in finite time, while its
total energy stays bounded. That is Clay's alternative (C), and by extension (D).

## The problem as Clay states it

C. Fefferman, official problem description:
https://www.claymath.org/wp-content/uploads/2022/06/navierstokes.pdf **P**

A solution must prove one of four statements:

- **(A) and (B):** existence and smoothness, with the force f "identically zero", on
  ℝ³ and on the periodic box ℝ³/ℤ³.
- **(C) and (D):** "Breakdown". There exist smooth starting data and **a smooth
  f(x, t)** with no global solution, on ℝ³ and on the periodic box.

So the breakdown alternatives allow a force, while the smoothness alternatives don't.

## What OpenAI claimed, and when

- **Paper:** *Finite Time Blowup for Navier–Stokes*, author "OpenAI", 165 pages. **P**
  https://cdn.openai.com/pdf/32d9f210-8b73-45e0-91bc-82a30aef8a9a/navier-stokes.pdf
  - Abstract: "For every positive viscosity, we construct a solution of the
    three-dimensional incompressible Navier–Stokes equations that starts from rest and
    develops unbounded velocity in finite time while maintaining uniformly bounded
    kinetic energy."
  - Introduction: "with zero initial velocity and a smooth force compactly supported in
    space and time". It "establishes alternative (C)… [and] alternative (D)".
- **Lean repository:** https://github.com/openai/NavierStokesAndEuler, created
  2026-09-08. **P**
  - The README says: "There exist smooth initial data **and forcing** for which no
    global smooth solution with uniformly bounded kinetic energy exists."
  - The repository also has a separate result: blow-up for the **unforced** Euler
    equations, the frictionless cousin of Navier–Stokes, which is not a Clay problem.
- **Announcement:** https://openai.com/index/navier-stokes-solution/ dated
  2026-09-08, updated 2026-09-10. We couldn't read it: the site blocks automated
  fetches, and we didn't work around that. Its date and update come from the
  Wikipedia controversy article. **S**
- **The AI system:** an unreleased internal OpenAI model, which coverage describes as
  more capable than GPT-6 Astra. **S** (Wikipedia AI-discoveries list, citing
  Scientific American and Wired)

## Trust-label evidence → **Unverified claim**, confirmed

- **Clay Institute, statement of 11 September 2026:** it refers to "the announcement
  that the Navier-Stokes problem has apparently been settled", and says "The process is
  deliberately unhurried, but we will provide updates." It names no one and accepts
  nothing. **P** https://www.claymath.org/news/navier-stokes-announcement
- **Clay rules:** "at least two years must have passed since publication", and "the
  proposed solution must have received general acceptance in the global mathematics
  community". **P** https://www.claymath.org/millennium-problems/rules/
- **Bastounis, Circelli and Hansen**, *Navier-Stokes lost in translation: Why Lean verification of AI autoformalisation does not guarantee correct natural language proofs*, arXiv:2610.08144, 6 October 2026. **P**
  - They argue that "the formalised Lean proof does not correspond to the NL
    [natural-language] proof of blow-up".
  - That is, the Lean check does not certify the written paper.
  - They don't claim the Lean code fails to compile.
  - https://arxiv.org/abs/2610.08144
- **Independent rebuilds of the Lean code:** search-result coverage mentions them, but
  we have no named source, so **the page does not mention them**. **S**, unnamed

## The priority dispute

- **Tristan Buckmaster's statement**, made public on the evening of 7 September 2026 in New York. The PDF's creation time is 2026-09-08 02:38 UTC, hours before OpenAI's noon announcement on 8 September (that time is from the Wikipedia controversy article). **P**
  https://cims.nyu.edu/~tristanb/statement.pdf
  - He and Levent Alpöge released "finite-time blowup with smooth forcing" results for
    porous media, Boussinesq and 3D incompressible Euler.
  - They obtained the Boussinesq and Euler results on 15 August, and verified them in
    Lean on 22 August. The porous-media result came earlier.
  - Credit for the program's "basic idea" goes to Diego Córdoba and Luis
    Martínez-Zoroa.
  - He says they used several LLMs, including OpenAI's Codex.
  - He describes outside pressure around the timing, "with Levent having received
    tips that information about our progress had been passed to OpenAI". That is
    second-hand, and the page reports it as a tip.
- **Tao's post on the Buckmaster–Alpöge results, 7 September 2026.** **P**
  https://terrytao.wordpress.com/2026/09/07/finite-time-blowup-with-smooth-forcing-term-for-the-incompressible-porous-medium-boussinesq-and-incompressible-euler-equations
- **OpenAI's position:** independent work. On 10 September it said Buckmaster's Codex
  prompts could not have influenced its system. Sébastien Bubeck denied using their
  prompts or proofs. **S** (Scientific American, 8 September; Wikipedia controversy
  article)
- **Summary:** Wikipedia, *Navier–Stokes priority controversy*. **S**
  https://en.wikipedia.org/wiki/Navier%E2%80%93Stokes_priority_controversy
- **Washington Post coverage, 2026-09-09:** named in spec §8 but not read here.

## Background used on the page (general reference, **S**)

- Navier and Stokes wrote the equations in the 1800s, and engineers use them to
  design planes and predict weather.
- Clay offered the seven Millennium Prizes in 2000, $1 million each.
- Only the Poincaré conjecture has been accepted as settled.

## What the page must say (CLAUDE.md Reporting Accuracy)

- It is the **forced** version: alternatives (C) and (D), with a force allowed.
- It is an **Unverified claim**, and priority is **disputed**.
- Clay considers a solution only **two years after publication**, and only after
  general acceptance.
- Never say "solved", "proved" or "proven" about the claim.

## Open questions we couldn't settle

- OpenAI's announcement text (blocked to automated fetching).
- Whether any outside expert has publicly vouched for the full written proof.
