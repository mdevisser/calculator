// Sparse multivariate polynomials over exact rationals. Coefficients are
// Rational; exponents are ordinary non-negative integers. The Jacobian
// determinant of a degree-7 map reaches degree 18 before terms cancel, and the
// whole result depends on that cancellation landing exactly on a constant --
// a float would decide the verdict by rounding.

import { parseRational, add, mul, rational, ZERO } from './rational.js';

const key = (exponents) => exponents.join(',');
const unkey = (k) => k.split(',').map(Number);

function make(arity) {
  return { arity, terms: new Map() };
}

function accumulate(poly, exponents, coeff) {
  const k = key(exponents);
  const existing = poly.terms.get(k);
  const total = existing === undefined ? coeff : add(existing, coeff);
  if (total.n === 0n) {
    poly.terms.delete(k);
  } else {
    poly.terms.set(k, total);
  }
}

export function polynomial(terms, arity) {
  const poly = make(arity);
  for (const { coeff, exponents } of terms) {
    if (exponents.length !== arity) {
      throw new RangeError(`polynomial: expected ${arity} exponents, got ${exponents.length}`);
    }
    accumulate(poly, exponents, coeff);
  }
  return poly;
}

export function parsePolynomial(termList, arity, field) {
  if (!Array.isArray(termList)) {
    throw new TypeError(`${field}: expected an array of terms, got ${typeof termList}`);
  }
  const terms = termList.map((entry, i) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new TypeError(`${field}[${i}]: expected an object with coeff and exponents`);
    }
    if (!Array.isArray(entry.exponents) || entry.exponents.length !== arity) {
      throw new RangeError(`${field}[${i}].exponents: expected an array of ${arity} integers`);
    }
    for (const e of entry.exponents) {
      if (!Number.isInteger(e) || e < 0) {
        throw new RangeError(`${field}[${i}].exponents: expected non-negative integers, got ${JSON.stringify(entry.exponents)}`);
      }
    }
    return { coeff: parseRational(entry.coeff, `${field}[${i}].coeff`), exponents: entry.exponents };
  });
  return polynomial(terms, arity);
}

export function addP(a, b) {
  const out = make(a.arity);
  for (const [k, c] of a.terms) accumulate(out, unkey(k), c);
  for (const [k, c] of b.terms) accumulate(out, unkey(k), c);
  return out;
}

export function subP(a, b) {
  const out = make(a.arity);
  for (const [k, c] of a.terms) accumulate(out, unkey(k), c);
  for (const [k, c] of b.terms) accumulate(out, unkey(k), rational(-c.n, c.d));
  return out;
}

export function mulP(a, b) {
  const out = make(a.arity);
  for (const [ka, ca] of a.terms) {
    const ea = unkey(ka);
    for (const [kb, cb] of b.terms) {
      const eb = unkey(kb);
      accumulate(out, ea.map((e, i) => e + eb[i]), mul(ca, cb));
    }
  }
  return out;
}

export function differentiate(poly, varIndex) {
  const out = make(poly.arity);
  for (const [k, c] of poly.terms) {
    const e = unkey(k);
    const power = e[varIndex];
    if (power === 0) continue;
    const next = [...e];
    next[varIndex] = power - 1;
    accumulate(out, next, mul(c, rational(BigInt(power))));
  }
  return out;
}

export function evaluate(poly, point) {
  let total = ZERO;
  for (const [k, c] of poly.terms) {
    let value = c;
    unkey(k).forEach((e, i) => {
      for (let n = 0; n < e; n += 1) value = mul(value, point[i]);
    });
    total = add(total, value);
  }
  return total;
}

export function isZero(poly) {
  return poly.terms.size === 0;
}

export function termCount(poly) {
  return poly.terms.size;
}

export function isConstant(poly) {
  if (poly.terms.size === 0) return true;
  if (poly.terms.size > 1) return false;
  return unkey([...poly.terms.keys()][0]).every((e) => e === 0);
}

export function constantValue(poly) {
  if (!isConstant(poly)) {
    throw new Error('constantValue: polynomial is not constant');
  }
  if (poly.terms.size === 0) return ZERO;
  return [...poly.terms.values()][0];
}

export function totalDegree(poly) {
  let best = 0;
  for (const k of poly.terms.keys()) {
    const sum = unkey(k).reduce((a, b) => a + b, 0);
    if (sum > best) best = sum;
  }
  return best;
}
