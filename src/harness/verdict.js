export const VERDICT = Object.freeze({
  CONFIRMED: 'CONFIRMED',
  REFUTED: 'REFUTED',
  INDETERMINATE: 'INDETERMINATE',
  ERROR: 'ERROR',
});

// The search state a module reports about itself. The page must never
// reconstruct this from booleans: "we never searched" and "we searched and ran
// out of budget" are different sentences, and inferring the second from the
// absence of the first is how a REFUTED row came to be labelled "capped at
// indeterminate". Modules state which one happened; nobody downstream guesses.
export const SEARCH_STATE = Object.freeze({
  NOT_REQUIRED: 'not-required', // the claim is settled without any search
  NOT_REACHED: 'not-reached', // settled before a search began
  COMPLETE: 'complete', // the whole space was enumerated
  CAPPED: 'capped', // the space was not, or could not be, fully enumerated
});

// I1 lives here and nowhere else: a claim whose confirmation requires
// exhausting a space is never CONFIRMED on an incomplete search. A module
// that forgets to set `exhaustive` gets INDETERMINATE, which is the safe
// direction to fail.
export function decide({ checks, requiresSearch = false, exhaustive = false }) {
  if (checks.some((check) => !check.pass)) {
    return VERDICT.REFUTED;
  }
  if (checks.length === 0) {
    return VERDICT.INDETERMINATE;
  }
  if (requiresSearch && !exhaustive) {
    return VERDICT.INDETERMINATE;
  }
  return VERDICT.CONFIRMED;
}
