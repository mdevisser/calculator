globalThis.RESULTS = {
  "tally": {
    "CONFIRMED": 4,
    "REFUTED": 9,
    "INDETERMINATE": 1,
    "ERROR": 0
  },
  "unexpected": 0,
  "results": [
    {
      "fixture": "dgg/juang-family-7-2-1",
      "problem": "dgg",
      "candidate": "juang-family-7-2-1",
      "claim": "instance b=7, m=2, g=1 of a three-parameter family from a follow-up post to Rybin's announcement: fractional cost 125, every congestion-good unsplittable routing costs at least 126",
      "expect": "CONFIRMED",
      "source": {
        "url": "https://x.com/basedjensen/status/2080020575968543230",
        "author": "Hensen Juang (@basedjensen), follow-up post to Rybin's announcement",
        "date": "2026-08-28",
        "peerReviewed": false,
        "note": "Unrefereed social-media post, and a different artifact from Rybin's original announcement: it gives a three-parameter (b, m, g) family, of which this fixture is the b=7, m=2, g=1 member. The arcs, costs and demands below are this repository's transcription of that post, not a verified primary source. Confirmed locally by exhaustive enumeration of all 8 unsplittable routings, of which 4 are congestion-good."
      },
      "checks": [
        {
          "name": "flow is conserved at every internal node",
          "pass": true,
          "expected": "net zero at all internal nodes",
          "actual": "net zero at all internal nodes"
        },
        {
          "name": "source emits exactly the total demand",
          "pass": true,
          "expected": "-25",
          "actual": "-25"
        },
        {
          "name": "every terminal receives exactly its demand",
          "pass": true,
          "expected": "all terminals satisfied",
          "actual": "all terminals satisfied"
        },
        {
          "name": "every congestion-good routing costs more than the fractional flow",
          "pass": true,
          "expected": "> 125",
          "actual": "126"
        }
      ],
      "requiresSearch": true,
      "exhaustive": true,
      "searched": 8,
      "searchState": "complete",
      "verdict": "CONFIRMED",
      "conjecture": "Goemans' cost conjecture on single-source unsplittable flow. The Dinitz-Garg-Goemans theorem (1999) is proven and not in question: given a feasible fractional flow x, an unsplittable routing always exists with y_a <= x_a + D on every arc, where D is the largest single demand. Goemans conjectured that such a routing can also be no more expensive than x. Only that cost strengthening is refuted.",
      "asExpected": true
    },
    {
      "fixture": "dgg/negative-broken-flow",
      "problem": "dgg",
      "candidate": "negative-broken-flow",
      "claim": "control: the declared fractional flow does not conserve at an internal node",
      "expect": "REFUTED",
      "source": {
        "url": "https://link.springer.com/article/10.1007/s004930050043",
        "author": "negative control, constructed for this repository",
        "date": "2026-08-28",
        "peerReviewed": false
      },
      "checks": [
        {
          "name": "flow is conserved at every internal node",
          "pass": false,
          "expected": "net zero at all internal nodes",
          "actual": "u (net 1)"
        },
        {
          "name": "source emits exactly the total demand",
          "pass": true,
          "expected": "-3",
          "actual": "-3"
        },
        {
          "name": "every terminal receives exactly its demand",
          "pass": false,
          "expected": "all terminals satisfied",
          "actual": "t1 (got 2, needs 3)"
        }
      ],
      "requiresSearch": true,
      "exhaustive": false,
      "searched": null,
      "searchState": "not-reached",
      "verdict": "REFUTED",
      "conjecture": "Goemans' cost conjecture on single-source unsplittable flow. The Dinitz-Garg-Goemans theorem (1999) is proven and not in question: given a feasible fractional flow x, an unsplittable routing always exists with y_a <= x_a + D on every arc, where D is the largest single demand. Goemans conjectured that such a routing can also be no more expensive than x. Only that cost strengthening is refuted.",
      "asExpected": true
    },
    {
      "fixture": "dgg/rybin-2026",
      "problem": "dgg",
      "candidate": "rybin-2026",
      "claim": "reported by secondary coverage, not by a primary source held here: fractional cost 58, every congestion-good unsplittable routing costs at least 60. The network itself is not published there, so there is nothing to verify.",
      "expect": "INDETERMINATE",
      "source": {
        "url": "https://vibemathed.com/problem/dinitz-garg-goemans-unsplittable-flow",
        "author": "secondary coverage of Dmitry Rybin with GPT-5.6 Pro; the original announcement post is not held",
        "date": "2026-07-22",
        "peerReviewed": false
      },
      "checks": [],
      "requiresSearch": null,
      "exhaustive": null,
      "searched": null,
      "searchState": null,
      "verdict": "INDETERMINATE",
      "reason": "missing-source-data",
      "asExpected": true
    },
    {
      "fixture": "dgg/synthetic-conjecture-holds",
      "problem": "dgg",
      "candidate": "synthetic-conjecture-holds",
      "claim": "control: a valid instance on which Goemans' cost conjecture holds, so no counterexample is present",
      "expect": "REFUTED",
      "source": {
        "url": "https://link.springer.com/article/10.1007/s004930050043",
        "author": "synthetic control, constructed for this repository",
        "date": "2026-08-28",
        "peerReviewed": false
      },
      "checks": [
        {
          "name": "flow is conserved at every internal node",
          "pass": true,
          "expected": "net zero at all internal nodes",
          "actual": "net zero at all internal nodes"
        },
        {
          "name": "source emits exactly the total demand",
          "pass": true,
          "expected": "-5",
          "actual": "-5"
        },
        {
          "name": "every terminal receives exactly its demand",
          "pass": true,
          "expected": "all terminals satisfied",
          "actual": "all terminals satisfied"
        },
        {
          "name": "every congestion-good routing costs more than the fractional flow",
          "pass": false,
          "expected": "> 10",
          "actual": "10"
        }
      ],
      "requiresSearch": true,
      "exhaustive": true,
      "searched": 1,
      "searchState": "complete",
      "verdict": "REFUTED",
      "conjecture": "Goemans' cost conjecture on single-source unsplittable flow. The Dinitz-Garg-Goemans theorem (1999) is proven and not in question: given a feasible fractional flow x, an unsplittable routing always exists with y_a <= x_a + D on every arc, where D is the largest single demand. Goemans conjectured that such a routing can also be no more expensive than x. Only that cost strengthening is refuted.",
      "asExpected": true
    },
    {
      "fixture": "euler/elkies-1988",
      "problem": "euler",
      "candidate": "elkies-1988",
      "claim": "2682440^4 + 15365639^4 + 18796760^4 = 20615673^4, three fourth powers summing to a fourth power",
      "expect": "CONFIRMED",
      "source": {
        "url": "https://www.ams.org/journals/mcom/1988-51-184/S0025-5718-1988-0930224-9/",
        "author": "Noam D. Elkies",
        "date": "1988-10-01",
        "peerReviewed": true
      },
      "checks": [
        {
          "name": "exponent is at least 3",
          "pass": true,
          "expected": "k >= 3",
          "actual": "k = 4"
        },
        {
          "name": "all terms are positive integers",
          "pass": true,
          "expected": "every term >= 1",
          "actual": "all positive"
        },
        {
          "name": "uses fewer than k terms",
          "pass": true,
          "expected": "at most 3 terms",
          "actual": "3 terms"
        },
        {
          "name": "sum of k-th powers equals the k-th power",
          "pass": true,
          "expected": "180630077292169281088848499041",
          "actual": "180630077292169281088848499041"
        }
      ],
      "requiresSearch": false,
      "exhaustive": null,
      "searched": null,
      "searchState": "not-required",
      "verdict": "CONFIRMED",
      "conjecture": "Euler's sum of powers conjecture (1769): for k > 2, no k-th power is the sum of fewer than k positive k-th powers. Disproved for k = 5 by Lander and Parkin (1966) and for k = 4 by Elkies (1988).",
      "asExpected": true
    },
    {
      "fixture": "euler/lander-parkin-1966",
      "problem": "euler",
      "candidate": "lander-parkin-1966",
      "claim": "27^5 + 84^5 + 110^5 + 133^5 = 144^5, four fifth powers summing to a fifth power",
      "expect": "CONFIRMED",
      "source": {
        "url": "https://www.ams.org/journals/bull/1966-72-06/S0002-9904-1966-11654-3/",
        "author": "L. J. Lander and T. R. Parkin",
        "date": "1966-10-01",
        "peerReviewed": true
      },
      "checks": [
        {
          "name": "exponent is at least 3",
          "pass": true,
          "expected": "k >= 3",
          "actual": "k = 5"
        },
        {
          "name": "all terms are positive integers",
          "pass": true,
          "expected": "every term >= 1",
          "actual": "all positive"
        },
        {
          "name": "uses fewer than k terms",
          "pass": true,
          "expected": "at most 4 terms",
          "actual": "4 terms"
        },
        {
          "name": "sum of k-th powers equals the k-th power",
          "pass": true,
          "expected": "61917364224",
          "actual": "61917364224"
        }
      ],
      "requiresSearch": false,
      "exhaustive": null,
      "searched": null,
      "searchState": "not-required",
      "verdict": "CONFIRMED",
      "conjecture": "Euler's sum of powers conjecture (1769): for k > 2, no k-th power is the sum of fewer than k positive k-th powers. Disproved for k = 5 by Lander and Parkin (1966) and for k = 4 by Elkies (1988).",
      "asExpected": true
    },
    {
      "fixture": "euler/negative-perturbed-term",
      "problem": "euler",
      "candidate": "negative-perturbed-term",
      "claim": "control: Lander-Parkin with one term perturbed, so the identity is false",
      "expect": "REFUTED",
      "source": {
        "url": "https://www.ams.org/journals/bull/1966-72-06/S0002-9904-1966-11654-3/",
        "author": "negative control, derived from Lander and Parkin 1966",
        "date": "2026-08-28",
        "peerReviewed": false
      },
      "checks": [
        {
          "name": "exponent is at least 3",
          "pass": true,
          "expected": "k >= 3",
          "actual": "k = 5"
        },
        {
          "name": "all terms are positive integers",
          "pass": true,
          "expected": "every term >= 1",
          "actual": "all positive"
        },
        {
          "name": "uses fewer than k terms",
          "pass": true,
          "expected": "at most 4 terms",
          "actual": "4 terms"
        },
        {
          "name": "sum of k-th powers equals the k-th power",
          "pass": false,
          "expected": "61917364224",
          "actual": "61920225685"
        }
      ],
      "requiresSearch": false,
      "exhaustive": null,
      "searched": null,
      "searchState": "not-required",
      "verdict": "REFUTED",
      "conjecture": "Euler's sum of powers conjecture (1769): for k > 2, no k-th power is the sum of fewer than k positive k-th powers. Disproved for k = 5 by Lander and Parkin (1966) and for k = 4 by Elkies (1988).",
      "asExpected": true
    },
    {
      "fixture": "euler/negative-true-but-not-a-counterexample",
      "problem": "euler",
      "candidate": "negative-true-but-not-a-counterexample",
      "claim": "control: 3^3 + 4^3 + 5^3 = 6^3 is true but uses k terms, not fewer than k",
      "expect": "REFUTED",
      "source": {
        "url": "https://en.wikipedia.org/wiki/Euler%27s_sum_of_powers_conjecture",
        "author": "negative control, classical identity",
        "date": "2026-08-28",
        "peerReviewed": false
      },
      "checks": [
        {
          "name": "exponent is at least 3",
          "pass": true,
          "expected": "k >= 3",
          "actual": "k = 3"
        },
        {
          "name": "all terms are positive integers",
          "pass": true,
          "expected": "every term >= 1",
          "actual": "all positive"
        },
        {
          "name": "uses fewer than k terms",
          "pass": false,
          "expected": "at most 2 terms",
          "actual": "3 terms"
        },
        {
          "name": "sum of k-th powers equals the k-th power",
          "pass": true,
          "expected": "216",
          "actual": "216"
        }
      ],
      "requiresSearch": false,
      "exhaustive": null,
      "searched": null,
      "searchState": "not-required",
      "verdict": "REFUTED",
      "conjecture": "Euler's sum of powers conjecture (1769): for k > 2, no k-th power is the sum of fewer than k positive k-th powers. Disproved for k = 5 by Lander and Parkin (1966) and for k = 4 by Elkies (1988).",
      "asExpected": true
    },
    {
      "fixture": "jacobian/alpoge-2026",
      "problem": "jacobian",
      "candidate": "alpoge-2026",
      "claim": "a polynomial map of 3-dimensional space with Jacobian determinant identically -2 that sends three different points to one point, refuting the Jacobian conjecture in dimension 3 and every dimension above it; the two-dimensional case is still open",
      "expect": "CONFIRMED",
      "source": {
        "url": "https://x.com/__alpoge__/status/2079028340955197566",
        "author": "Levent Alpöge, crediting Akhil Mathew and Claude Fable 5",
        "date": "2026-07-20",
        "peerReviewed": false,
        "note": "Map and points transcribed verbatim from the Isabelle AFP entry by Freitas Ramos, Hulak and de Queiroz (lemmas eval_alpoge_map and collision_point_*), which encodes Alpöge's announced map, and cross-checked term for term against the Lean files of deancureton/jacobian and DrAlexHarrison/jacobian-anatomy (docs/sources/jacobian.md). The X post itself was not read here: automated fetching was blocked."
      },
      "checks": [
        {
          "name": "the Jacobian determinant is a constant",
          "pass": true,
          "expected": "a constant polynomial",
          "actual": "-2"
        },
        {
          "name": "the constant is not zero",
          "pass": true,
          "expected": "nonzero",
          "actual": "-2"
        },
        {
          "name": "the points are all different",
          "pass": true,
          "expected": "3 different points",
          "actual": "3 different points"
        },
        {
          "name": "every point has the same image",
          "pass": true,
          "expected": "(-1/4, 0, 0)",
          "actual": "all 3 points map to (-1/4, 0, 0)"
        }
      ],
      "requiresSearch": false,
      "exhaustive": null,
      "searched": null,
      "searchState": "not-required",
      "verdict": "CONFIRMED",
      "conjecture": "The Jacobian conjecture (Keller, 1939): a polynomial map from n-dimensional space to itself whose Jacobian determinant is a nonzero constant has a polynomial inverse. A dimension 3 counterexample, announced in July 2026, refutes it in every dimension 3 and up. The two-dimensional case is still open.",
      "asExpected": true
    },
    {
      "fixture": "jacobian/negative-changed-coefficient",
      "problem": "jacobian",
      "candidate": "negative-changed-coefficient",
      "claim": "control: Alpöge's map with one coefficient changed (4 + 3*x*y becomes 5 + 3*x*y in the first component), which breaks the exact cancellation",
      "expect": "REFUTED",
      "source": {
        "url": "https://x.com/__alpoge__/status/2079028340955197566",
        "author": "negative control, derived from Alpöge 2026",
        "date": "2026-11-06",
        "peerReviewed": false
      },
      "checks": [
        {
          "name": "the Jacobian determinant is a constant",
          "pass": false,
          "expected": "a constant polynomial",
          "actual": "not constant: degree 11, 10 terms"
        },
        {
          "name": "the constant is not zero",
          "pass": false,
          "expected": "nonzero",
          "actual": "no single value: the determinant is not constant"
        },
        {
          "name": "the points are all different",
          "pass": true,
          "expected": "3 different points",
          "actual": "3 different points"
        },
        {
          "name": "every point has the same image",
          "pass": false,
          "expected": "(-1/4, 0, 0)",
          "actual": "point 2 maps to (-11/8, 0, 0)"
        }
      ],
      "requiresSearch": false,
      "exhaustive": null,
      "searched": null,
      "searchState": "not-required",
      "verdict": "REFUTED",
      "conjecture": "The Jacobian conjecture (Keller, 1939): a polynomial map from n-dimensional space to itself whose Jacobian determinant is a nonzero constant has a polynomial inverse. A dimension 3 counterexample, announced in July 2026, refutes it in every dimension 3 and up. The two-dimensional case is still open.",
      "asExpected": true
    },
    {
      "fixture": "jacobian/negative-perturbed-point",
      "problem": "jacobian",
      "candidate": "negative-perturbed-point",
      "claim": "control: Alpöge's map with the third point moved (z = 13/2 becomes 7), so the images no longer agree",
      "expect": "REFUTED",
      "source": {
        "url": "https://x.com/__alpoge__/status/2079028340955197566",
        "author": "negative control, derived from Alpöge 2026",
        "date": "2026-11-06",
        "peerReviewed": false
      },
      "checks": [
        {
          "name": "the Jacobian determinant is a constant",
          "pass": true,
          "expected": "a constant polynomial",
          "actual": "-2"
        },
        {
          "name": "the constant is not zero",
          "pass": true,
          "expected": "nonzero",
          "actual": "-2"
        },
        {
          "name": "the points are all different",
          "pass": true,
          "expected": "3 different points",
          "actual": "3 different points"
        },
        {
          "name": "every point has the same image",
          "pass": false,
          "expected": "(-1/4, 0, 0)",
          "actual": "point 3 maps to (-5/16, -3/8, 1/2)"
        }
      ],
      "requiresSearch": false,
      "exhaustive": null,
      "searched": null,
      "searchState": "not-required",
      "verdict": "REFUTED",
      "conjecture": "The Jacobian conjecture (Keller, 1939): a polynomial map from n-dimensional space to itself whose Jacobian determinant is a nonzero constant has a polynomial inverse. A dimension 3 counterexample, announced in July 2026, refutes it in every dimension 3 and up. The two-dimensional case is still open.",
      "asExpected": true
    },
    {
      "fixture": "jacobian/negative-repeated-point",
      "problem": "jacobian",
      "candidate": "negative-repeated-point",
      "claim": "control: Alpöge's map with the same point listed twice, which is not a collision",
      "expect": "REFUTED",
      "source": {
        "url": "https://x.com/__alpoge__/status/2079028340955197566",
        "author": "negative control, derived from Alpöge 2026",
        "date": "2026-11-06",
        "peerReviewed": false
      },
      "checks": [
        {
          "name": "the Jacobian determinant is a constant",
          "pass": true,
          "expected": "a constant polynomial",
          "actual": "-2"
        },
        {
          "name": "the constant is not zero",
          "pass": true,
          "expected": "nonzero",
          "actual": "-2"
        },
        {
          "name": "the points are all different",
          "pass": false,
          "expected": "2 different points",
          "actual": "point 2 repeats point 1: (0, 0, -1/4)"
        },
        {
          "name": "every point has the same image",
          "pass": true,
          "expected": "(-1/4, 0, 0)",
          "actual": "all 2 points map to (-1/4, 0, 0)"
        }
      ],
      "requiresSearch": false,
      "exhaustive": null,
      "searched": null,
      "searchState": "not-required",
      "verdict": "REFUTED",
      "conjecture": "The Jacobian conjecture (Keller, 1939): a polynomial map from n-dimensional space to itself whose Jacobian determinant is a nonzero constant has a polynomial inverse. A dimension 3 counterexample, announced in July 2026, refutes it in every dimension 3 and up. The two-dimensional case is still open.",
      "asExpected": true
    },
    {
      "fixture": "jacobian/negative-zero-determinant",
      "problem": "jacobian",
      "candidate": "negative-zero-determinant",
      "claim": "control: (x + y, x + y, z) sends (1,0,0) and (0,1,0) to the same point, but its Jacobian determinant is the constant 0",
      "expect": "REFUTED",
      "source": {
        "url": "https://isa-afp.org/entries/Jacobian_Counterexample.html",
        "author": "synthetic control, constructed for this repository",
        "date": "2026-11-06",
        "peerReviewed": false
      },
      "checks": [
        {
          "name": "the Jacobian determinant is a constant",
          "pass": true,
          "expected": "a constant polynomial",
          "actual": "0"
        },
        {
          "name": "the constant is not zero",
          "pass": false,
          "expected": "nonzero",
          "actual": "0"
        },
        {
          "name": "the points are all different",
          "pass": true,
          "expected": "2 different points",
          "actual": "2 different points"
        },
        {
          "name": "every point has the same image",
          "pass": true,
          "expected": "(1, 1, 0)",
          "actual": "all 2 points map to (1, 1, 0)"
        }
      ],
      "requiresSearch": false,
      "exhaustive": null,
      "searched": null,
      "searchState": "not-required",
      "verdict": "REFUTED",
      "conjecture": "The Jacobian conjecture (Keller, 1939): a polynomial map from n-dimensional space to itself whose Jacobian determinant is a nonzero constant has a polynomial inverse. A dimension 3 counterexample, announced in July 2026, refutes it in every dimension 3 and up. The two-dimensional case is still open.",
      "asExpected": true
    },
    {
      "fixture": "jacobian/synthetic-fold",
      "problem": "jacobian",
      "candidate": "synthetic-fold",
      "claim": "control: the fold (x^2, y, z) sends (1,0,0) and (-1,0,0) to the same point, but its Jacobian determinant 2x is not constant, so it is not a counterexample",
      "expect": "REFUTED",
      "source": {
        "url": "https://isa-afp.org/entries/Jacobian_Counterexample.html",
        "author": "synthetic control, constructed for this repository",
        "date": "2026-11-06",
        "peerReviewed": false
      },
      "checks": [
        {
          "name": "the Jacobian determinant is a constant",
          "pass": false,
          "expected": "a constant polynomial",
          "actual": "not constant: degree 1, 1 term"
        },
        {
          "name": "the constant is not zero",
          "pass": false,
          "expected": "nonzero",
          "actual": "no single value: the determinant is not constant"
        },
        {
          "name": "the points are all different",
          "pass": true,
          "expected": "2 different points",
          "actual": "2 different points"
        },
        {
          "name": "every point has the same image",
          "pass": true,
          "expected": "(1, 0, 0)",
          "actual": "all 2 points map to (1, 0, 0)"
        }
      ],
      "requiresSearch": false,
      "exhaustive": null,
      "searched": null,
      "searchState": "not-required",
      "verdict": "REFUTED",
      "conjecture": "The Jacobian conjecture (Keller, 1939): a polynomial map from n-dimensional space to itself whose Jacobian determinant is a nonzero constant has a polynomial inverse. A dimension 3 counterexample, announced in July 2026, refutes it in every dimension 3 and up. The two-dimensional case is still open.",
      "asExpected": true
    }
  ]
};
