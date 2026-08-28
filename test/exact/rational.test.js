import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rational, parseRational, add, sub, mul, cmp, isNegative, toString, ZERO,
} from '../../src/exact/rational.js';

test('rational normalizes sign and common factors', () => {
  assert.deepEqual(rational(6n, 4n), { n: 3n, d: 2n });
  assert.deepEqual(rational(-6n, 4n), { n: -3n, d: 2n });
  assert.deepEqual(rational(6n, -4n), { n: -3n, d: 2n });
  assert.deepEqual(rational(0n, 5n), { n: 0n, d: 1n });
  assert.deepEqual(rational(5n), { n: 5n, d: 1n });
});

test('rational rejects a zero denominator', () => {
  assert.throws(() => rational(1n, 0n), RangeError);
});

test('parseRational accepts integers and fractions', () => {
  assert.deepEqual(parseRational('3', 'x'), { n: 3n, d: 1n });
  assert.deepEqual(parseRational('-3', 'x'), { n: -3n, d: 1n });
  assert.deepEqual(parseRational('3/4', 'x'), { n: 3n, d: 4n });
  assert.deepEqual(parseRational('-6/4', 'x'), { n: -3n, d: 2n });
});

test('parseRational rejects JSON numbers and malformed strings', () => {
  assert.throws(() => parseRational(3, 'x'), TypeError);
  for (const bad of ['', '3/', '/4', '3/0', '1.5', '3 / 4', '03', 'abc', '3/4/5']) {
    assert.throws(() => parseRational(bad, 'data.flow'), RangeError, `should reject ${JSON.stringify(bad)}`);
  }
});

test('parseRational names the offending field', () => {
  assert.throws(() => parseRational('1.5', 'arcs[2].cost'), /arcs\[2\]\.cost/);
});

test('arithmetic is exact', () => {
  const third = parseRational('1/3', 'x');
  const sixth = parseRational('1/6', 'x');
  assert.deepEqual(add(third, sixth), { n: 1n, d: 2n });
  assert.deepEqual(sub(third, sixth), { n: 1n, d: 6n });
  assert.deepEqual(mul(third, sixth), { n: 1n, d: 18n });
  // The float trap: 0.1 + 0.2 !== 0.3 in IEEE754, but must be exact here.
  assert.equal(cmp(add(parseRational('1/10', 'x'), parseRational('2/10', 'x')), parseRational('3/10', 'x')), 0);
});

test('adding thirds three times is exactly one', () => {
  const third = parseRational('1/3', 'x');
  assert.equal(cmp(add(add(third, third), third), parseRational('1', 'x')), 0);
});

test('cmp orders correctly across denominators and signs', () => {
  assert.equal(cmp(parseRational('1/3', 'x'), parseRational('1/2', 'x')), -1);
  assert.equal(cmp(parseRational('1/2', 'x'), parseRational('1/3', 'x')), 1);
  assert.equal(cmp(parseRational('2/4', 'x'), parseRational('1/2', 'x')), 0);
  assert.equal(cmp(parseRational('-1/2', 'x'), parseRational('1/3', 'x')), -1);
});

test('isNegative and ZERO', () => {
  assert.equal(isNegative(parseRational('-1/1000000', 'x')), true);
  assert.equal(isNegative(ZERO), false);
  assert.equal(cmp(ZERO, parseRational('0', 'x')), 0);
});

test('toString round-trips through parseRational', () => {
  for (const v of ['3', '-3', '3/4', '-3/2']) {
    assert.equal(toString(parseRational(v, 'x')), v);
  }
});
