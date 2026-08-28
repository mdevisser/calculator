// Fixture integers arrive as decimal strings. JSON numbers are IEEE doubles and
// lose precision above 2^53, and every verdict here turns on exact equality.

const POSITIVE_DECIMAL = /^[1-9][0-9]*$/;

export function toBigIntStrict(value, field) {
  if (typeof value !== 'string') {
    throw new TypeError(`${field}: expected a decimal string, got ${typeof value}`);
  }
  if (!POSITIVE_DECIMAL.test(value)) {
    throw new RangeError(
      `${field}: expected a positive integer with no leading zeros, got ${JSON.stringify(value)}`,
    );
  }
  return BigInt(value);
}

export function ipow(base, exponent) {
  if (typeof base !== 'bigint' || typeof exponent !== 'bigint') {
    throw new TypeError('ipow: base and exponent must both be BigInt');
  }
  if (exponent < 0n) {
    throw new RangeError('ipow: negative exponents do not yield integers');
  }
  return base ** exponent;
}
