// The one source of truth for lesson metadata (spec §5). The home path and every
// lesson header render from this, so the two cannot disagree. A plain script that
// assigns to globalThis: the page loads it by <script src> (file:// blocks modules
// and fetch), and Node tests import it for the same side effect.
//
// `confirmed` flips to true only after the label has been checked against primary
// sources. `checkedHere` names a fixture; the badge renders only while that
// fixture's committed verdict is CONFIRMED.

globalThis.TRUST_LABELS = {
  refereed: 'Refereed',
  'computer-checked': 'Computer-checked proof',
  'experts-say-correct': 'Experts say correct',
  unverified: 'Unverified claim',
};

const AI_DISCOVERIES = {
  title: 'List of mathematical discoveries by artificial intelligence (Wikipedia, secondary)',
  url: 'https://en.wikipedia.org/wiki/List_of_mathematical_discoveries_by_artificial_intelligence',
};

globalThis.LESSONS = [
  {
    slug: 'euler',
    title: "Euler's sum of powers",
    blurb: 'Four big numbers that broke a 200-year-old guess',
    position: 1,
    kind: 'counterexample',
    available: true,
    label: 'refereed',
    confirmed: true,
    checkedHere: 'euler/lander-parkin-1966',
    sources: [
      {
        title: 'L. J. Lander and T. R. Parkin, Bulletin of the AMS (1966)',
        url: 'https://www.ams.org/journals/bull/1966-72-06/S0002-9904-1966-11654-3/',
      },
      {
        title: 'Noam D. Elkies, Mathematics of Computation (1988)',
        url: 'https://www.ams.org/journals/mcom/1988-51-184/S0025-5718-1988-0930224-9/',
      },
    ],
  },
  {
    slug: 'jacobian',
    title: 'The Jacobian conjecture (dimension ≥ 3)',
    blurb: 'A formula AI found that breaks a conjecture',
    position: 2,
    kind: 'counterexample',
    available: false,
    label: 'experts-say-correct',
    confirmed: false,
    checkedHere: null,
    sources: [AI_DISCOVERIES],
  },
  {
    slug: 'sendov',
    title: "Sendov's conjecture",
    blurb: 'First real proof, computer-checked',
    position: 3,
    kind: 'proof',
    available: false,
    label: 'computer-checked',
    confirmed: false,
    checkedHere: null,
    sources: [AI_DISCOVERIES],
  },
  {
    slug: 'navier-stokes',
    title: 'Navier–Stokes (forced version)',
    blurb: 'A Millennium Prize claim, not yet verified',
    position: 4,
    kind: 'proof',
    available: false,
    label: 'unverified',
    confirmed: false,
    checkedHere: null,
    sources: [AI_DISCOVERIES],
  },
];
