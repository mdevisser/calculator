import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePolynomial,
  derivative,
  evaluate,
  isConstant,
  constantTerm,
  degree,
  termCount,
  MAX_EXPONENT,
} from '../../../src/problems/jacobian/polynomial.js';
import { parseRational, toString } from '../../../src/exact/rational.js';
import { FixtureError } from '../../../src/harness/schema.js';

const V = ['x', 'y', 'z'];
const A = '(1 + x*y)^3*z + y^2*(1 + x*y)*(4 + 3*x*y)';
const terms = (p) => Object.fromEntries([...p].map(([k, r]) => [k, toString(r)]));
const point = (...s) => s.map((v, i) => parseRational(v, `p${i}`));

test('parses a sum of monomials into exact sparse terms', () => {
  assert.deepEqual(terms(parsePolynomial('2*x - 3*x^2*y - x^3*z', V)), {
    '1,0,0': '2',
    '2,1,0': '-3',
    '3,0,1': '-1',
  });
});

test('expands powers of sums exactly', () => {
  assert.deepEqual(terms(parsePolynomial('(1 + x*y)^3', V)), {
    '0,0,0': '1',
    '1,1,0': '3',
    '2,2,0': '3',
    '3,3,0': '1',
  });
});

test('cancellation leaves the zero polynomial, with no zero terms stored', () => {
  const p = parsePolynomial('x - x', V);
  assert.equal(termCount(p), 0);
  assert.equal(isConstant(p), true);
  assert.equal(toString(constantTerm(p)), '0');
  assert.equal(degree(p), -1);
});

test('formal partial derivatives', () => {
  assert.deepEqual(terms(derivative(parsePolynomial('x^3*z', V), 0)), { '2,0,1': '3' });
  assert.equal(termCount(derivative(parsePolynomial('x^3*z', V), 1)), 0);
});

test('evaluates exactly at a rational point', () => {
  assert.equal(toString(evaluate(parsePolynomial(A, V), point('1', '-3/2', '13/2'))), '-1/4');
});

test('total degree of the first component is 7', () => {
  assert.equal(degree(parsePolynomial(A, V)), 7);
  assert.equal(isConstant(parsePolynomial('-2', V)), true);
  assert.equal(toString(constantTerm(parsePolynomial('-2', V))), '-2');
});

test('unary minus and whitespace', () => {
  assert.deepEqual(terms(parsePolynomial(' -(x + -y) ', V)), { '1,0,0': '-1', '0,1,0': '1' });
});

test(`exponent cap is ${MAX_EXPONENT}`, () => {
  assert.equal(MAX_EXPONENT, 20);
  assert.equal(degree(parsePolynomial('x^20', V)), 20);
});

for (const bad of ['2x', 'x^-1', 'x^21', 'w', 'x^1.5', '(x + y', 'x +', '', 'x**2', 'x/2', '1.5*x']) {
  test(`malformed polynomial text ${JSON.stringify(bad)} is a FixtureError, not math`, () => {
    assert.throws(
      () => parsePolynomial(bad, V),
      (err) => err instanceof FixtureError && err.code === 'malformed',
    );
  });
}
