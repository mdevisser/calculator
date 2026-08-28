import test from 'node:test';
import assert from 'node:assert/strict';
import { toBigIntStrict, ipow } from '../../src/exact/integer.js';

test('toBigIntStrict parses a decimal string', () => {
  assert.equal(toBigIntStrict('27', 'data.k'), 27n);
});

test('toBigIntStrict rejects JSON numbers, which lose precision above 2^53', () => {
  assert.throws(() => toBigIntStrict(27, 'data.k'), TypeError);
});

test('toBigIntStrict rejects zero, negatives, leading zeros, and decimals', () => {
  for (const bad of ['0', '-5', '007', '1.5', '', ' 27', '1e5']) {
    assert.throws(() => toBigIntStrict(bad, 'data.k'), RangeError, `should reject ${JSON.stringify(bad)}`);
  }
});

test('toBigIntStrict names the offending field in the message', () => {
  assert.throws(() => toBigIntStrict('0', 'data.terms[2]'), /data\.terms\[2\]/);
});

test('ipow computes exact powers', () => {
  assert.equal(ipow(2n, 10n), 1024n);
  assert.equal(ipow(144n, 5n), 61917364224n);
});

test('ipow stays exact far beyond 2^53', () => {
  // Elkies 1988. As a float this rounds and the verification would pass
  // for the wrong reason.
  assert.equal(ipow(20615673n, 4n), 180630077292169281088848499041n);
});

test('ipow rejects negative exponents and non-BigInt arguments', () => {
  assert.throws(() => ipow(2n, -1n), RangeError);
  assert.throws(() => ipow(2, 10n), TypeError);
  assert.throws(() => ipow(2n, 10), TypeError);
});
