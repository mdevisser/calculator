export const VERDICT = Object.freeze({
  CONFIRMED: 'CONFIRMED',
  REFUTED: 'REFUTED',
  INDETERMINATE: 'INDETERMINATE',
  ERROR: 'ERROR',
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
