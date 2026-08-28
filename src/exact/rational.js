// Exact rationals over BigInt. Fractional flows are not integral, and every
// congestion and cost comparison here must be exact — a float would decide a
// verdict by rounding.

const RATIONAL = /^(-?(?:0|[1-9][0-9]*))(?:\/([1-9][0-9]*))?$/;

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) {
    [x, y] = [y, x % y];
  }
  return x;
}

export function rational(n, d = 1n) {
  if (typeof n !== 'bigint' || typeof d !== 'bigint') {
    throw new TypeError('rational: numerator and denominator must be BigInt');
  }
  if (d === 0n) {
    throw new RangeError('rational: denominator must not be zero');
  }
  let num = n;
  let den = d;
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  if (num === 0n) {
    return { n: 0n, d: 1n };
  }
  const g = gcd(num, den);
  return { n: num / g, d: den / g };
}

export const ZERO = rational(0n);

export function parseRational(value, field) {
  if (typeof value !== 'string') {
    throw new TypeError(`${field}: expected a decimal string, got ${typeof value}`);
  }
  const match = RATIONAL.exec(value);
  if (!match) {
    throw new RangeError(
      `${field}: expected an integer or fraction like "3" or "-3/4", got ${JSON.stringify(value)}`,
    );
  }
  return rational(BigInt(match[1]), match[2] === undefined ? 1n : BigInt(match[2]));
}

export function add(a, b) {
  return rational(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function sub(a, b) {
  return rational(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function mul(a, b) {
  return rational(a.n * b.n, a.d * b.d);
}

export function cmp(a, b) {
  const left = a.n * b.d;
  const right = b.n * a.d;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function isNegative(a) {
  return a.n < 0n;
}

export function toString(a) {
  return a.d === 1n ? `${a.n}` : `${a.n}/${a.d}`;
}
