import { toBigIntStrict, ipow } from '../../exact/integer.js';
import { SEARCH_STATE, decide } from '../../harness/verdict.js';
import { FixtureError } from '../../harness/schema.js';

// Spec 5 lists "all terms positive integers" among the checks, so a term that is
// syntactically a decimal integer but zero or negative is the math saying no
// (REFUTED), not us saying no (ERROR). toBigIntStrict conflates the two, and its
// other callers (k, rhs) want exactly that, so terms parse through this local
// widening and positivity is left to a check.
const SIGNED_DECIMAL = /^-?(0|[1-9][0-9]*)$/;

function toTermBigInt(value, field) {
  if (typeof value !== 'string' || !SIGNED_DECIMAL.test(value)) {
    throw new FixtureError(
      `${field}: expected a decimal integer string, got ${JSON.stringify(value)}`,
      'malformed',
    );
  }
  return BigInt(value);
}

export const problem = 'euler';

export const conjecture =
  "Euler's sum of powers conjecture (1769): for k > 2, no k-th power is the sum of " +
  'fewer than k positive k-th powers. Disproved for k = 5 by Lander and Parkin (1966) ' +
  'and for k = 4 by Elkies (1988).';

export function verify(fixture) {
  const data = fixture && fixture.data;
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new FixtureError('data must be an object', 'malformed');
  }

  const { k: kRaw, terms: termsRaw, rhs: rhsRaw } = data;

  if (!Array.isArray(termsRaw) || termsRaw.length === 0) {
    throw new FixtureError('data.terms must be a non-empty array', 'malformed');
  }

  const terms = termsRaw.map((term, i) => toTermBigInt(term, `data.terms[${i}]`));

  let k, rhs;
  try {
    k = toBigIntStrict(kRaw, 'data.k');
    rhs = toBigIntStrict(rhsRaw, 'data.rhs');
  } catch (err) {
    if (err instanceof TypeError || err instanceof RangeError) {
      throw new FixtureError(err.message, 'malformed');
    }
    throw err;
  }

  const lhs = terms.reduce((total, term) => total + ipow(term, k), 0n);
  const target = ipow(rhs, k);

  const checks = [
    {
      name: 'exponent is at least 3',
      pass: k >= 3n,
      expected: 'k >= 3',
      actual: `k = ${k}`,
    },
    {
      name: 'all terms are positive integers',
      pass: terms.every((term) => term > 0n),
      expected: 'every term >= 1',
      actual: (() => {
        const bad = terms.filter((term) => term <= 0n);
        return bad.length === 0 ? 'all positive' : `nonpositive: ${bad.join(', ')}`;
      })(),
    },
    {
      name: 'uses fewer than k terms',
      pass: BigInt(terms.length) < k,
      expected: `at most ${k - 1n} terms`,
      actual: `${terms.length} terms`,
    },
    {
      name: 'sum of k-th powers equals the k-th power',
      pass: lhs === target,
      expected: target.toString(),
      actual: lhs.toString(),
    },
  ];

  return {
    checks,
    requiresSearch: false,
    exhaustive: null,
    searched: null,
    searchState: SEARCH_STATE.NOT_REQUIRED,
    verdict: decide({ checks, requiresSearch: false }),
  };
}
