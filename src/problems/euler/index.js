import { toBigIntStrict, ipow } from '../../exact/integer.js';
import { VERDICT, decide } from '../../harness/verdict.js';
import { FixtureError } from '../../harness/schema.js';

export const problem = 'euler';

export const conjecture =
  "Euler's sum of powers conjecture (1769): for k > 2, no k-th power is the sum of " +
  'fewer than k positive k-th powers. Disproved for k = 5 by Lander and Parkin (1966) ' +
  'and for k = 4 by Elkies (1988).';

export function verify(fixture) {
  const { k: kRaw, terms: termsRaw, rhs: rhsRaw } = fixture.data;

  if (!Array.isArray(termsRaw) || termsRaw.length === 0) {
    throw new FixtureError('data.terms must be a non-empty array', 'malformed');
  }

  const k = toBigIntStrict(kRaw, 'data.k');
  const terms = termsRaw.map((term, i) => toBigIntStrict(term, `data.terms[${i}]`));
  const rhs = toBigIntStrict(rhsRaw, 'data.rhs');

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
    verdict: decide({ checks, requiresSearch: false }),
  };
}
